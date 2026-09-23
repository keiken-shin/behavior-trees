/* Where each node of a tree sits. Shared by the authored plates (svg.js) and
   the live graph (graph-view.js) so a figure and the playground can never
   draw the same tree two different ways.
   Simple by design: every subtree is as wide as its children side by side (or
   its own node, if that is wider), and a parent is centred between its first
   and last child, kept inside its own subtree's span so it can never reach a
   neighbour's. Trees in this course are small.
   Each node is as wide as its own label needs, between a floor and a ceiling,
   so a short label does not pay for the longest one in the tree. */

export const SYM = { Sequence: "->", Fallback: "?", Parallel: "=>" };
export const DSYM = { Inverter: "!", Retry: "retry", Timeout: "timeout", Repeat: "repeat" };

export function labelOf(s) {
  if (s.kind === "Custom" || (s.kind === "Decorator" && s.dec?.type === "Custom")) return s.name ?? s.leaf;
  if (s.kind === "Parallel") return `=> ${s.m}${s.name ? " " + s.name : ""}`;
  if (SYM[s.kind]) return `${SYM[s.kind]}${s.name ? " " + s.name : ""}`;
  if (s.kind === "Decorator") return s.dec.type === "Inverter" ? "!" : `${DSYM[s.dec.type]} ${s.dec.n}`;
  return [s.leaf, ...(s.args ?? [])].join(" ");
}

/* Label geometry, shared with svg.js. JetBrains Mono is monospaced, so a
   label's width is its length times 0.6 em. A rect gives its label all but an
   8 px inset; an ellipse and a rhombus are narrower than their box where the
   text sits, so they give a fraction of it. */
export const ADV = 0.6;
export const room = (kind, w) => (kind === "Condition" ? 0.82 * w : kind === "Decorator" ? 0.6 * w : w - 8);
/* The inverse of room(), plus 8 px so a label never touches its outline.
   Kept tight on purpose: on a phone the graph shows a window of the tree at
   reading size, and every unit a node gives up is a neighbour that fits in it. */
const need = (kind, text) => (kind === "Condition" ? text / 0.82 : kind === "Decorator" ? text / 0.6 : text + 8) + 8;

/* `fs` is the label's font size in px; `minW` and `maxW` bound a node's width.
   A label wider than `maxW` allows is svg.js's to break onto two lines. */
export function layout(spec, opts = {}) {
  const { minW = 56, maxW = 200, fs = 12, nodeH = 34, hGap = 16, vGap = 46, pad = 8 } = opts;
  let n = 0;
  const nodes = [], edges = [];
  const width = (s) => {
    const kids = s.children ?? [];
    s._own = Math.round(Math.min(maxW, Math.max(minW, need(s.kind, ADV * fs * labelOf(s).length))));
    s._w = kids.length ? Math.max(s._own, kids.reduce((a, c) => a + width(c), 0) + hGap * (kids.length - 1)) : s._own;
    return s._w;
  };
  width(spec);
  const place = (s, left, depth) => {
    const id = s.id ?? `n${n++}`, y = pad + nodeH / 2 + depth * (nodeH + vGap);
    const node = { id, kind: s.kind, label: labelOf(s), x: 0, y, w: s._own, h: nodeH, spec: s };
    nodes.push(node);                     // now, so nodes stay in pre-order
    const kids = s.children ?? [];
    const span = kids.reduce((a, c) => a + c._w, 0) + hGap * Math.max(0, kids.length - 1);
    let cursor = left + (s._w - span) / 2;   // children centred under a parent wider than them
    const placed = kids.map((c) => { const cw = c._w, child = place(c, cursor, depth + 1); cursor += cw + hGap; return child; });
    const mid = placed.length ? (placed[0].x + placed[placed.length - 1].x) / 2 : left + s._w / 2;
    node.x = Math.min(left + s._w - s._own / 2, Math.max(left + s._own / 2, mid));
    for (const child of placed) edges.push({ from: id, to: child.id, x1: node.x, y1: y + nodeH / 2, x2: child.x, y2: child.y - nodeH / 2 });
    delete s._w; delete s._own;
    return node;
  };
  place(spec, pad, 0);
  const w = Math.max(...nodes.map((d) => d.x + d.w / 2)) + pad;
  const h = Math.max(...nodes.map((d) => d.y + d.h / 2)) + pad;
  return { nodes, edges, w, h };
}
