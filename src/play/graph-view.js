/* The tree as a live graph. Layout comes from layout.js and shapes from svg.js,
   so it is the plate primitives made live: nodes take the interpreter's answer
   as a class, edges pulse in the order the tick walked, a node that was Running
   and is not visited flashes once (the halt), so does a node the trace marks
   halted inside the tick (a Timeout giving up), and a click opens a card that
   reads from the trace and the built tree, nothing else (Tab and Enter open
   it too). Pan by drag, zoom by ctrl+wheel or meta+wheel (also a trackpad
   pinch) or the buttons, fit to see the whole tree. The tree never starts
   smaller than reading size: when the whole of it would put a label under
   about 9 px, the view starts on the root
   at that size, the edges fade where the tree goes on, and every paint pans to
   the nodes that tick changed if they are out of view. */
import { layout } from "../bt/layout.js";
import { node, edge, esc } from "../data/svg.js";
import { walkOrder, haltedNow } from "../bt/run.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };
const OPTS = { nodeH: 34, hGap: 8, vGap: 44 };
const MIN_SCALE = 0.75;   // a 12 px label is never drawn under 9 px
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
  let full = null, rootX = 0, paneW = 0, geo = new Map(), edgeL = 0, edgeR = 0;
  let bt = null, lastEntry = null, lastReplay = false, picked = null;

  /* Every view change goes through here, so the edge fades always say whether
     the tree goes on past the left or the right edge of the pane. */
  const setVB = () => {
    if (!svg) return;
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    /* Against the outermost nodes, not the tree's frame: its empty margin
       being out of view cuts nothing. */
    stage.classList.toggle("gv--cut-l", vb.x > edgeL + 0.5);
    stage.classList.toggle("gv--cut-r", vb.x + vb.w < edgeR - 0.5);
  };
  /* The whole tree, in the start view's aspect so the pane keeps its height:
     as wide as the tree (or as tall, if that is the tighter side), from the top. */
  const fitAll = () => {
    const k = base.h / base.w;
    let w = full.w, h = w * k;
    if (h < full.h) { h = full.h; w = h / k; }
    vb = { x: (full.w - w) / 2, y: 0, w, h }; setVB();
  };
  /* Pan, never zoom, so that the box around `ids` is in view: centred on it,
     clamped to the tree. When that box is wider than the view, the leaves in
     it are what a caption names (the check, the flight), so the box narrows to
     them; a box still wider than the view is centred anyway. */
  const span = (boxes) => ({
    x0: Math.min(...boxes.map((d) => d.x - d.w / 2)), x1: Math.max(...boxes.map((d) => d.x + d.w / 2)),
    y0: Math.min(...boxes.map((d) => d.y - d.h / 2)), y1: Math.max(...boxes.map((d) => d.y + d.h / 2)),
  });
  const follow = (ids, narrow = true) => {
    let boxes = ids.map((id) => geo.get(id)).filter(Boolean);
    if (!boxes.length) return;
    const leaves = boxes.filter((d) => d.kind === "Action" || d.kind === "Condition");
    if (narrow && leaves.length) { const b = span(boxes); if (b.x1 - b.x0 > vb.w) boxes = leaves; }
    const { x0, x1, y0, y1 } = span(boxes);
    if (x0 >= vb.x - 0.5 && x1 <= vb.x + vb.w + 0.5 && y0 >= vb.y - 0.5 && y1 <= vb.y + vb.h + 0.5) return;
    const clamp = (v, size, whole) => (size <= whole ? Math.min(whole - size, Math.max(0, v)) : v);
    vb = { ...vb, x: clamp((x0 + x1) / 2 - vb.w / 2, vb.w, full.w), y: clamp((y0 + y1) / 2 - vb.h / 2, vb.h, full.h) };
    setVB();
  };
  /* The start view, from the pane's real width. The whole tree when it fits at
     reading size, rendered no larger than its own size and centred (capped by
     max-width plus the stylesheet's auto margins, so the checkride's smallest
     trees do not balloon). Otherwise a window at MIN_SCALE, level with the
     root. Run by a ResizeObserver, not at render(): a host mounted off the
     page (Task 4's pattern) has no width yet, and a pane that changes width
     needs a new start view. */
  const frame = () => {
    const w = stage.clientWidth;
    if (!svg || !w || w === paneW) return;
    paneW = w;
    const maxH = parseFloat(getComputedStyle(svg).maxHeight) || Infinity;
    if (Math.min(w / full.w, maxH / full.h, 1) >= MIN_SCALE) {
      base = { ...full };
      svg.style.maxWidth = `${full.w}px`;
    } else {
      const bw = Math.min(full.w, w / MIN_SCALE), bh = Math.min(full.h, maxH / MIN_SCALE);
      base = { x: Math.min(full.w - bw, Math.max(0, rootX - bw / 2)), y: 0, w: bw, h: bh };
      svg.style.maxWidth = `${bw * MIN_SCALE}px`;
    }
    vb = { ...base }; setVB();
  };
  /* Deferred a frame: frame() changes the stage's height, and doing that
     inside the observer's own callback is the "ResizeObserver loop" error. */
  const ro = new ResizeObserver(() => requestAnimationFrame(frame));
  ro.observe(stage);
  const zoom = (k, cx, cy) => {
    /* Zoom about a point in viewBox units, clamped so the tree cannot vanish. */
    const w = Math.min(base.w * 4, Math.max(base.w / 4, vb.w * k));
    const h = w * (vb.h / vb.w);
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
    /* The keyboard's way to a node: Tab reaches it (and pans it into view),
       Enter or Space opens its card, as a click does. */
    svg.addEventListener("keydown", (ev) => {
      const id = ev.target.closest?.("g[data-id]")?.dataset.id;
      if (!id || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      pick(id);
    }, { signal });
    svg.addEventListener("focusin", (ev) => {
      const id = ev.target.closest?.("g[data-id]")?.dataset.id;
      if (id) follow([id], false);
    }, { signal });
    q(".gv__fit").onclick = fitAll;
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
      full = { x: 0, y: 0, w: L.w, h: L.h }; rootX = L.nodes[0].x;
      geo = new Map(L.nodes.map((d) => [d.id, d]));
      edgeL = Math.min(...L.nodes.map((d) => d.x - d.w / 2)); edgeR = Math.max(...L.nodes.map((d) => d.x + d.w / 2));
      svg.style.maxWidth = `${L.w}px`;
      base = { ...full }; vb = { ...base }; setVB();
      paneW = 0; frame();
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
      edgeTo = new Map([...svg.querySelectorAll("line[data-to]")].map((l) => [l.dataset.to, l]));
      bind();
      card.hidden = true;
    },
    /* One history entry. `prev` is the entry before it, for the halt flash
       (haltedNow, in run.js); when omitted the view uses what it painted last. `replay` marks a
       repaint from stored history rather than a live tick - see showCard(). */
    paint(entry, prev, replay = false) {
      const before = prev ?? lastEntry ?? { trace: [] };
      const halted = haltedNow(before.trace, entry.trace);
      for (const [id, g] of byId) {
        g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err", "halt");
        g.classList.add("st-idle");
        g.querySelector("title.err-t")?.remove();
        if (halted.includes(id) && !REDUCED.matches) g.classList.add("halt");
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
    fit() { if (base) fitAll(); },
    /* A story step's own `show` list: pan to exactly those nodes. */
    show(ids) { if (svg) follow(ids, false); },
    destroy() { ro.disconnect(); ac?.abort(); ac = null; host.innerHTML = ""; svg = null; byId = new Map(); edgeTo = new Map(); },
  };
}
