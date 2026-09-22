/* The text form of a tree. One node per line, two spaces per level.
 *
 *   ? root                     Fallback
 *     -> low battery {memory}  Sequence, with a mode
 *       BatteryBelow 30        a leaf and its arguments
 *       ReturnHome
 *     => 2 both                Parallel, threshold 2
 *     retry 3                  decorators: ! retry N timeout N repeat N
 *       Charge
 *
 * Used by the checkride editor and by every tree in the lesson data, so the
 * course has exactly one way to write a tree.
 */

export class ParseError extends Error {
  constructor(line, message) { super(`line ${line}: ${message}`); this.line = line; }
}

const MODES = new Set(["reactive", "memory", "keep"]);
const DECOS = { "!": "Inverter", retry: "Retry", timeout: "Timeout", repeat: "Repeat" };

function head(text, no) {
  const modeM = text.match(/\s*\{(\w+)\}\s*$/);
  let mode;
  if (modeM) {
    if (!MODES.has(modeM[1])) throw new ParseError(no, `unknown mode "{${modeM[1]}}"; use reactive, memory or keep`);
    mode = modeM[1];
    text = text.slice(0, modeM.index);
  }
  const words = text.trim().split(/\s+/);
  const [w0, ...rest] = words;
  if (w0 === "->") return { kind: "Sequence", name: rest.join(" ") || undefined, mode, children: [] };
  if (w0 === "?") return { kind: "Fallback", name: rest.join(" ") || undefined, mode, children: [] };
  if (w0 === "=>") {
    const m = Number(rest[0]);
    if (!Number.isInteger(m) || m < 1) throw new ParseError(no, "a Parallel needs a whole number threshold, like => 2");
    return { kind: "Parallel", m, name: rest.slice(1).join(" ") || undefined, children: [] };
  }
  if (mode) throw new ParseError(no, "a mode only belongs on -> or ?");
  if (DECOS[w0]) {
    let n = 0;
    if (w0 !== "!") {
      n = Number(rest[0]);
      if (!Number.isInteger(n) || n < 1) throw new ParseError(no, `${w0} needs a whole number, like ${w0} 3`);
    }
    return { kind: "Decorator", dec: { type: DECOS[w0], n }, children: [] };
  }
  return { kind: "Leaf", leaf: w0, args: rest, children: [] };
}

export function parse(text, leaves) {
  const lines = text.split(/\r?\n/);
  const stack = [];           // [{ node, depth, line }]
  let root = null;
  lines.forEach((raw, i) => {
    const no = i + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) return;
    const spaces = raw.match(/^ */)[0].length;
    if (spaces % 2) throw new ParseError(no, "indent by two spaces per level");
    const depth = spaces / 2;
    const node = head(raw, no);
    if (node.kind === "Leaf") {
      if (leaves) {
        const l = leaves[node.leaf];
        if (!l) throw new ParseError(no, `unknown leaf "${node.leaf}"`);
        node.kind = l.kind === "condition" ? "Condition" : "Action";
      }
    }
    if (depth === 0) {
      if (root) throw new ParseError(no, "only one root; indent this under it");
      root = node; stack.length = 0; stack.push({ node, depth, line: no });
      return;
    }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent || parent.depth !== depth - 1) throw new ParseError(no, "indent jumps a level");
    if (parent.node.kind === "Action" || parent.node.kind === "Condition" || parent.node.kind === "Leaf")
      throw new ParseError(no, "a leaf cannot have children");
    if (parent.node.kind === "Decorator" && parent.node.children.length)
      throw new ParseError(no, "a decorator takes exactly one child");
    parent.node.children.push(node);
    stack.push({ node, depth, line: no });
  });
  if (!root) throw new ParseError(1, "empty tree");
  check(root, lines);
  return root;
}

/* Structural rules that need the whole tree: composites need a child, a
   decorator needs exactly one. Line numbers are recovered by walking the text
   again in order, which is cheap and keeps nodes free of bookkeeping. */
function check(root, lines) {
  const order = [];
  (function walk(n) { order.push(n); n.children.forEach(walk); })(root);
  const nos = lines.map((l, i) => (!l.trim() || l.trim().startsWith("#") ? null : i + 1)).filter(Boolean);
  order.forEach((n, i) => {
    const no = nos[i];
    if ((n.kind === "Sequence" || n.kind === "Fallback" || n.kind === "Parallel") && !n.children.length)
      throw new ParseError(no, `a ${n.kind} with no child`);
    if (n.kind === "Decorator" && n.children.length !== 1)
      throw new ParseError(no, "a decorator takes exactly one child");
  });
}

const SYM = { Sequence: "->", Fallback: "?", Parallel: "=>" };
const DSYM = { Inverter: "!", Retry: "retry", Timeout: "timeout", Repeat: "repeat" };

export function format(spec, depth = 0) {
  const pad = "  ".repeat(depth);
  let line;
  if (spec.kind === "Parallel") line = `=> ${spec.m}${spec.name ? " " + spec.name : ""}`;
  else if (SYM[spec.kind]) line = `${SYM[spec.kind]}${spec.name ? " " + spec.name : ""}${spec.mode ? ` {${spec.mode}}` : ""}`;
  else if (spec.kind === "Decorator") line = spec.dec.type === "Inverter" ? "!" : `${DSYM[spec.dec.type]} ${spec.dec.n}`;
  else line = [spec.leaf, ...(spec.args ?? [])].join(" ");
  return [pad + line, ...(spec.children ?? []).map((c) => format(c, depth + 1))].join("\n");
}
