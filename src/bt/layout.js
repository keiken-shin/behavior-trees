/* Where each node of a tree sits. Shared by the authored plates (svg.js) and
   the live playground (tree-view.js) so a figure and the playground can never
   draw the same tree two different ways.
   Simple by design: every subtree is as wide as its children side by side, and
   a parent is centred over them. Trees in this course are small. */

const SYM = { Sequence: "->", Fallback: "?", Parallel: "=>" };
const DSYM = { Inverter: "!", Retry: "retry", Timeout: "timeout", Repeat: "repeat" };

export function labelOf(s) {
  if (s.kind === "Custom" || (s.kind === "Decorator" && s.dec?.type === "Custom")) return s.name ?? s.leaf;
  if (s.kind === "Parallel") return `=> ${s.m}${s.name ? " " + s.name : ""}`;
  if (SYM[s.kind]) return `${SYM[s.kind]}${s.name ? " " + s.name : ""}`;
  if (s.kind === "Decorator") return s.dec.type === "Inverter" ? "!" : `${DSYM[s.dec.type]} ${s.dec.n}`;
  return [s.leaf, ...(s.args ?? [])].join(" ");
}

export function layout(spec, opts = {}) {
  const { nodeW = 96, nodeH = 34, hGap = 16, vGap = 46, pad = 8 } = opts;
  let n = 0;
  const nodes = [], edges = [];
  const width = (s) => {
    const kids = s.children ?? [];
    s._w = kids.length ? Math.max(nodeW, kids.reduce((a, c) => a + width(c), 0) + hGap * (kids.length - 1)) : nodeW;
    return s._w;
  };
  width(spec);
  const place = (s, left, depth) => {
    const id = s.id ?? `n${n++}`;
    const x = left + s._w / 2, y = pad + nodeH / 2 + depth * (nodeH + vGap);
    const node = { id, kind: s.kind, label: labelOf(s), x, y, w: nodeW, h: nodeH, spec: s };
    nodes.push(node);
    let cursor = left;
    for (const c of s.children ?? []) {
      const cw = c._w;
      const child = place(c, cursor, depth + 1);
      edges.push({ from: id, to: child.id, x1: x, y1: y + nodeH / 2, x2: child.x, y2: child.y - nodeH / 2 });
      cursor += cw + hGap;
    }
    delete s._w;
    return node;
  };
  place(spec, pad, 0);
  const w = Math.max(...nodes.map((d) => d.x + d.w / 2)) + pad;
  const h = Math.max(...nodes.map((d) => d.y + d.h / 2)) + pad;
  return { nodes, edges, w, h };
}
