/* The interpreter. This file is shown to the reader in chapter 1, so it stays
 * short and it stays honest: what it does is exactly what the textbook says
 * (Colledanchise and Ogren, arXiv 1709.00084, section 1.3), plus the two
 * memory modes BehaviorTree.CPP documents on its Sequence and Fallback pages.
 *
 * A tree is ticked from the root. Every node visited answers Success, Failure
 * or Running. A node that was Running last tick and is not visited this tick
 * is halted. That is the whole engine.
 */

const KINDS = new Set(["Sequence", "Fallback", "Parallel", "Decorator", "Action", "Condition"]);

export const S = Object.freeze({ SUCCESS: "Success", FAILURE: "Failure", RUNNING: "Running", IDLE: "Idle" });

const fresh = () => ({ status: S.IDLE, idx: 0, memo: [], count: 0, runFor: 0, seen: -1, dirty: false, error: null });

/* Turn a plain spec into a runnable tree. Leaves are resolved here so an
   unknown name fails at build time, never mid tick. */
export function build(spec, leaves) {
  let n = 0;
  const all = [];
  const make = (s, depth) => {
    if (!KINDS.has(s.kind)) throw new Error(`unknown node kind "${s.kind}"`);
    const node = { ...s, id: s.id ?? `n${n++}`, depth, children: [], st: fresh() };
    if (s.kind === "Action" || s.kind === "Condition") {
      const leaf = leaves[s.leaf];
      if (!leaf) throw new Error(`unknown leaf "${s.leaf}"`);
      const want = s.kind.toLowerCase();
      if (leaf.kind !== want) throw new Error(`"${s.leaf}" is an ${leaf.kind}, not a ${want}`);
      node.impl = leaf;
    }
    node.children = (s.children ?? []).map((c) => make(c, depth + 1));
    all.push(node);
    return node;
  };
  const root = make(spec, 0);
  return { root, all, tickNo: 0 };
}

export function makeBlackboard(data = {}) {
  const bb = {
    data, log: [], tick: 0,
    get: (k) => data[k],
    set(k, v, by) { bb.log.push({ tick: bb.tick, node: by, key: k, from: data[k], to: v }); data[k] = v; },
  };
  return bb;
}

/* One tick from the root. `world.mutations` is a counter the world bumps on
   every change; it is how a Condition with side effects gets caught. */
export function tick(tree, world, bb) {
  tree.tickNo++;
  bb.tick = tree.tickNo;
  bb.log.length = 0;
  const trace = [];
  const status = visit(tree.root, tree, world, bb, trace);
  for (const node of tree.all)
    if (node.st.status === S.RUNNING && node.st.seen !== tree.tickNo) halt(node, world, tree.tickNo);
  /* A node can answer Running and be halted in the same tick (a Timeout
     giving up); its trace entry says so, or the drawing would lie. */
  for (const e of trace)
    if (tree.all.find((x) => x.id === e.id).st.haltedAt === tree.tickNo) e.halted = true;
  return { status, trace };
}

export function halt(node, world, tickNo) {
  for (const c of node.children) halt(c, world, tickNo);
  const was = node.st.status === S.RUNNING;
  if (was) node.impl?.halt?.(world, node);
  node.st = fresh();
  if (was) node.st.haltedAt = tickNo;
}

export function reset(tree, world) {
  halt(tree.root, world);
  tree.tickNo = 0;
}

function visit(node, tree, world, bb, trace) {
  const st = node.st;
  st.seen = tree.tickNo;
  let out;
  try { out = run(node, tree, world, bb, trace); }
  catch (e) { st.error = e.message; out = S.FAILURE; }
  st.status = out;
  trace.push({ id: node.id, status: out, dirty: st.dirty, error: st.error });
  st.dirty = false;
  st.error = null;
  return out;
}

function run(node, tree, world, bb, trace) {
  const kids = node.children;
  switch (node.kind) {
    case "Condition": {
      const before = world.mutations;
      const r = node.impl.tick(world, bb, node.args ?? [], node);
      if (world.mutations !== before) node.st.dirty = true;
      if (r === S.RUNNING) throw new Error("a Condition returned Running");
      return r;
    }
    case "Action":
      return node.impl.tick(world, bb, node.args ?? [], node);
    case "Sequence":
      return composite(node, tree, world, bb, trace, S.FAILURE, S.SUCCESS);
    case "Fallback":
      return composite(node, tree, world, bb, trace, S.SUCCESS, S.FAILURE);
    case "Parallel": {
      let ok = 0, bad = 0;
      for (const c of kids) {
        const r = visit(c, tree, world, bb, trace);
        if (r === S.SUCCESS) ok++; else if (r === S.FAILURE) bad++;
      }
      const n = kids.length, m = node.m ?? n;
      if (ok >= m) return S.SUCCESS;
      if (bad > n - m) return S.FAILURE;
      return S.RUNNING;
    }
    case "Decorator":
      return decorate(node, tree, world, bb, trace);
    default:
      throw new Error(`unknown node kind "${node.kind}"`);
  }
}

/* Sequence and Fallback are one function with the two answers swapped.
   `stop` is the answer that ends the walk early (Failure for a Sequence,
   Success for a Fallback); `all` is what you get if nobody stops it. */
function composite(node, tree, world, bb, trace, stop, all) {
  const st = node.st, kids = node.children, mode = node.mode ?? "reactive";
  const start = mode === "reactive" ? 0 : st.idx;
  for (let i = start; i < kids.length; i++) {
    if (mode !== "reactive" && st.memo[i]) continue;
    const r = visit(kids[i], tree, world, bb, trace);
    if (r === S.RUNNING) { st.idx = i; return S.RUNNING; }
    if (r === stop) {
      if (mode === "keep") { st.idx = i; return stop; }
      st.idx = 0; st.memo = []; return stop;
    }
    if (mode !== "reactive") st.memo[i] = true;
  }
  st.idx = 0; st.memo = [];
  return all;
}

function decorate(node, tree, world, bb, trace) {
  const st = node.st, child = node.children[0], { type, n } = node.dec;
  const r = visit(child, tree, world, bb, trace);
  switch (type) {
    case "Inverter":
      return r === S.SUCCESS ? S.FAILURE : r === S.FAILURE ? S.SUCCESS : r;
    case "Retry":
      if (r !== S.FAILURE) { if (r === S.SUCCESS) st.count = 0; return r; }
      if (++st.count >= n) { st.count = 0; return S.FAILURE; }
      return S.RUNNING;
    case "Repeat":
      if (r !== S.SUCCESS) { if (r === S.FAILURE) st.count = 0; return r; }
      if (++st.count >= n) { st.count = 0; return S.SUCCESS; }
      return S.RUNNING;
    case "Timeout":
      if (r !== S.RUNNING) { st.runFor = 0; return r; }
      if (++st.runFor > n) { halt(child, world, tree.tickNo); st.runFor = 0; return S.FAILURE; }
      return S.RUNNING;
    default:
      throw new Error(`unknown decorator "${type}"`);
  }
}
