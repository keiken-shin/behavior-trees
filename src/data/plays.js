/* What each chapter's playground shows. Pure data: which world, which scenario,
   the starting tree in the text form, the variants and switches offered, the
   hazards shown, whether the editor is open, and the goal that marks the
   chapter's "make it happen" step. Filled in by the chapter tasks. */
import { DRONE } from "../world/drone.js";
export const WORLDS = { drone: DRONE };
export const PLAYS = {};
export const hasPlay = (id) => Object.hasOwn(PLAYS, id);

const near = (s, p, r = 3) => Math.hypot(s.x - p.x, s.y - p.y) <= r;

PLAYS["tick/one-action"] = {
  world: "drone", scenario: "delivery", hazards: [],
  brief: "One action under the root. Step it and watch the count. Then play it.",
  tree: "FlyTo A",
  goal: { test: (s) => near(s, s.waypoints.A), done: "The action finally answered Success." },
};
PLAYS["answers/two-steps"] = {
  world: "drone", scenario: "delivery", hazards: [],
  brief: "Two actions in a row. Step it one tick at a time and read each answer.",
  tree: "-> trip {memory}\n  FlyTo A\n  Land",
  goal: { test: (s) => s.landed && near(s, s.waypoints.A), done: "Landed at A. Both answered Success, in order." },
};
PLAYS["sequence/todo"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12"],
  brief: "A to do list. Drop the battery while it flies and watch where the list restarts.",
  tree: "-> deliver\n  BatteryAbove 30\n  TakeOff\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
  variants: [
    { label: "reactive (textbook Sequence)", tree: "-> deliver\n  BatteryAbove 30\n  TakeOff\n  FlyTo A\n  Drop\n  ReturnHome\n  Land" },
    { label: "memory (Sequence*)", tree: "-> deliver {memory}\n  BatteryAbove 30\n  TakeOff\n  FlyTo A\n  Drop\n  ReturnHome\n  Land" },
  ],
  goal: { test: (s, h) => h.some((x) => x.status === "Failure"), done: "The whole list answered Failure because one item did." },
};
PLAYS["fallback/plan-b"] = {
  world: "drone", scenario: "delivery", hazards: [],
  brief: "Plan A is to charge. It fails away from home, so plan B flies home. Count how often plan A is asked.",
  tree: "? get power\n  Charge\n  ReturnHome",
  variants: [
    { label: "reactive", tree: "? get power\n  Charge\n  ReturnHome" },
    { label: "memory", tree: "? get power {memory}\n  Charge\n  ReturnHome" },
  ],
  start: (s) => { s.landed = false; s.x = 120; s.y = 60; s.battery = 40; },
  goal: { test: (s) => s.charging || s.battery >= 100, done: "Plan A finally succeeded, because it was asked again." },
};
PLAYS["condition/dirty"] = {
  world: "drone", scenario: "delivery", hazards: [],
  brief: "One of these conditions cheats: it nudges the drone while answering. The trace marks it.",
  tree: "-> peek\n  NudgedNorth\n  FlyTo A",
  extraLeaves: {
    NudgedNorth: { kind: "condition", doc: "a condition that CHANGES the world; here to be caught",
      tick: (s) => { s.y -= 0.5; s.mutations++; return "Success"; } },
  },
  goal: { test: (s, h) => h.some((x) => x.trace.some((n) => n.dirty)), done: "Caught. A condition changed the world and the tree said so." },
};
PLAYS["reactive/preempt"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12"],
  brief: "Safety first, delivery second. Drop the battery mid flight and watch the delivery get cut.",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  goal: { test: (s, h) => h.some((x) => x.battery < 30) && s.charging, done: "The delivery was halted mid flight and the drone is charging at home." },
};
