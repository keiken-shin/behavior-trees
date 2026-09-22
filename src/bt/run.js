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
  if (hazard) hazard.apply(state);
  const { status, trace } = tick(bt, state, bb);
  world.step(state);
  sim.t++;
  sim.history.push({ t: sim.t, x: state.x, y: state.y, heading: state.heading, battery: state.battery,
    target: state.target ? { ...state.target } : null, status, trace, landed: state.landed });
  return { status, trace };
}

export function run({ world, scenario = "delivery", tree, script = [], ticks = 1000, until }) {
  const sim = start({ world, scenario, tree });
  const byTick = new Map(script.map((e) => [e.at, world.hazards.find((h) => h.id === e.hazard)]));
  let passed = false;
  for (let i = 1; i <= ticks; i++) {
    advance(sim, byTick.get(i));
    if (until && until(sim.state, sim.history)) { passed = true; break; }
  }
  return { state: sim.state, bb: sim.bb, history: sim.history, ticks: sim.t, passed };
}
