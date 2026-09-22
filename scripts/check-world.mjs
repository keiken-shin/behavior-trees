#!/usr/bin/env node
/* The drone world and the headless runner. Kinematics, every leaf, every
   hazard, and the two facts the checkride depends on: a reactive tree returns
   home on a battery drop and a memory tree does not. */
import assert from "node:assert/strict";
import { S } from "../src/bt/tree.js";
import { DRONE, DT, SPEED, ARRIVE, DRAIN } from "../src/world/drone.js";
import { run } from "../src/bt/run.js";

let failed = 0, passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log(`  pass  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

t("init: the drone starts landed at home with a full battery", () => {
  const s = DRONE.init("delivery");
  assert.equal(s.landed, true); assert.equal(s.battery, 100);
  assert.deepEqual([s.x, s.y], [s.home.x, s.home.y]);
  assert.ok(s.waypoints.A && s.waypoints.B && s.waypoints.C);
  assert.equal(s.goal, "A");
});
t("step: heading turns toward the target at the turn rate, then it moves at SPEED", () => {
  const s = DRONE.init("delivery");
  s.landed = false; s.heading = 180; s.target = { x: s.x, y: s.y - 100 };   // target due north, drone facing south
  DRONE.step(s, DT);
  assert.ok(Math.abs(s.heading - 180) > 0 && Math.abs(s.heading - 180) <= 12.01, "turns at most TURN_RATE*DT per tick");
  s.heading = 0;                                   // now pointed at it
  const before = { x: s.x, y: s.y };
  for (let i = 0; i < 20; i++) DRONE.step(s, DT);
  assert.ok(Math.abs(dist(before, s) - 20 * SPEED * DT) < 1e-6, "moves SPEED*DT per tick when pointed at the target");
  assert.ok(s.y < before.y, "and it went north");
});
t("step: wind adds drift, battery drains while airborne, not while landed", () => {
  const s = DRONE.init("delivery");
  s.landed = false; s.wind = { x: 4, y: 0 }; s.target = null;
  const x0 = s.x, b0 = s.battery;
  for (let i = 0; i < 10; i++) DRONE.step(s, DT);
  assert.ok(Math.abs((s.x - x0) - 4 * 10 * DT) < 1e-6, "drift is wind times time");
  assert.ok(Math.abs((b0 - s.battery) - DRAIN * 10 * DT) < 1e-6);
  const l = DRONE.init("delivery"); const lb = l.battery;
  for (let i = 0; i < 10; i++) DRONE.step(l, DT);
  assert.equal(l.battery, lb);
});
t("step: an empty battery kills the drone and it stops moving", () => {
  const s = DRONE.init("delivery"); s.landed = false; s.battery = 0.01; s.target = { x: 100, y: 100 };
  for (let i = 0; i < 5; i++) DRONE.step(s, DT);
  assert.equal(s.dead, true);
  const { x, y } = s; DRONE.step(s, DT); assert.deepEqual([s.x, s.y], [x, y]);
});

/* leaves, one line each */
const bb = { data: {}, get() {}, set() {} };
const tickLeaf = (name, s, args = []) => DRONE.leaves[name].tick(s, bb, args, { id: "x" });
t("conditions answer without mutating", () => {
  const s = DRONE.init("delivery"); const m = s.mutations;
  assert.equal(tickLeaf("BatteryBelow", s, ["30"]), S.FAILURE);
  assert.equal(tickLeaf("BatteryAbove", s, ["30"]), S.SUCCESS);
  assert.equal(tickLeaf("AtHome", s), S.SUCCESS);
  assert.equal(tickLeaf("AtWaypoint", s, ["A"]), S.FAILURE);
  assert.equal(tickLeaf("InNoFly", s), S.FAILURE);
  assert.equal(tickLeaf("GoalIs", s, ["A"]), S.SUCCESS);
  assert.equal(tickLeaf("WindAbove", s, ["1"]), S.FAILURE);
  assert.equal(tickLeaf("Landed", s), S.SUCCESS);
  assert.equal(s.mutations, m, "no condition may bump the mutation counter");
  for (const [n, l] of Object.entries(DRONE.leaves)) assert.ok(l.doc, `${n} has a one line doc`);
});
t("FlyTo: takes off if landed, is Running until within ARRIVE, then Success; halt clears the target", () => {
  const s = DRONE.init("delivery");
  assert.equal(tickLeaf("FlyTo", s, ["A"]), S.RUNNING);
  assert.equal(s.landed, false); assert.ok(s.target);
  let n = 0;
  while (tickLeaf("FlyTo", s, ["A"]) === S.RUNNING && n < 5000) { DRONE.step(s, DT); n++; }
  assert.ok(dist(s, s.waypoints.A) <= ARRIVE);
  DRONE.leaves.FlyTo.halt(s); assert.equal(s.target, null);
});
t("FlyTo Goal reads the goal from the world each tick", () => {
  const s = DRONE.init("delivery");
  tickLeaf("FlyTo", s, ["Goal"]); assert.deepEqual(s.target, s.waypoints.A);
  s.goal = "B"; tickLeaf("FlyTo", s, ["Goal"]); assert.deepEqual(s.target, s.waypoints.B);
});
t("FlyTo an unknown waypoint is Failure with an error, not a crash", () => {
  const s = DRONE.init("delivery");
  assert.throws(() => tickLeaf("FlyTo", s, ["Q"]), /no waypoint "Q"/);
});
t("Charge: Failure away from home, Running while filling, Success at 100", () => {
  const s = DRONE.init("delivery"); s.x += 50;
  assert.equal(tickLeaf("Charge", s), S.FAILURE);
  s.x -= 50; s.battery = 99.9;
  assert.equal(tickLeaf("Charge", s), S.RUNNING); DRONE.step(s, DT);
  assert.equal(tickLeaf("Charge", s), S.SUCCESS); assert.equal(s.battery, 100);
});
t("Land and TakeOff and Hover", () => {
  const s = DRONE.init("delivery");
  assert.equal(tickLeaf("TakeOff", s), S.SUCCESS); assert.equal(s.landed, false);
  assert.equal(tickLeaf("Hover", s), S.RUNNING); assert.equal(s.target, null);
  assert.equal(tickLeaf("Land", s), S.SUCCESS); assert.equal(s.landed, true);
});
t("Drop: Success only at the goal waypoint, and it marks the delivery", () => {
  const s = DRONE.init("delivery");
  assert.equal(tickLeaf("Drop", s), S.FAILURE);
  Object.assign(s, s.waypoints.A);
  assert.equal(tickLeaf("Drop", s), S.SUCCESS); assert.equal(s.delivered, true);
});
t("ExitNoFly: Running while inside a zone, Success once outside", () => {
  const s = DRONE.init("delivery"); s.landed = false;
  s.noFly = [{ x: 80, y: 40, w: 50, h: 40 }]; s.x = 100; s.y = 60;
  assert.equal(tickLeaf("InNoFly", s), S.SUCCESS);
  let n = 0;
  while (tickLeaf("ExitNoFly", s) === S.RUNNING && n < 2000) { DRONE.step(s, DT); n++; }
  assert.equal(tickLeaf("InNoFly", s), S.FAILURE);
});
t("hazards: each applies and bumps mutations", () => {
  for (const h of DRONE.hazards) {
    const s = DRONE.init("delivery"); const m = s.mutations;
    h.apply(s); assert.ok(s.mutations > m, `${h.id} must bump mutations`); assert.ok(h.label);
  }
  const s = DRONE.init("delivery");
  DRONE.hazards.find((h) => h.id === "battery12").apply(s); assert.equal(s.battery, 12);
  DRONE.hazards.find((h) => h.id === "goalB").apply(s); assert.equal(s.goal, "B");
  DRONE.hazards.find((h) => h.id === "nofly").apply(s); assert.equal(s.noFly.length, 1);
});
t("draw returns an svg with the craft rotated to its heading", () => {
  const s = DRONE.init("delivery"); s.heading = 37;
  const svg = DRONE.draw(s);
  assert.match(svg, /^<svg/); assert.match(svg, /rotate\(37/);
});

/* the runner, and the fact chapter 6 and checkride item 2 rest on */
/* The chapter 6 tree. The delivery keeps its place ({memory}) because nothing
   about a delivery is undone by an outside event; the root is reactive so the
   battery is re-checked every tick. Land at the end of both, or the drone sits
   in the air at home draining what it has left. */
const TREE = [
  "? root",
  "  -> low battery",
  "    BatteryBelow 30",
  "    ReturnHome",
  "    Land",
  "  -> deliver {memory}",
  "    FlyTo A",
  "    Drop",
  "    ReturnHome",
  "    Land",
].join("\n");
t("run: a reactive tree returns home when the battery drops mid flight", () => {
  const r = run({ world: DRONE, scenario: "delivery", tree: TREE, script: [{ at: 80, hazard: "battery12" }], ticks: 1500 });
  assert.equal(r.state.dead, false);
  assert.ok(r.history.slice(81).some((h) => h.target && h.target.x === r.state.home.x), "ReturnHome was targeted after the drop");
  assert.equal(r.history.length, 1500);
});
t("run: the same tree with memory on the root keeps delivering and dies", () => {
  const r = run({ world: DRONE, scenario: "delivery", tree: TREE.replace("? root", "? root {memory}"), script: [{ at: 80, hazard: "battery12" }], ticks: 1500 });
  assert.equal(r.state.dead, true);
});
t("run: until() stops early and reports passed", () => {
  const r = run({ world: DRONE, scenario: "delivery", tree: TREE, ticks: 5000, until: (s) => s.delivered });
  assert.equal(r.passed, true); assert.ok(r.ticks < 5000);
});

console.log(failed ? `\n${failed} world check(s) FAILED` : `\nworld: ${passed} checks pass`);
process.exit(failed ? 1 : 0);
