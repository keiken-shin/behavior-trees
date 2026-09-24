/* A window on a tree drawn in SVG, moved by changing its viewBox, no library.
   The live graph uses it, and so does the one plate too wide for its column
   (Nav2), so a reader moves both the same way: drag to pan, ctrl+wheel or
   meta+wheel (also a trackpad pinch) or the buttons to zoom, fit to see the
   whole tree, and the arrow keys to pan while it has focus. The tree never
   starts smaller than `minScale`: when the whole of it would be drawn smaller,
   the view opens on the root at that scale, and each side of the pane fades
   where the tree goes on past it. */

export const TOOLS =
  `<div class="gv__tools">` +
    `<button type="button" class="gv__fit" title="fit the whole tree">fit</button>` +
    `<button type="button" class="gv__in" aria-label="zoom in" title="zoom in (ctrl or meta + wheel also zooms)">+</button>` +
    `<button type="button" class="gv__out" aria-label="zoom out" title="zoom out (ctrl or meta + wheel also zooms)">-</button>` +
  `</div>`;

const clamp = (v, size, whole) => (size <= whole ? Math.min(whole - size, Math.max(0, v)) : v);

/* `stage` holds the svg; `tools` holds the TOOLS buttons. onTap(target) is a
   press that did not move, with the element that was pressed. */
export function panZoom(stage, tools, { minScale, onTap = () => {} }) {
  let svg = null, full = null, base = null, vb = null, ac = null;
  let rootX = 0, paneW = 0, edge = { left: 0, right: 0, top: 0, bottom: 0 };

  /* Every view change goes through here, so the fades always say on which
     sides the tree goes on past the pane. */
  const setVB = () => {
    if (!svg) return;
    svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    /* Against the outermost nodes, not the tree's frame: its empty margin
       being out of view cuts nothing. */
    stage.classList.toggle("gv--cut-l", vb.x > edge.left + 0.5);
    stage.classList.toggle("gv--cut-r", vb.x + vb.w < edge.right - 0.5);
    stage.classList.toggle("gv--cut-t", vb.y > edge.top + 0.5);
    stage.classList.toggle("gv--cut-b", vb.y + vb.h < edge.bottom - 0.5);
  };
  /* The whole tree, in the start view's aspect so the pane keeps its height:
     as wide as the tree (or as tall, if that is the tighter side), from the top. */
  const fitAll = () => {
    const k = base.h / base.w;
    let w = full.w, h = w * k;
    if (h < full.h) { h = full.h; w = h / k; }
    vb = { x: (full.w - w) / 2, y: 0, w, h }; setVB();
  };
  /* The start view, from the pane's real width. The whole tree when it fits at
     minScale, rendered no larger than its own size and centred (capped by
     max-width plus the stylesheet's auto margins, so the checkride's smallest
     trees do not balloon). Otherwise a window at minScale, level with the
     root. Run by a ResizeObserver, not at set(): a host mounted off the page
     has no width yet, and a pane that changes width needs a new start view. */
  const frame = () => {
    const w = stage.clientWidth;
    if (!svg || !w || w === paneW) return;
    paneW = w;
    const maxH = parseFloat(getComputedStyle(svg).maxHeight) || Infinity;
    if (Math.min(w / full.w, maxH / full.h, 1) >= minScale) {
      base = { ...full };
      svg.style.maxWidth = `${full.w}px`;
    } else {
      const bw = Math.min(full.w, w / minScale), bh = Math.min(full.h, maxH / minScale);
      base = { x: Math.min(full.w - bw, Math.max(0, rootX - bw / 2)), y: 0, w: bw, h: bh };
      svg.style.maxWidth = `${bw * minScale}px`;
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
  const zoomMid = (k) => { if (svg) zoom(k, vb.x + vb.w / 2, vb.y + vb.h / 2); };
  tools.querySelector(".gv__fit").onclick = () => { if (svg) fitAll(); };
  tools.querySelector(".gv__in").onclick = () => zoomMid(1 / 1.25);
  tools.querySelector(".gv__out").onclick = () => zoomMid(1.25);
  /* The keyboard's pan: a fifth of the view per press, kept on the tree. */
  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  stage.addEventListener("keydown", (ev) => {
    const d = ARROWS[ev.key];
    if (!svg || !d) return;
    ev.preventDefault();
    vb = { ...vb, x: clamp(vb.x + d[0] * vb.w / 5, vb.w, full.w), y: clamp(vb.y + d[1] * vb.h / 5, vb.h, full.h) };
    setVB();
  });

  function bind() {
    /* One controller per svg: aborting it drops every listener below at once,
       on the next set() and on destroy(), rather than trusting that a
       detached svg is quietly garbage collected. */
    ac?.abort();
    ac = new AbortController();
    const { signal } = ac;
    let drag = null;
    svg.addEventListener("pointerdown", (ev) => {
      /* The target under the pointer, read now: setPointerCapture below
         retargets the matching pointerup to the svg itself, so ev.target
         there is useless for finding what was pressed. */
      drag = { x: ev.clientX, y: ev.clientY, last: toUser(ev), target: ev.target };
      svg.setPointerCapture(ev.pointerId);
    }, { signal });
    svg.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const p = toUser(ev);
      vb.x -= p.x - drag.last.x; vb.y -= p.y - drag.last.y;
      setVB();
      drag.last = toUser(ev);   // re-map the same point through the viewBox just set, so the next move measures from here
    }, { signal });
    const up = (ev) => { if (drag && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) onTap(drag.target); drag = null; };
    svg.addEventListener("pointerup", up, { signal });
    svg.addEventListener("pointercancel", () => { drag = null; }, { signal });
    svg.addEventListener("wheel", (ev) => {
      if (!ev.ctrlKey && !ev.metaKey) return;   // a plain wheel scrolls the page; ctrl/meta (also a trackpad pinch) zooms
      ev.preventDefault();
      const p = toUser(ev);
      zoom(ev.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    }, { passive: false, signal });
  }

  return {
    /* A new drawing: its size in viewBox units, the root's x for the start
       view, and the drawing's outermost edges for the fades. */
    set(el, { w, h, root, left = 0, right = w, top = 0, bottom = h }) {
      svg = el; full = { x: 0, y: 0, w, h }; rootX = root; edge = { left, right, top, bottom };
      svg.style.maxWidth = `${w}px`;
      base = { ...full }; vb = { ...base }; setVB();
      paneW = 0; frame();
      bind();
    },
    get view() { return vb; },
    /* Pan, never zoom, so the box { x0, x1, y0, y1 } is in view: centred on
       it, clamped to the tree. A box already in view moves nothing. */
    panTo({ x0, x1, y0, y1 }) {
      if (!svg) return;
      if (x0 >= vb.x - 0.5 && x1 <= vb.x + vb.w + 0.5 && y0 >= vb.y - 0.5 && y1 <= vb.y + vb.h + 0.5) return;
      vb = { ...vb, x: clamp((x0 + x1) / 2 - vb.w / 2, vb.w, full.w), y: clamp((y0 + y1) / 2 - vb.h / 2, vb.h, full.h) };
      setVB();
    },
    fit() { if (svg) fitAll(); },
    destroy() { ro.disconnect(); ac?.abort(); ac = null; svg = null; },
  };
}
