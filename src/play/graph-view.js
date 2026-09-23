/* The tree as a live graph. Layout comes from layout.js and shapes from svg.js,
   so it is the plate primitives made live: nodes take the interpreter's answer
   as a class, edges pulse in the order the tick walked, a node that was Running
   and is not visited flashes once (the halt), and a click opens a card that
   reads from the trace and the built tree, nothing else. Pan by drag, zoom by
   ctrl+wheel or meta+wheel (also a trackpad pinch) or the buttons, fit to reset. */
import { layout } from "../bt/layout.js";
import { node, edge, esc } from "../data/svg.js";
import { walkOrder } from "../bt/run.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };
const OPTS = { nodeW: 140, nodeH: 34, hGap: 8, vGap: 44 };
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
let seq = 0;   // a fresh hatch pattern id per view, so two scenes on one page never share a DOM id

export function graphView(host) {
  const hatchId = `gv-hatch-${seq++}`;
  host.innerHTML =
    `<div class="gv">` +
      `<div class="gv__stage"></div>` +
      `<div class="gv__tools">` +
        `<button type="button" class="gv__fit" title="fit the whole tree">fit</button>` +
        `<button type="button" class="gv__in" aria-label="zoom in" title="zoom in (ctrl or meta + wheel also zooms)">+</button>` +
        `<button type="button" class="gv__out" aria-label="zoom out" title="zoom out (ctrl or meta + wheel also zooms)">-</button>` +
      `</div>` +
      `<div class="gv__card" hidden></div>` +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const stage = q(".gv__stage"), card = q(".gv__card");
  let svg = null, byId = new Map(), edgeTo = new Map(), base = null, vb = null, ac = null;
  let bt = null, lastEntry = null, lastReplay = false, picked = null, prevRunning = new Set();

  const setVB = () => svg && svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoom = (k, cx, cy) => {
    /* Zoom about a point in viewBox units, clamped so the tree cannot vanish. */
    const w = Math.min(base.w * 4, Math.max(base.w / 4, vb.w * k));
    const h = w * (base.h / base.w);
    const fx = (cx - vb.x) / vb.w, fy = (cy - vb.y) / vb.h;
    vb = { x: cx - fx * w, y: cy - fy * h, w, h };
    setVB();
  };
  /* A client point (pixels) to viewBox units, through the svg's real screen
     transform. `vb.w / rect.width` is only right when the box has the
     viewBox's own aspect; `max-height` letterboxes a tall tree, and the CTM is
     the one mapping that already knows it. */
  const toUser = (ev) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  function bind() {
    /* One controller per render: aborting it drops every listener below at
       once, on the next render and on destroy(), rather than trusting that a
       detached svg is quietly garbage collected. */
    ac?.abort();
    ac = new AbortController();
    const { signal } = ac;
    let drag = null;
    svg.addEventListener("pointerdown", (ev) => {
      /* The id under the pointer, read now: setPointerCapture below retargets
         the matching pointerup to the svg itself, so ev.target there is
         useless for finding the node that was clicked. */
      drag = { x: ev.clientX, y: ev.clientY, last: toUser(ev), id: ev.target.closest("g[data-id]")?.dataset.id ?? null };
      svg.setPointerCapture(ev.pointerId);
    }, { signal });
    svg.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const p = toUser(ev);
      vb.x -= p.x - drag.last.x; vb.y -= p.y - drag.last.y;
      setVB();
      drag.last = toUser(ev);   // re-map the same point through the viewBox just set, so the next move measures from here
    }, { signal });
    const up = (ev) => { if (drag && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) pick(drag.id); drag = null; };
    svg.addEventListener("pointerup", up, { signal });
    svg.addEventListener("pointercancel", () => { drag = null; }, { signal });
    svg.addEventListener("wheel", (ev) => {
      if (!ev.ctrlKey && !ev.metaKey) return;   // a plain wheel scrolls the page; ctrl/meta (also a trackpad pinch) zooms
      ev.preventDefault();
      const p = toUser(ev);
      zoom(ev.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    }, { passive: false, signal });
    q(".gv__fit").onclick = () => { vb = { ...base }; setVB(); };
    q(".gv__in").onclick = () => zoom(1 / 1.25, vb.x + vb.w / 2, vb.y + vb.h / 2);
    q(".gv__out").onclick = () => zoom(1.25, vb.x + vb.w / 2, vb.y + vb.h / 2);
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
      bt = built; picked = null; prevRunning = new Set(); lastEntry = null; lastReplay = false;
      const L = layout(spec, OPTS);
      stage.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" class="figure tree-live" role="img" aria-label="The tree, repainted every tick" style="--hatch-live:url(#${hatchId})">` +
        `<defs><pattern id="${hatchId}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
        L.edges.map((e) => edge(e.x1, e.y1, e.x2, e.y2).replace("<line", `<line data-to="${e.to}" style="--len:${Math.hypot(e.x2 - e.x1, e.y2 - e.y1)}"`)).join("") +
        L.nodes.map((d) => node(d.kind, d.x, d.y, d.label, { w: d.w, h: d.h }).replace("<g class=", `<g data-id="${d.id}" class=`)).join("") +
        `</svg>`;
      svg = stage.firstElementChild;
      /* A tree narrower than its own pane renders at its own size, centred,
         not stretched to fill the pane - the checkride's smallest trees
         would otherwise balloon to the height of a thirteen-node one. Capped
         in CSS (max-width plus the stylesheet's auto margins) rather than by
         measuring the stage here: a host mounted off the page - Task 4's
         pattern - has a clientWidth of 0 at render() time, which a
         measurement would wrongly treat as "no cap needed". */
      svg.style.maxWidth = `${L.w}px`;
      base = { x: 0, y: 0, w: L.w, h: L.h }; vb = { ...base }; setVB();
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
      edgeTo = new Map([...svg.querySelectorAll("line[data-to]")].map((l) => [l.dataset.to, l]));
      bind();
      card.hidden = true;
    },
    /* One history entry. `prev` is the entry before it, for the halt flash;
       when omitted the view uses what it painted last. `replay` marks a
       repaint from stored history rather than a live tick - see showCard(). */
    paint(entry, prev, replay = false) {
      const before = prev ? new Set(prev.trace.filter((x) => x.status === "Running").map((x) => x.id)) : prevRunning;
      const seen = new Set(entry.trace.map((x) => x.id));
      for (const [id, g] of byId) {
        g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err", "halt");
        g.classList.add("st-idle");
        g.querySelector("title.err-t")?.remove();
        if (before.has(id) && !seen.has(id) && !REDUCED.matches) g.classList.add("halt");
      }
      for (const x of entry.trace) {
        const g = byId.get(x.id); if (!g) continue;
        g.classList.remove("st-idle"); g.classList.add(`st-${ST[x.status] ?? "idle"}`);
        if (x.dirty) g.classList.add("dirty");
        if (x.error) { g.classList.add("err"); g.insertAdjacentHTML("afterbegin", `<title class="err-t">${esc(x.error)}</title>`); }
      }
      edgeTo.forEach((l) => { l.classList.remove("pulse"); l.style.animationDelay = ""; });
      if (!REDUCED.matches) walkOrder(entry.trace).forEach((id, i) => {
        const l = edgeTo.get(id); if (!l) return;
        l.style.animationDelay = `${i * 40}ms`;
        void l.getBoundingClientRect();          // restart the animation when the class is re-added
        l.classList.add("pulse");
      });
      prevRunning = new Set(entry.trace.filter((x) => x.status === "Running").map((x) => x.id));
      lastEntry = entry; lastReplay = replay;
      showCard();
    },
    replay(history, i) {
      if (!history[i]) return;
      this.paint(history[i], history[i - 1] ?? { trace: [] }, true);
    },
    fit() { if (base) { vb = { ...base }; setVB(); } },
    destroy() { ac?.abort(); ac = null; host.innerHTML = ""; svg = null; byId = new Map(); edgeTo = new Map(); },
  };
}
