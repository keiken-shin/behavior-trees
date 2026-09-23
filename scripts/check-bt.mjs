#!/usr/bin/env node
/* The interpreter against the textbook. Algorithms 1 to 3 of Colledanchise and
   Ogren (arXiv 1709.00084), the three composite modes, the decorators, halting,
   and condition purity. Run with `npm run check`. */
import assert from "node:assert/strict";
import { S, build, tick, reset, makeBlackboard } from "../src/bt/tree.js";

let failed = 0, passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log(`  pass  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

/* A leaf that answers from a script, then repeats its last answer. Records how
   many times it was ticked and whether it was halted. */
const scripted = (kind, answers) => {
  const leaf = { kind, ticks: 0, halts: 0,
    tick() { const a = answers[Math.min(leaf.ticks, answers.length - 1)]; leaf.ticks++; return a; },
    halt() { leaf.halts++; } };
  return leaf;
};
const world = () => ({ mutations: 0 });
const A = (leaf, args = []) => ({ kind: "Action", leaf, args });
const C = (leaf) => ({ kind: "Condition", leaf });
const SEQ = (children, mode) => ({ kind: "Sequence", mode, children });
const FB = (children, mode) => ({ kind: "Fallback", mode, children });
const PAR = (m, children) => ({ kind: "Parallel", m, children });
const DEC = (type, n, child) => ({ kind: "Decorator", dec: { type, n }, children: [child] });
const run = (spec, leaves, n = 1, w = world()) => {
  const tree = build(spec, leaves), bb = makeBlackboard();
  let out;
  for (let i = 0; i < n; i++) out = tick(tree, w, bb);
  return { tree, out, w, bb };
};

/* ── Algorithm 1: Sequence ─────────────────────────────────────────────── */
for (const [a, b, want, visits] of [
  [S.SUCCESS, S.SUCCESS, S.SUCCESS, 2], [S.SUCCESS, S.FAILURE, S.FAILURE, 2],
  [S.FAILURE, S.SUCCESS, S.FAILURE, 1], [S.RUNNING, S.SUCCESS, S.RUNNING, 1],
  [S.SUCCESS, S.RUNNING, S.RUNNING, 2],
]) t(`Sequence(${a},${b}) -> ${want}, ${visits} visited`, () => {
  const L = { a: scripted("action", [a]), b: scripted("action", [b]) };
  const { out } = run(SEQ([A("a"), A("b")]), L);
  assert.equal(out.status, want);
  assert.equal(out.trace.length - 1, visits);
});

/* ── Algorithm 2: Fallback ─────────────────────────────────────────────── */
for (const [a, b, want, visits] of [
  [S.FAILURE, S.FAILURE, S.FAILURE, 2], [S.FAILURE, S.SUCCESS, S.SUCCESS, 2],
  [S.SUCCESS, S.FAILURE, S.SUCCESS, 1], [S.RUNNING, S.FAILURE, S.RUNNING, 1],
  [S.FAILURE, S.RUNNING, S.RUNNING, 2],
]) t(`Fallback(${a},${b}) -> ${want}, ${visits} visited`, () => {
  const L = { a: scripted("action", [a]), b: scripted("action", [b]) };
  const { out } = run(FB([A("a"), A("b")]), L);
  assert.equal(out.status, want);
  assert.equal(out.trace.length - 1, visits);
});

/* ── Algorithm 3: Parallel, M of N ─────────────────────────────────────── */
for (const [m, answers, want] of [
  [2, [S.SUCCESS, S.SUCCESS, S.RUNNING], S.SUCCESS],
  [2, [S.SUCCESS, S.FAILURE, S.RUNNING], S.RUNNING],
  [2, [S.FAILURE, S.FAILURE, S.SUCCESS], S.FAILURE],
  [3, [S.SUCCESS, S.SUCCESS, S.RUNNING], S.RUNNING],
  [1, [S.FAILURE, S.RUNNING, S.FAILURE], S.RUNNING],
  [1, [S.FAILURE, S.FAILURE, S.FAILURE], S.FAILURE],
]) t(`Parallel M=${m} over (${answers.join(",")}) -> ${want}`, () => {
  const L = Object.fromEntries(answers.map((a, i) => [`l${i}`, scripted("action", [a])]));
  const { out } = run(PAR(m, answers.map((_, i) => A(`l${i}`))), L);
  assert.equal(out.status, want);
  assert.equal(out.trace.length - 1, 3, "Parallel ticks every child");
});

/* ── modes: what the tick after Running does ───────────────────────────── */
const twoTick = (mode) => {
  const L = { c: scripted("condition", [S.SUCCESS]), a: scripted("action", [S.RUNNING, S.RUNNING, S.SUCCESS]) };
  const r = run(SEQ([C("c"), A("a")], mode), L, 2);
  return { ...r, L };
};
t("reactive: earlier condition re-ticked while a child is Running", () => {
  const { L } = twoTick("reactive"); assert.equal(L.c.ticks, 2);
});
t("memory: earlier condition NOT re-ticked while a child is Running", () => {
  const { L } = twoTick("memory"); assert.equal(L.c.ticks, 1);
});
t("keep: earlier condition NOT re-ticked while a child is Running", () => {
  const { L } = twoTick("keep"); assert.equal(L.c.ticks, 1);
});
t("reactive: a condition that flips preempts the Running child, which is halted", () => {
  const L = { c: scripted("condition", [S.SUCCESS, S.FAILURE]), a: scripted("action", [S.RUNNING]) };
  const { out } = run(SEQ([C("c"), A("a")], "reactive"), L, 2);
  assert.equal(out.status, S.FAILURE);
  assert.equal(L.a.ticks, 1);
  assert.equal(L.a.halts, 1, "the running action must be halted the tick it stops being visited");
});
t("memory: the flipped condition is not seen, the action runs on", () => {
  const L = { c: scripted("condition", [S.SUCCESS, S.FAILURE]), a: scripted("action", [S.RUNNING]) };
  const { out } = run(SEQ([C("c"), A("a")], "memory"), L, 2);
  assert.equal(out.status, S.RUNNING);
  assert.equal(L.a.ticks, 2);
  assert.equal(L.a.halts, 0);
});
t("memory: cleared when the parent returns Failure, so the first child is re-ticked", () => {
  const L = { a: scripted("action", [S.SUCCESS]), b: scripted("action", [S.FAILURE]) };
  const { out } = run(SEQ([A("a"), A("b")], "memory"), L, 2);
  assert.equal(out.status, S.FAILURE);
  assert.equal(L.a.ticks, 2);
});
t("keep: memory kept across Failure, the succeeded child is skipped (BT.CPP patrol example)", () => {
  const L = { a: scripted("action", [S.SUCCESS]), b: scripted("action", [S.FAILURE, S.SUCCESS]) };
  const { out } = run(SEQ([A("a"), A("b")], "keep"), L, 2);
  assert.equal(out.status, S.SUCCESS);
  assert.equal(L.a.ticks, 1, "GoTo(A) will not be ticked again");
  assert.equal(L.b.ticks, 2);
});
t("keep: memory cleared when the parent returns Success", () => {
  const L = { a: scripted("action", [S.SUCCESS]), b: scripted("action", [S.SUCCESS]) };
  const { out } = run(SEQ([A("a"), A("b")], "keep"), L, 2);
  assert.equal(out.status, S.SUCCESS);
  assert.equal(L.a.ticks, 2);
});
/* The one mode this course invents beyond the published dialects, and the half of
   it no library ships. `stop` is Success for a Fallback, so keep holds its memory
   across a Success there exactly as it holds it across a Failure on a Sequence. */
t("keep on a Fallback: memory kept across Success, the failed plan A is not re-asked", () => {
  const L = { a: scripted("action", [S.FAILURE]), b: scripted("action", [S.SUCCESS]) };
  const { out } = run(FB([A("a"), A("b")], "keep"), L, 2);
  assert.equal(out.status, S.SUCCESS);
  assert.equal(L.a.ticks, 1, "plan A failed on tick 1 and must not be asked again");
  assert.equal(L.b.ticks, 2, "the walk resumes at the child that ended it");
});
t("Fallback memory, for contrast: the same two plans restart from plan A", () => {
  const L = { a: scripted("action", [S.FAILURE]), b: scripted("action", [S.SUCCESS]) };
  run(FB([A("a"), A("b")], "memory"), L, 2);
  assert.equal(L.a.ticks, 2);
});
t("Fallback memory: a failed plan A is not re-asked while plan B is Running", () => {
  const L = { a: scripted("action", [S.FAILURE]), b: scripted("action", [S.RUNNING, S.SUCCESS]) };
  run(FB([A("a"), A("b")], "memory"), L, 2);
  assert.equal(L.a.ticks, 1);
});
t("Fallback reactive: plan A is re-asked every tick", () => {
  const L = { a: scripted("action", [S.FAILURE]), b: scripted("action", [S.RUNNING, S.SUCCESS]) };
  run(FB([A("a"), A("b")], "reactive"), L, 2);
  assert.equal(L.a.ticks, 2);
});

/* ── decorators ────────────────────────────────────────────────────────── */
t("Inverter swaps Success and Failure, passes Running", () => {
  for (const [inn, want] of [[S.SUCCESS, S.FAILURE], [S.FAILURE, S.SUCCESS], [S.RUNNING, S.RUNNING]]) {
    const { out } = run(DEC("Inverter", 0, A("a")), { a: scripted("action", [inn]) });
    assert.equal(out.status, want);
  }
});
t("Retry 3: Running on the first two failures, Failure on the third", () => {
  const L = { a: scripted("action", [S.FAILURE]) };
  const tree = build(DEC("Retry", 3, A("a")), L), bb = makeBlackboard(), w = world();
  assert.equal(tick(tree, w, bb).status, S.RUNNING);
  assert.equal(tick(tree, w, bb).status, S.RUNNING);
  assert.equal(tick(tree, w, bb).status, S.FAILURE);
  assert.equal(L.a.ticks, 3);
});
t("Timeout 2: a child Running for a third tick is halted and Failure returned", () => {
  const L = { a: scripted("action", [S.RUNNING]) };
  const tree = build(DEC("Timeout", 2, A("a")), L), bb = makeBlackboard(), w = world();
  assert.equal(tick(tree, w, bb).status, S.RUNNING);
  assert.equal(tick(tree, w, bb).status, S.RUNNING);
  assert.equal(tick(tree, w, bb).status, S.FAILURE);
  assert.equal(L.a.halts, 1);
});
t("Timeout: a child halted inside the tick is marked halted in the trace; a plain Running child is not", () => {
  const L = { a: scripted("action", [S.RUNNING]) };
  const tree = build(DEC("Timeout", 1, A("a")), L), bb = makeBlackboard(), w = world();
  const child = tree.root.children[0].id;
  const first = tick(tree, w, bb).trace.find((e) => e.id === child);
  assert.equal(first.status, S.RUNNING);
  assert.equal("halted" in first, false);
  const fired = tick(tree, w, bb).trace.find((e) => e.id === child);
  assert.equal(fired.status, S.RUNNING);
  assert.equal(fired.halted, true);
});
t("Repeat 2: Running after the first Success, Success after the second", () => {
  const L = { a: scripted("action", [S.SUCCESS]) };
  const tree = build(DEC("Repeat", 2, A("a")), L), bb = makeBlackboard(), w = world();
  assert.equal(tick(tree, w, bb).status, S.RUNNING);
  assert.equal(tick(tree, w, bb).status, S.SUCCESS);
});
t("a decorator ticks its child at most once per tick", () => {
  const L = { a: scripted("action", [S.FAILURE]) };
  run(DEC("Retry", 5, A("a")), L, 1);
  assert.equal(L.a.ticks, 1);
});

/* ── halting ───────────────────────────────────────────────────────────── */
t("a Running branch no longer visited is halted, leaves included", () => {
  const L = { hi: scripted("condition", [S.FAILURE, S.SUCCESS]), safe: scripted("action", [S.RUNNING]),
    go: scripted("action", [S.RUNNING]) };
  const spec = FB([SEQ([C("hi"), A("safe")]), A("go")]);
  const { out, tree } = run(spec, L, 2);
  assert.equal(out.status, S.RUNNING);
  assert.equal(L.go.halts, 1);
  const goNode = tree.all.find((n) => n.leaf === "go");
  assert.equal(goNode.st.status, S.IDLE);
});
t("reset halts running leaves and zeroes the tick count", () => {
  const L = { a: scripted("action", [S.RUNNING]) };
  const { tree, w } = run(A("a"), L, 3);
  reset(tree, w);
  assert.equal(tree.tickNo, 0);
  assert.equal(L.a.halts, 1);
});

/* ── conditions are pure, and the trace says when they are not ─────────── */
t("a Condition that mutates the world is marked dirty", () => {
  const L = { c: { kind: "condition", tick(w) { w.mutations++; return S.SUCCESS; } } };
  const { out } = run(C("c"), L);
  assert.equal(out.trace[0].dirty, true);
});
t("a Condition that returns Running is an error and reads as Failure", () => {
  const L = { c: { kind: "condition", tick() { return S.RUNNING; } } };
  const { out } = run(C("c"), L);
  assert.equal(out.status, S.FAILURE);
  assert.match(out.trace[0].error, /Running/);
});
t("a leaf that throws reads as Failure with its message, and the tick completes", () => {
  const L = { a: { kind: "action", tick() { throw new Error("boom"); } }, b: scripted("action", [S.SUCCESS]) };
  const { out } = run(FB([A("a"), A("b")]), L);
  assert.equal(out.status, S.SUCCESS);
  assert.equal(out.trace[0].error, "boom");
});
t("build rejects an unknown leaf and a leaf of the wrong kind", () => {
  assert.throws(() => build(A("nope"), {}), /unknown leaf/);
  assert.throws(() => build(C("a"), { a: scripted("action", [S.SUCCESS]) }), /is an action, not a condition/);
});
t("build rejects an unknown node kind", () => {
  assert.throws(() => build({ kind: "Leaf", leaf: "a", children: [] }, {}), /unknown node kind/);
});

/* ── blackboard log ────────────────────────────────────────────────────── */
t("blackboard writes are logged per tick with who wrote them", () => {
  const L = { a: { kind: "action", tick(w, bb, args, node) { bb.set("k", 1, node.id); return S.SUCCESS; } } };
  const { bb } = run(A("a"), L);
  assert.deepEqual(bb.log, [{ tick: 1, node: "n0", key: "k", from: undefined, to: 1 }]);
});

/* ── the textbook's pick and place walk through, section 1.3.1 ─────────
   Figure 1.1: Fallback( Sequence( BallFound?, ... ) ) is drawn in the book with
   these leaves. We script the world: tick 1 the ball is on the floor, tick 3
   it is in the hand, tick 5 somebody takes it away again. */
t("pick and place: the tree re-plans when the ball moves while the gripper closes", () => {
  const w = { mutations: 0, placed: false, inHand: false, near: false, found: true, gripping: 0 };
  const cond = (f) => ({ kind: "condition", tick(w) { return f(w) ? S.SUCCESS : S.FAILURE; } });
  const act = (f) => ({ kind: "action", tick(w) { return f(w); } });
  const L = {
    placed: cond((w) => w.placed), inHand: cond((w) => w.inHand), near: cond((w) => w.near),
    found: cond((w) => w.found),
    place: act((w) => { w.placed = true; return S.SUCCESS; }),
    /* Two ticks to close the gripper. Halting it opens it again, which is the
       leaf side of preemption and the reason tick 4 below is Running, not Success. */
    grasp: { kind: "action",
      tick(w) { if (++w.gripping < 2) return S.RUNNING; w.inHand = true; return S.SUCCESS; },
      halt(w) { w.gripping = 0; } },
    approach: act((w) => { w.near = true; return S.RUNNING; }),
  };
  const spec = FB([C("placed"), SEQ([
    FB([C("inHand"), SEQ([FB([C("near"), SEQ([C("found"), A("approach")])]), A("grasp")])]),
    A("place")])]);
  const tree = build(spec, L), bb = makeBlackboard();
  const seq = [];
  for (let i = 1; i <= 5; i++) {
    if (i === 3) w.near = false;                // the ball is moved while the gripper closes
    seq.push(tick(tree, w, bb).status);
  }
  assert.deepEqual(seq, [S.RUNNING, S.RUNNING, S.RUNNING, S.RUNNING, S.SUCCESS]);
});

/* ── the text form ─────────────────────────────────────────────────────── */
import { parse, format, ParseError } from "../src/bt/parse.js";
const LEAVES = {
  BatteryBelow: { kind: "condition" }, ReturnHome: { kind: "action" },
  FlyTo: { kind: "action" }, Land: { kind: "action" }, Charge: { kind: "action" },
};
const SAMPLE = [
  "? root",
  "  -> low battery {memory}",
  "    BatteryBelow 30",
  "    ReturnHome",
  "  -> deliver",
  "    FlyTo A",
  "    Land",
].join("\n");
t("parse: the sample tree has the right shape", () => {
  const s = parse(SAMPLE, LEAVES);
  assert.equal(s.kind, "Fallback"); assert.equal(s.name, "root");
  assert.equal(s.children.length, 2);
  assert.deepEqual([s.children[0].kind, s.children[0].name, s.children[0].mode], ["Sequence", "low battery", "memory"]);
  assert.deepEqual(s.children[0].children[0], { kind: "Condition", leaf: "BatteryBelow", args: ["30"], children: [] });
  assert.deepEqual(s.children[1].children[0], { kind: "Action", leaf: "FlyTo", args: ["A"], children: [] });
});
t("parse: parallel threshold, decorators, comments and blank lines", () => {
  const s = parse("=> 2 both\n\n  # a comment\n  retry 3\n    Charge\n  timeout 50\n    FlyTo A\n  !\n    BatteryBelow 20", LEAVES);
  assert.equal(s.kind, "Parallel"); assert.equal(s.m, 2); assert.equal(s.name, "both");
  assert.deepEqual(s.children.map((c) => c.dec), [{ type: "Retry", n: 3 }, { type: "Timeout", n: 50 }, { type: "Inverter", n: 0 }]);
  assert.equal(s.children[0].children[0].leaf, "Charge");
});
t("format round trips the sample", () => {
  assert.equal(format(parse(SAMPLE, LEAVES)), SAMPLE);
});
for (const [text, line, re] of [
  ["? root\n  Nope 1", 2, /unknown leaf "Nope"/],
  ["? root\n   FlyTo A", 2, /indent/],
  ["-> a\n  retry 2\n    FlyTo A\n    Land", 4, /exactly one child/],
  ["-> a\n  !", 2, /exactly one child/],
  ["-> empty", 1, /no child/],
  ["-> a\n  FlyTo A\n    Land", 3, /leaf cannot have children/],
  ["-> a {sideways}\n  Land", 1, /mode/],
  ["=> 2 both {memory}\n  Land\n  Charge", 1, /a mode only belongs on -> or \?/],
  ["retry 2 {memory}\n  Land", 1, /a mode only belongs on -> or \?/],
  ["FlyTo A\n  Land", 2, /leaf cannot have children/],
]) t(`parse error at line ${line}: ${re}`, () => {
  assert.throws(() => parse(text, LEAVES), (e) => e instanceof ParseError && e.line === line && re.test(e.message));
});

/* ── layout ────────────────────────────────────────────────────────────── */
import { layout, labelOf } from "../src/bt/layout.js";
t("layout: ids match build's pre-order numbering", () => {
  const s = parse(SAMPLE, LEAVES);
  const { nodes } = layout(s);
  const tree = build(s, Object.fromEntries(Object.entries(LEAVES).map(([k, v]) => [k, { ...v, tick: () => S.SUCCESS }])));
  assert.deepEqual(nodes.map((n) => n.id), tree.all.slice().sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))).map((n) => n.id));
});
t("layout: a parent sits centred over its children, siblings do not overlap", () => {
  const { nodes, edges } = layout(parse(SAMPLE, LEAVES));
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const root = by.n0, a = by.n1, b = by.n4;
  assert.ok(Math.abs(root.x - (a.x + b.x) / 2) < 0.01);
  assert.ok(a.x + a.w / 2 < b.x - b.w / 2);
  assert.equal(edges.length, nodes.length - 1);
  assert.ok(root.y < a.y && a.y < by.n2.y);
});
t("layout: a node takes its own label's width, between the floor and the ceiling", () => {
  const { nodes } = layout(parse("? root\n  BatteryBelow 30\n  Land", LEAVES), { minW: 56, maxW: 200, fs: 12 });
  const by = Object.fromEntries(nodes.map((n) => [n.label, n.w]));
  assert.ok(by["BatteryBelow 30"] > by["Land"], "a long label gets a wider node than a short one");
  assert.equal(by["Land"], 56, "a short label sits on the floor");
  assert.ok(0.6 * 12 * "BatteryBelow 30".length <= 0.82 * by["BatteryBelow 30"], "the ellipse holds its label");
  const capped = layout(parse("? root\n  BatteryBelow 30", LEAVES), { maxW: 80 }).nodes.find((n) => n.kind === "Condition");
  assert.equal(capped.w, 80, "the ceiling holds");
});
t("labelOf names a node by its name, else its symbol or leaf", () => {
  assert.equal(labelOf({ kind: "Fallback", name: "root" }), "? root");
  assert.equal(labelOf({ kind: "Sequence" }), "->");
  assert.equal(labelOf({ kind: "Action", leaf: "FlyTo", args: ["A"] }), "FlyTo A");
  assert.equal(labelOf({ kind: "Decorator", dec: { type: "Retry", n: 3 } }), "retry 3");
  assert.equal(labelOf({ kind: "Parallel", m: 2 }), "=> 2");
});

console.log(failed ? `\n${failed} interpreter check(s) FAILED` : `\ninterpreter: ${passed} checks pass`);
process.exit(failed ? 1 : 0);
