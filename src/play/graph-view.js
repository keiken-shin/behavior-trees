/* The tree as a live graph. Layout comes from layout.js and shapes from svg.js,
   so it is the plate primitives made live: nodes take the interpreter's answer
   as a class, the edges the tick walked are drawn in the tick colour (and draw
   in, in walk order, when there is time to watch), a node that was Running
   and is not visited flashes once (the halt), so does a node the trace marks
   halted inside the tick (a Timeout giving up), and a click opens a card that
   reads from the trace and the built tree, nothing else (Tab and Enter open
   it too). Panning, zooming and fit are pan-zoom.js, shared with the wide
   plate. The tree never starts smaller than reading size: when the whole of
   it would put a label under about 9 px, the view starts on the root at that
   size, and every paint pans to the nodes that tick changed if they are out
   of view. */
import { layout } from "../bt/layout.js";
import { node, edge, esc } from "../data/svg.js";
import { walkOrder, haltedNow } from "../bt/run.js";
import { panZoom, TOOLS } from "./pan-zoom.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };
const OPTS = { nodeH: 34, hGap: 8, vGap: 44 };
const MIN_SCALE = 0.75;   // a 12 px label is never drawn under 9 px
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
let seq = 0;   // a fresh hatch pattern id per view, so two scenes on one page never share a DOM id

export function graphView(host) {
  const hatchId = `gv-hatch-${seq++}`;
  host.innerHTML =
    `<div class="gv">` +
      `<div class="gv__stage"></div>` + TOOLS +
      `<div class="gv__card" hidden></div>` +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const stage = q(".gv__stage"), card = q(".gv__card");
  let svg = null, byId = new Map(), edgeTo = new Map(), geo = new Map(), ac = null;
  let bt = null, lastEntry = null, lastReplay = false, picked = null;
  /* A press that did not move opens the card of the node under it, or
     closes the card when it lands off every node. */
  const vp = panZoom(stage, q(".gv__tools"), { minScale: MIN_SCALE, onTap: (t) => pick(t.closest?.("g[data-id]")?.dataset.id ?? null) });

  /* Pan to the nodes `ids`. When their box is wider than the view, the
     leaves in it are what a caption names (the check, the flight), so the
     box narrows to them; a box still wider than the view is centred anyway. */
  const span = (boxes) => ({
    x0: Math.min(...boxes.map((d) => d.x - d.w / 2)), x1: Math.max(...boxes.map((d) => d.x + d.w / 2)),
    y0: Math.min(...boxes.map((d) => d.y - d.h / 2)), y1: Math.max(...boxes.map((d) => d.y + d.h / 2)),
  });
  const follow = (ids, narrow = true) => {
    let boxes = ids.map((id) => geo.get(id)).filter(Boolean);
    if (!boxes.length) return;
    const leaves = boxes.filter((d) => d.kind === "Action" || d.kind === "Condition");
    if (narrow && leaves.length) { const b = span(boxes); if (b.x1 - b.x0 > vp.view.w) boxes = leaves; }
    vp.panTo(span(boxes));
  };

  function bind() {
    /* One controller per render, as in pan-zoom.js, for the node listeners. */
    ac?.abort();
    ac = new AbortController();
    const { signal } = ac;
    /* The keyboard's way to a node: Tab reaches it (and pans it into view),
       Enter or Space opens its card, as a click does. */
    svg.addEventListener("keydown", (ev) => {
      const id = ev.target.closest?.("g[data-id]")?.dataset.id;
      if (!id || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      pick(id);
    }, { signal });
    /* Keyboard focus only: a mouse press focuses the node too, and panning
       then would jump the tree under a drag that has already started. */
    svg.addEventListener("focusin", (ev) => {
      const g = ev.target.closest?.("g[data-id]");
      if (g && g.matches(":focus-visible")) follow([g.dataset.id], false);
    }, { signal });
  }

  function pick(id) {
    picked = id && byId.has(id) ? id : null;
    byId.forEach((g, k) => g.classList.toggle("picked", k === picked));
    showCard();
  }
  function showCard() {
    if (!picked || !bt) { card.hidden = true; return; }
    const n = bt.all.find((x) => x.id === picked);
    const e = lastEntry?.trace.find((x) => x.id === picked);
    /* Memory only means something on a composite actually running in memory
       or keep mode - a reactive Sequence restarts at child 1 every tick, so it
       gets no row. A replayed entry is a stored trace with no tree snapshot of
       its own, so it names the mode and nothing about where the live tree
       (today's tree, not that tick's) happens to sit. */
    const memory = n.mode === "memory" || n.mode === "keep"
      ? ["memory", lastReplay || n.st?.idx == null ? `{${n.mode}}` : `resume at child ${n.st.idx + 1}`]
      : null;
    const rows = [
      ["kind", n.kind + (n.mode ? ` {${n.mode}}` : "")],
      ["name", n.leaf ?? n.name ?? ""],
      n.args?.length ? ["args", n.args.join(" ")] : null,
      ["answer", e ? e.status : "not asked this tick"],
      e?.dirty ? ["dirty", "changed the world while answering"] : null,
      e?.halted ? ["halted", "in this tick, after it answered"] : null,
      e?.error ? ["error", e.error] : null,
      memory,
    ].filter(Boolean);
    card.innerHTML = `<button type="button" class="gv__close" aria-label="close">x</button>` +
      `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join("")}</dl>`;
    card.hidden = false;
    card.querySelector(".gv__close").onclick = () => pick(null);
  }

  return {
    render(spec, built) {
      bt = built; picked = null; lastEntry = null; lastReplay = false;
      const L = layout(spec, OPTS);
      stage.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" class="figure tree-live" role="group" aria-label="The tree, repainted every tick" style="--hatch-live:url(#${hatchId})">` +
        `<defs><pattern id="${hatchId}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
        L.edges.map((e) => edge(e.x1, e.y1, e.x2, e.y2).replace("<line", `<line data-to="${e.to}" style="--len:${Math.hypot(e.x2 - e.x1, e.y2 - e.y1)}"`)).join("") +
        L.nodes.map((d) => node(d.kind, d.x, d.y, d.label, { w: d.w, h: d.h }).replace("<g class=", `<g data-id="${d.id}" tabindex="0" role="button" aria-label="${esc(`${d.label}, ${d.kind}`)}" class=`)).join("") +
        `</svg>`;
      svg = stage.firstElementChild;
      geo = new Map(L.nodes.map((d) => [d.id, d]));
      const edges = span(L.nodes);
      vp.set(svg, { w: L.w, h: L.h, root: L.nodes[0].x, left: edges.x0, right: edges.x1, top: edges.y0, bottom: edges.y1 });
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
      edgeTo = new Map([...svg.querySelectorAll("line[data-to]")].map((l) => [l.dataset.to, l]));
      bind();
      card.hidden = true;
    },
    /* One history entry. `prev` is the entry before it, for the halt flash
       (haltedNow, in run.js); when omitted the view uses what it painted last. `replay` marks a
       repaint from stored history rather than a live tick - see showCard(). `animate` is the
       walk's draw-in (see below): off for a replay, and the caller turns it off for a fast run. */
    paint(entry, prev, replay = false, animate = !replay) {
      const before = prev ?? lastEntry ?? { trace: [] };
      const halted = haltedNow(before.trace, entry.trace);
      for (const [id, g] of byId) {
        g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err");
        g.classList.add("st-idle");
        g.querySelector("title.err-t")?.remove();
        /* The flash is left to finish rather than cleared by the next paint,
           which in a run comes a tenth of a second later; it plays once, so
           the class staying on after it ends changes nothing. */
        if (halted.includes(id) && !REDUCED.matches) { g.classList.remove("halt"); void g.getBoundingClientRect(); g.classList.add("halt"); }
      }
      for (const x of entry.trace) {
        const g = byId.get(x.id); if (!g) continue;
        g.classList.remove("st-idle"); g.classList.add(`st-${ST[x.status] ?? "idle"}`);
        if (x.dirty) g.classList.add("dirty");
        if (x.error) { g.classList.add("err"); g.insertAdjacentHTML("afterbegin", `<title class="err-t">${esc(x.error)}</title>`); }
      }
      /* Every edge the tick crossed stays drawn in the tick colour until the
         next paint, so a run shows its path live. The draw-in, edge by edge
         in walk order, only when there is time to watch it: restarted every
         tick of a run, it never finished and the path was never drawn. */
      edgeTo.forEach((l) => { l.classList.remove("walk", "pulse"); l.style.animationDelay = ""; });
      walkOrder(entry.trace).forEach((id, i) => {
        const l = edgeTo.get(id); if (!l) return;
        l.classList.add("walk");
        if (!animate || REDUCED.matches) return;
        l.style.animationDelay = `${i * 40}ms`;
        void l.getBoundingClientRect();          // restart the animation when the class is re-added
        l.classList.add("pulse");
      });
      /* What this tick changed is what a caption talks about, so the view pans
         to it when it is out of view: a node that answered something other
         than it did the entry before, and a node halted (inside the tick, or
         Running before and not asked now). A node that merely went unasked is
         not a change worth following - it would pull the view off the branch
         that is actually running. */
      const was = new Map(before.trace.map((x) => [x.id, x.status]));
      follow([...entry.trace.filter((x) => was.get(x.id) !== x.status).map((x) => x.id), ...halted]);
      lastEntry = entry; lastReplay = replay;
      showCard();
    },
    replay(history, i) {
      if (!history[i]) return;
      this.paint(history[i], history[i - 1] ?? { trace: [] }, true);
    },
    fit() { vp.fit(); },
    /* A story step's own `show` list: pan to exactly those nodes. */
    show(ids) { if (svg) follow(ids, false); },
    destroy() { vp.destroy(); ac?.abort(); ac = null; host.innerHTML = ""; svg = null; byId = new Map(); edgeTo = new Map(); },
  };
}
