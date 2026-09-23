/* Run a tree against a world with no DOM: the checks use it, the checkride
   judges with it, and the playground drives it one tick at a time. */
import { build, tick, makeBlackboard } from "./tree.js";
import { parse } from "./parse.js";

export function start({ world, scenario, tree }) {
  const spec = typeof tree === "string" ? parse(tree, world.leaves) : tree;
  const state = world.init(scenario);
  const bt = build(spec, world.leaves);
  const bb = makeBlackboard({});
  return { world, spec, state, bt, bb, history: [], t: 0 };
}

/* One tick: the tree first, then the world moves. Returns the trace so a
   caller can paint it. */
export function advance(sim, hazard) {
  const { world, state, bt, bb } = sim;
  for (const h of [].concat(hazard ?? [])) h.apply(state);
  const { status, trace } = tick(bt, state, bb);
  world.step(state);
  sim.t++;
  sim.history.push({ t: sim.t, x: state.x, y: state.y, heading: state.heading, battery: state.battery,
    target: state.target ? { ...state.target } : null, status, trace, landed: state.landed });
  return { status, trace };
}

/* How often the root changed its mind: the branch that decided the root's
   answer, counted tick over tick. A trace is post-order - a node is pushed after
   its children - so the LAST root child in one tick's trace is the one whose
   answer the root returned. Takes a history (entries with a trace) or a list of
   traces. Chapter 11's goal and the counter on the screen both call this; they
   used to be two implementations that agreed only because n1 and n5 happened to
   be the root's children in that one tree text. */
export function switchCount(ticks, rootChildIds) {
  const ids = new Set(rootChildIds);
  let prev = null, count = 0;
  for (const x of ticks) {
    let chosen = null;
    for (const n of x.trace ?? x) if (ids.has(n.id)) chosen = n.id;
    if (chosen === null) continue;
    if (prev !== null && chosen !== prev) count++;
    prev = chosen;
  }
  return count;
}

/* The order the tick walked the nodes it visited. tick() records post-order,
   but ids are pre-order and a tick is a depth first walk over the visited
   subtree, so the numeric order of the visited ids is the walk order. */
export const walkOrder = (trace) =>
  trace.map((e) => e.id).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));

/* The nodes a tick halted, which the graph flashes: every entry halted inside
   this tick (a Timeout giving up), and every node Running the tick before and
   not asked now (a preemption). A Running entry already halted inside its own
   tick is not Running any more - the interpreter reset it then - so the next
   tick not asking it halts nothing. */
export function haltedNow(prevTrace, trace) {
  const seen = new Set(trace.map((e) => e.id));
  return [
    ...trace.filter((e) => e.halted).map((e) => e.id),
    ...prevTrace.filter((e) => e.status === "Running" && !e.halted && !seen.has(e.id)).map((e) => e.id),
  ];
}

export function run({ world, scenario = "delivery", tree, script = [], ticks = 1000, until }) {
  const sim = start({ world, scenario, tree });
  const byTick = new Map();
  for (const e of script) byTick.set(e.at, [...(byTick.get(e.at) ?? []), world.hazards.find((h) => h.id === e.hazard)]);
  let passed = false;
  for (let i = 1; i <= ticks; i++) {
    advance(sim, byTick.get(i));
    if (until && until(sim.state, sim.history)) { passed = true; break; }
  }
  return { state: sim.state, bb: sim.bb, history: sim.history, ticks: sim.t, passed };
}
