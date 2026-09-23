/* Every live scene in the course. Pure data plus two small functions the
   playground and the check share, so the story a reader watches is the story
   the build proved.

   A step runs the sim until `to` is met: a tick number, or a predicate on
   (state, history). `hazard` is applied on the step's first tick through
   advance(), never by a direct call. `say` is the caption, with {t} for the
   tick the step stopped at. `then` is the unlocked stage: the playground's own
   configuration, so the plays of version one are carried over here, revised:
   some ids, trees and goals changed, and captions replace what used to be
   prose in `then.brief`/`then.goal.done`. */
import { start, advance, switchCount } from "../bt/run.js";
import { build } from "../bt/tree.js";
import { parse } from "../bt/parse.js";
import { WORLDS } from "../world/index.js";

export const SCENES = {};
export const fill = (say, t) => say.replaceAll("{t}", String(t));
export const stepDone = (sim, step) =>
  typeof step.to === "number" ? sim.t >= step.to : !!step.to(sim.state, sim.history);

/* The playground's configuration for a scene: the sim fields, the steps, and
   whatever the unlocked stage asks for. */
export function sceneConfig(id) {
  const sc = SCENES[id];
  if (!sc) throw new Error(`no scene "${id}"`);
  return { world: sc.world, scenario: sc.scenario, tree: sc.tree, extraLeaves: sc.extraLeaves, start: sc.start,
           steps: sc.steps, ...(sc.then ?? {}), brief: sc.then?.brief ?? "" };
}

/* One tick of one step: the hazard lands on the first tick only (Task 1's
   rule - a hazard step always ticks at least once, to actually apply it),
   every other tick is a plain advance(). The playground and runSteps() both
   call this, so the walk a reader watches and the walk the check proved are
   the same loop, not two that happen to agree today. */
export function stepTick(sim, step, first) {
  const hz = first && step.hazard ? sim.world.hazards.find((h) => h.id === step.hazard) : undefined;
  advance(sim, hz);
  return stepDone(sim, step);
}

/* Headless: the same loop the playground animates. */
export function runSteps(sc) {
  const world = WORLDS[sc.world];
  const W = { ...world, leaves: { ...world.leaves, ...(sc.extraLeaves ?? {}) } };
  const sim = start({ world: W, scenario: sc.scenario, tree: sc.tree });
  sc.start?.(sim.state);
  const stops = [];
  sc.steps.forEach((step, i) => {
    const cap = sim.t + (step.cap ?? 600);
    let first = true, ok = !step.hazard && stepDone(sim, step) && typeof step.to !== "number";
    while (!ok && sim.t < cap) {
      ok = stepTick(sim, step, first);
      first = false;
    }
    stops.push({ i, t: sim.t, ok });
  });
  return { sim, stops };
}

const near = (s, p, r = 3) => Math.hypot(s.x - p.x, s.y - p.y) <= r;
const last = (h) => h[h.length - 1];
const answered = (h, id, status) => !!last(h)?.trace.some((n) => n.id === id && n.status === status);
const rootKids = (text, leaves) => build(parse(text, leaves), leaves).root.children.map((c) => c.id);
const D = WORLDS.drone.leaves;

const PREEMPT = "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land";

/* ids, pre-order: n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 -> deliver | n5 FlyTo | n6 Drop */
SCENES["tick/root-to-leaf"] = {
  world: "drone", scenario: "delivery",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n  -> deliver\n    FlyTo A\n    Drop",
  steps: [
    { say: "One tick. The walk left the root, asked the check, got Failure, so the Sequence failed. The Fallback moved right. FlyTo answered Running, and so did the root.", to: 1 },
    { say: "Tick two: the same walk again, from the root. Nothing is remembered between ticks.", to: 2 },
    { say: "At tick {t} FlyTo answered Success, and the Sequence moved on to Drop.", to: (s, h) => answered(h, "n5", "Success"), cap: 400 },
  ],
  then: { hazards: [], brief: "Step it one tick at a time and read each answer. Then play it to the end.",
    goal: { test: (s) => s.delivered, done: "Drop answered Success. The job is done, and the tree will be asked again anyway." } },
};

/* n0 -> trip {memory} | n1 FlyTo A | n2 Land */
SCENES["answers/three"] = {
  world: "drone", scenario: "delivery",
  tree: "-> trip {memory}\n  FlyTo A\n  Land",
  steps: [
    { say: "FlyTo answered Running: not yet. Land was not asked.", to: 1 },
    { say: "At tick {t} FlyTo answered Success. Land was asked and answered Success at once.", to: (s, h) => answered(h, "n1", "Success"), cap: 400 },
    { say: "So the Sequence answered Success. Failure is the third answer; the next chapter shows it.", to: (s, h) => last(h)?.status === "Success", cap: 400 },
  ],
  then: { hazards: [], brief: "Reset and step it yourself. Every tick, every node says one of three things.",
    goal: { test: (s) => s.landed && near(s, s.waypoints.A), done: "Landed at A. Both answered Success, in order." } },
};

const TODO = "-> deliver\n  BatteryAbove 30\n  TakeOff\n  FlyTo A\n  Drop\n  ReturnHome\n  Land";
/* n0 -> deliver | n1 BatteryAbove | n2 TakeOff | n3 FlyTo | n4 Drop | n5 ReturnHome | n6 Land */
SCENES["sequence/todo"] = {
  world: "drone", scenario: "delivery",
  tree: TODO,
  steps: [
    { say: "The check passed, TakeOff passed, FlyTo is Running. So is the list.", to: 1 },
    { say: "Battery dropped. At tick {t} the check failed, so the list failed at that child. Nothing to its right was asked.", hazard: "battery12", to: (s, h) => last(h)?.status === "Failure" },
    { say: "The next tick the list started from its first child again. It does not remember where it was.", to: (s, h) => h.length >= 2 && answered(h, "n1", "Failure") && h[h.length - 2].status === "Failure" },
  ],
  then: { hazards: ["battery12"], brief: "Flip the list to memory and drop the battery again. Watch where it restarts.",
    variants: [
      { label: "reactive (textbook Sequence)", tree: TODO },
      { label: "memory (Sequence*)", tree: TODO.replace("-> deliver", "-> deliver {memory}") },
    ],
    goal: { test: (s, h) => h.some((x) => x.status === "Failure"), done: "The whole list answered Failure because one item did." } },
};

/* n0 ? get power | n1 Charge | n2 ReturnHome */
SCENES["fallback/plan-b"] = {
  world: "drone", scenario: "delivery",
  tree: "? get power\n  Charge\n  ReturnHome",
  start: (s) => { s.landed = false; s.x = 120; s.y = 60; s.battery = 40; },
  steps: [
    { say: "Charge failed, away from the pad. ReturnHome is Running, so the Fallback is Running.", to: 1 },
    { say: "Five ticks, the same walk each time: plan A is asked first and fails again.", to: 5 },
    { say: "On the pad at tick {t}, Charge answered Running. Plan B was not asked, and was halted.", to: (s) => s.charging, cap: 400 },
  ],
  then: { hazards: [], brief: "Flip the Fallback to memory and reset. Count how often plan A is asked now.",
    variants: [
      { label: "reactive", tree: "? get power\n  Charge\n  ReturnHome" },
      { label: "memory", tree: "? get power {memory}\n  Charge\n  ReturnHome" },
    ],
    goal: { test: (s) => s.battery >= 100, done: "Plan A finished, because it was asked again once it could succeed." } },
};

/* n0 -> peek | n1 NudgedNorth | n2 FlyTo A */
SCENES["condition/pure"] = {
  world: "drone", scenario: "delivery",
  tree: "-> peek\n  NudgedNorth\n  FlyTo A",
  extraLeaves: {
    NudgedNorth: { kind: "condition", doc: "a condition that CHANGES the world; here to be caught",
      tick: (s) => { s.y -= 0.5; s.mutations++; return "Success"; } },
  },
  steps: [
    { say: "The ellipse answered Success, and it is already hatched: it changed the world while answering. The rounded box is still flying, so it answered Running.", to: 1 },
    { say: "Tick two: hatched again. The cheat happens on every tick, and a condition may only ask.", to: 2 },
  ],
  then: { hazards: [], brief: "Play it. The hatch never goes away, because the cheat happens every tick.",
    goal: { test: (s, h) => h.some((x) => x.trace.some((n) => n.dirty)), done: "Caught. A condition changed the world and the tree said so." } },
};

/* PREEMPT ids: n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 Charge | n5 -> deliver | n6 FlyTo | n7 Drop | n8 ReturnHome | n9 Land */
SCENES["reactive/preempt"] = {
  world: "drone", scenario: "delivery",
  tree: PREEMPT,
  steps: [
    { say: "Battery fine: the check failed, the Fallback moved right, the flight is Running.", to: 1 },
    { say: "Sixty ticks on, the same walk every tick: safety asked first, then the job.", to: 60 },
    { say: "The battery dropped. At tick {t} the check passed, ReturnHome runs, and the Fallback stopped there. The delivery was not asked, so FlyTo was halted.", hazard: "battery12", to: (s, h) => answered(h, "n3", "Running") },
  ],
  then: { hazards: ["battery12"], brief: "Reset, play, and drop the battery wherever you like. The cut always comes on the next tick.",
    goal: { test: (s, h) => h.some((x) => x.battery < 30) && s.charging, done: "The delivery was halted mid flight and the drone is charging at home." } },
};

SCENES["memory/modes"] = {
  world: "drone", scenario: "delivery",
  tree: PREEMPT.replace("? root", "? root {memory}"),
  steps: [
    { say: "Root memory. The delivery is Running, and the root has put its finger on it.", to: 1 },
    { say: "The battery dropped at tick {t}, and the check was not asked. The root resumed the delivery instead.", hazard: "battery12", to: (s, h) => s.battery < 30 && !last(h)?.trace.some((n) => n.id === "n2") },
    { say: "At tick {t} the battery hit zero with the check never asked again. That is what memory costs.", to: (s) => s.dead, cap: 900 },
  ],
  then: { hazards: ["battery12", "gust", "calm"], modes: true, brief: "Same tree, three modes on the root. Drop the battery in each. Then try the patrol with a gust.",
    variants: [
      { label: "safety tree, root memory", tree: PREEMPT.replace("? root", "? root {memory}") },
      { label: "safety tree, root reactive", tree: PREEMPT },
      { label: "patrol A then B, reactive", tree: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land" },
      { label: "patrol A then B, memory", tree: "-> patrol {memory}\n  FlyTo A\n  FlyTo B\n  Land" },
    ],
    goal: { test: (s) => s.dead, done: "The drone died with the check skipped. Now flip the root back to reactive and drop the battery again." } },
};

const KINDS = "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    timeout 200\n      ReturnHome\n    Land";
/* n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 retry | n5 Charge | n6 -> deliver | n7 FlyTo | n8 Drop | n9 timeout | n10 ReturnHome | n11 Land */
SCENES["decorators/kinds"] = {
  world: "drone", scenario: "delivery",
  tree: KINDS,
  steps: [
    { say: "Two rhombuses, each with exactly one child. Neither has had to rule yet.", to: 1 },
    { say: "Parcel dropped at tick {t}. The flight home starts, under the timeout.", to: (s) => s.delivered, cap: 400 },
    { say: "A gust from the west. The flight home ran 200 ticks under the timeout; at tick {t} the timeout halted ReturnHome and answered Failure, so the delivery failed.", hazard: "gust", to: (s, h) => answered(h, "n9", "Failure"), cap: 2500 },
  ],
  then: { hazards: ["gust", "calm"], brief: "Reset and play without the gust: the flight home finishes inside 200 ticks and the timeout never speaks.",
    goal: { test: (s, h) => h.some((x) => x.trace.some((n) => n.status === "Failure" && n.id === "n9")), done: "The timeout gave up on the flight. The Sequence failed, and the tree is asked again." } },
};

/* n0 => 2 both | n1 Hover | n2 Charge | n3 Land */
SCENES["parallel/m-of-n"] = {
  world: "drone", scenario: "delivery",
  tree: "=> 2 both\n  Hover\n  Charge\n  Land",
  start: (s) => { s.battery = 40; },
  steps: [
    { say: "All three ticked. Land is done at once, Hover never finishes, Charge is still filling. One Success against a threshold of two.", to: 1 },
    { say: "Charge finished at tick {t}. Two Successes met the threshold, so the Parallel answered Success, even though Hover is still Running.", to: (s, h) => last(h)?.status === "Success", cap: 400 },
  ],
  then: { hazards: [], brief: "Reset and step it. Every child is asked every tick, and the count decides.",
    goal: { test: (s, h) => h.some((x) => x.status === "Success"), done: "Two of three, and the Parallel answered Success." } },
};

SCENES["parallel/race"] = {
  world: "drone", scenario: "delivery",
  tree: "=> 2 both\n  SetMode fast\n  SetMode slow",
  extraLeaves: {
    SetMode: { kind: "action", doc: "writes its argument to the blackboard key mode",
      tick: (s, bb, [v], node) => { bb.set("mode", v, node.id); return "Success"; } },
  },
  steps: [
    { say: "Both children wrote the key mode this tick. Read the log under the map: the last writer won.", to: 1 },
    { say: "Three ticks, six writes, and slow wins every time, because it is ticked second. That is a race.", to: 3 },
  ],
  then: { hazards: [], brief: "Play it. Nothing changes, which is the point: order decides, not intent.",
    goal: { test: (s, h) => h.length >= 3, done: "Three ticks, six writes, and the last writer wins every time." } },
};

const GOALTREE = "-> deliver {memory}\n  FlyTo Goal\n  Drop\n  ReturnHome\n  Land";
SCENES["blackboard/ports"] = {
  world: "drone", scenario: "delivery",
  tree: GOALTREE,
  steps: [
    { say: "FlyTo Goal read the goal key this tick. It holds no copy of its own.", to: 1 },
    { say: "The goal moved to B before tick {t}. On that same tick FlyTo read B and turned. Nothing in the tree changed.", hazard: "goalB", to: (s) => s.target && s.target.x === s.waypoints.B.x && s.target.y === s.waypoints.B.y, cap: 10 },
    { say: "Delivered at B at tick {t}.", to: (s) => s.delivered, cap: 2500 },
  ],
  then: { hazards: ["goalB"], brief: "Switch to the tree that typed the waypoint in, reset, and move the goal again.",
    variants: [
      { label: "reads the goal", tree: GOALTREE },
      { label: "typed the waypoint", tree: GOALTREE.replace("FlyTo Goal", "FlyTo A") },
    ],
    goal: { test: (s) => s.delivered && s.goalMoves > 0, done: "Delivered to the moved goal, because the tree read it instead of remembering it." } },
};

const PREEMPT_KIDS = rootKids(PREEMPT, D);
SCENES["fsm/transitions"] = {
  world: "drone", scenario: "delivery",
  tree: PREEMPT,
  steps: [
    { say: "One branch chosen: the delivery. Switches so far: none.", to: 1 },
    { say: "The battery dropped and control moved to the safety branch at tick {t}. One switch: one arrow you would have had to draw.", hazard: "battery12", to: (s, h) => switchCount(h, PREEMPT_KIDS) >= 1 },
    { say: "Three switches by tick {t}. The tree chatters at the 30 percent line: charging lifts the battery above it, the flight drops it back below.", to: (s, h) => switchCount(h, PREEMPT_KIDS) >= 3, cap: 900 },
  ],
  then: { hazards: ["battery12"], counter: true, brief: "Play on and watch the counter climb. Every switch is a transition a state machine would draw.",
    goal: { test: (s, h) => switchCount(h, PREEMPT_KIDS) >= 3, done: "Three switches. Every one would be a drawn transition in a state machine." } },
};

SCENES["design/mission"] = {
  world: "drone", scenario: "delivery",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo Goal\n    Drop\n    ReturnHome\n    Land",
  steps: [],
  then: { hazards: ["battery12", "gust", "calm", "nofly", "goalB"], editor: true, brief: "The whole mission, every hazard, and the editor open. Break it, then fix it.",
    goal: { test: (s) => s.delivered && s.landed && s.goalMoves > 0, done: "Delivered to a moved goal, and home. The mission survived everything you threw at it." } },
};
