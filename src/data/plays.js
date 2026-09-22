/* What each chapter's playground shows. Pure data: which world, which scenario,
   the starting tree in the text form, the variants and switches offered, the
   hazards shown, whether the editor is open, and the goal that marks the
   chapter's "make it happen" step. Filled in by the chapter tasks. */
import { DRONE } from "../world/drone.js";
import { build } from "../bt/tree.js";
import { parse } from "../bt/parse.js";
import { switchCount } from "../bt/run.js";
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
const PREEMPT = "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land";
PLAYS["memory/modes"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12", "gust", "calm"], modes: true,
  brief: "Same tree, three modes on the root. Drop the battery in each. Then try the patrol with a gust.",
  tree: PREEMPT,
  variants: [
    { label: "safety tree, root reactive", tree: PREEMPT },
    { label: "safety tree, root memory", tree: PREEMPT.replace("? root", "? root {memory}") },
    { label: "patrol A then B, reactive", tree: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land" },
    { label: "patrol A then B, memory", tree: "-> patrol {memory}\n  FlyTo A\n  FlyTo B\n  Land" },
  ],
  goal: { test: (s) => s.dead, done: "The drone died with the check skipped. That is what memory costs. Now flip it back." },
};
PLAYS["decorators/kinds"] = {
  world: "drone", scenario: "delivery", hazards: ["gust", "calm"],
  brief: "A retry around Charge, a timeout around the flight home. Add a gust and watch the timeout fire.",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    timeout 200\n      ReturnHome\n    Land",
  /* n9 is the timeout node in pre-order: root n0, low battery n1..n5, deliver n6, FlyTo n7, Drop n8, timeout n9, ReturnHome n10, Land n11. */
  goal: { test: (s, h) => h.some((x) => x.trace.some((n) => n.status === "Failure" && n.id === "n9")), done: "The timeout gave up on the flight. The Sequence failed, and the tree is asked again." },
};
PLAYS["parallel/race"] = {
  world: "drone", scenario: "delivery", hazards: [],
  brief: "Two children under a Parallel both write the same blackboard key each tick. Read the log.",
  tree: "=> 2 both\n  SetMode fast\n  SetMode slow",
  extraLeaves: {
    SetMode: { kind: "action", doc: "writes its argument to the blackboard key mode",
      tick: (s, bb, [v], node) => { bb.set("mode", v, node.id); return "Success"; } },
  },
  goal: { test: (s, h) => h.length >= 3, done: "Three ticks, six writes, and the last writer wins every time. That is a race." },
};
PLAYS["blackboard/goal"] = {
  world: "drone", scenario: "delivery", hazards: ["goalB"],
  brief: "One tree types the waypoint in. The other reads the goal from the blackboard. Move the goal.",
  tree: "-> deliver {memory}\n  FlyTo Goal\n  Drop\n  ReturnHome\n  Land",
  variants: [
    { label: "reads the goal", tree: "-> deliver {memory}\n  FlyTo Goal\n  Drop\n  ReturnHome\n  Land" },
    { label: "typed the waypoint", tree: "-> deliver {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land" },
  ],
  goal: { test: (s) => s.delivered && s.goalMoves > 0, done: "Delivered to the moved goal, because the tree read it instead of remembering it." },
};
/* Read off the built tree rather than typed in: hardcoding n1 and n5 made the
   goal agree with the counter on screen only by luck, and silently stop agreeing
   the moment anyone edited the text above. */
const rootKids = (text) => build(parse(text, DRONE.leaves), DRONE.leaves).root.children.map((c) => c.id);
const PREEMPT_KIDS = rootKids(PREEMPT);
PLAYS["fsm/transitions"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12"], counter: true,
  brief: "The chapter 6 tree again, with a counter of how many times control moved between branches.",
  tree: PREEMPT,
  goal: { test: (s, h) => switchCount(h, PREEMPT_KIDS) >= 3, done: "Three switches. Every one would be a drawn transition in a state machine. This tree keeps switching at the 30 percent line: charging lifts the battery above it, the flight drops it back below." },
};
PLAYS["design/mission"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12", "gust", "calm", "nofly", "goalB"], editor: true,
  brief: "The whole mission, every hazard, and the editor open. Break it, then fix it.",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo Goal\n    Drop\n    ReturnHome\n    Land",
  goal: { test: (s) => s.delivered && s.landed && s.goalMoves > 0, done: "Delivered to a moved goal, and home. The mission survived everything you threw at it." },
};
