# Live Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bench of drawn plates with live scenes that run the real interpreter inline, in one column, exactly where the chapter text names the moment.

**Architecture:** A scene is data (`src/data/scenes.js`): a tree, a world, ordered steps that each run the sim to a tick or a condition and stop with a caption, and an optional unlocked stage that is today's playground configuration. The playground (`src/play/playground.js`) learns to run steps before it unlocks its controls, and its tree view grows into a graph view with pan, zoom, walk-order pulses, a node card and a scrubber (`src/play/graph-view.js`). The chapter page drops the bench and renders `scene` blocks inline. A new check runs every scene's steps headlessly and fails the build if a caption's moment never comes.

**Tech Stack:** Vite 7, vanilla ES modules, SVG. No new dependency.

**Spec:** `docs/superpowers/specs/2026-09-23-live-scenes-design.md` (binding). The first spec `docs/superpowers/specs/2026-09-22-behavior-trees-course-design.md` still holds where the new one is silent.

**Branch:** `feat/live-scenes`, on top of `feat/course-v1`.

## Global Constraints

- Nothing on screen is mimed. Every colour, status, number and caption tick comes from `start()` / `advance()` in `src/bt/run.js` on the real world. A step's caption may name a tick only through the `{t}` placeholder.
- Node ids are pre-order `n0..` from `build()` and `layout()`; the graph keys everything by them.
- Every `myth` and `fact` keeps a `src` present in `content/sources.json`; forum-graded sources back myths only. `scripts/check-content.mjs` enforces it.
- Colour is an answer (`k-ok`, `k-fail`, `k-run`, `k-tick`, `k-ref`, `k-ink`; node classes `st-ok`, `st-fail`, `st-run`, `st-idle`), shape is a kind. No new colour tokens.
- Never write an em dash (U+2014) or an en dash (U+2013). Plain hyphen. Scan every touched file before each commit.
- Commit format `<type>(<scope>): <subject>`. No "Co-Authored-By", no "Generated with", no attribution lines of any kind. One or two commits per task as the task says.
- Only the three font packages at runtime and vite in dev. Port 63601. DT 0.1.
- Never edit anything under `../flight-dynamics`. Never `git add .env`.
- `npm run check` and `npx vite build` pass at the end of every task.
- No `play` block survives; no `fig` block survives except `nav2/tree`, `design/stack`, `design/backchain`.
- Reduced motion: pulses, flashes and step animation are off under `prefers-reduced-motion: reduce`; the sim still steps and colours still change.

## File map

| file | change | owner task |
|---|---|---|
| `src/world/index.js` | new: `WORLDS = { drone: DRONE }` | 1 |
| `src/data/scenes.js` | new: `SCENES`, `sceneConfig()`, `runSteps()` | 1 |
| `scripts/check-scenes.mjs` | new: the scene check | 1 |
| `src/data/plays.js` | deleted | 1 |
| `src/data/exam.js`, `src/ui/checkride.js` | import `WORLDS` from `src/world/index.js` | 1 |
| `src/bt/run.js` | add `walkOrder(trace)` | 2 |
| `scripts/check-world.mjs` | test `walkOrder` | 2 |
| `src/play/graph-view.js` | new, replaces `src/play/tree-view.js` | 2 |
| `src/styles/app.css` | graph, scene and one-column rules | 2, 3, 4 |
| `src/play/playground.js` | steps runner, graph view, scrubber | 3 |
| `src/ui/lesson.js` | one column, `scene` block, inline `fig` | 4 |
| `src/ui/steps.js` | `scene` key | 4 |
| `src/data/lessons.js` | `scene` blocks placed, `fig` and `play` removed | 5 |
| `src/data/diagrams.js` | ten plates removed | 5 |
| `scripts/check-content.mjs` | spine rule | 5 |
| `package.json` | check script | 1 |
| `README.md`, `PRODUCT.md`, `content/visual-grammar.md` | say scenes | 6 |

---

### Task 1: Scenes as data, and the check that runs them

**Files:**
- Create: `src/world/index.js`, `src/data/scenes.js`, `scripts/check-scenes.mjs`
- Modify: `src/data/exam.js:1-10` (import), `src/ui/checkride.js` (import, if it imports `WORLDS`), `package.json` (`check` script)
- Delete: `src/data/plays.js`
- Test: `scripts/check-scenes.mjs`

**Interfaces:**
- Consumes: `start`, `advance`, `switchCount` from `src/bt/run.js`; `parse` from `src/bt/parse.js`; `build` from `src/bt/tree.js`; `DRONE` from `src/world/drone.js`.
- Produces:
  - `WORLDS` from `src/world/index.js`.
  - `SCENES[id] = { world, scenario, tree, extraLeaves?, start?, steps: [{ say, to, hazard?, cap? }], then?: { hazards, variants, modes, editor, counter, goal, brief } }`.
  - `sceneConfig(id) -> cfg` for the playground: `{ world, scenario, tree, extraLeaves, start, steps, ...then }`.
  - `runSteps(scene) -> { sim, stops: [{ i, t, ok }] }`: runs every step headlessly with the same rules the playground uses.
  - `fill(say, t) -> string` replaces `{t}`.
- Later tasks rely on: `stepDone(sim, step)` is the one function that decides a step's stop, shared by the check and the playground (exported from `scenes.js`).

- [ ] **Step 1: Move `WORLDS` out of `plays.js`**

`src/world/index.js`:

```js
/* Every world the course can run. A scene names one by key, so nothing in the
   playground, the graph or the checks imports a world by file. */
import { DRONE } from "./drone.js";
export const WORLDS = { drone: DRONE };
```

In `src/data/exam.js` replace `import { WORLDS } from "./plays.js";` with `import { WORLDS } from "../world/index.js";`. Grep `src/` for `plays.js` and fix every import the same way (the checkride, the playground; the playground is rewritten in Task 3 but must keep building).

- [ ] **Step 2: Write the failing check**

`scripts/check-scenes.mjs`:

```js
#!/usr/bin/env node
/* Every scene's story really happens. Each step is run headlessly with the
   same rules the playground uses, and a step whose moment never comes fails
   the build, so a caption cannot promise a tick the interpreter will not give. */
import assert from "node:assert/strict";
import { SCENES, runSteps, fill, stepDone } from "../src/data/scenes.js";
import { LESSONS } from "../src/data/lessons.js";
import { WORLDS } from "../src/world/index.js";
import { parse } from "../src/bt/parse.js";
import { run } from "../src/bt/run.js";

let failed = 0, passed = 0;
const t = (name, fn) => {
  try { fn(); passed++; console.log(`  pass  ${name}`); }
  catch (e) { failed++; console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

/* ── every scene block resolves, every scene is used ─────────────────────── */
const used = new Set();
for (const les of LESSONS) for (const b of les.flow) if (b.t === "scene") {
  t(`${les.id}: scene "${b.id}" exists`, () => assert.ok(SCENES[b.id], `no SCENES["${b.id}"]`));
  used.add(b.id);
}
t("every scene is placed in a chapter", () => {
  const stray = Object.keys(SCENES).filter((id) => !used.has(id));
  assert.deepEqual(stray, [], `unused scenes: ${stray.join(", ")}`);
});

/* ── trees and variants parse ────────────────────────────────────────────── */
for (const [id, sc] of Object.entries(SCENES)) {
  const leaves = { ...WORLDS[sc.world].leaves, ...(sc.extraLeaves ?? {}) };
  t(`${id}: tree and variants parse`, () => {
    parse(sc.tree, leaves);
    for (const v of sc.then?.variants ?? []) parse(v.tree, leaves);
  });
}

/* ── every step's moment comes ───────────────────────────────────────────── */
for (const [id, sc] of Object.entries(SCENES)) {
  t(`${id}: ${sc.steps.length} step(s) reach their moment`, () => {
    const { stops } = runSteps(sc);
    for (const s of stops) assert.ok(s.ok, `step ${s.i + 1} did not happen within ${sc.steps[s.i].cap ?? 600} ticks (stopped at tick ${s.t})`);
    /* Ticks strictly increase or stay, never go back: a step cannot rewind. */
    for (let i = 1; i < stops.length; i++) assert.ok(stops[i].t >= stops[i - 1].t, "a step rewound the clock");
    const said = stops.map((s) => fill(sc.steps[s.i].say, s.t));
    for (const line of said) assert.ok(line.length > 0 && !/\{t\}/.test(line), "caption left {t} unfilled");
    console.log(stops.map((s) => `          step ${s.i + 1} at tick ${s.t}: ${fill(sc.steps[s.i].say, s.t)}`).join("\n"));
  });
}

/* ── a caption that hard codes a tick is worth a look ────────────────────── */
for (const [id, sc] of Object.entries(SCENES))
  for (const [i, st] of sc.steps.entries())
    if (/\btick \d+\b/.test(st.say)) console.log(`  note  ${id} step ${i + 1} names a tick number in its caption; prefer {t}`);

/* ── the unlocked stage's goal is reachable ──────────────────────────────── */
for (const [id, sc] of Object.entries(SCENES)) {
  if (!sc.then?.goal) continue;
  t(`${id}: the goal can be met`, () => {
    const { sim, stops } = runSteps(sc);
    const world = WORLDS[sc.world];
    const leaves = { ...world.leaves, ...(sc.extraLeaves ?? {}) };
    if (sc.then.goal.test(sim.state, sim.history)) return;
    /* Not met by the story alone: apply each listed hazard once at the tick the
       story ended, on a fresh run, and give it 2500 more ticks. */
    const at = (stops.at(-1)?.t ?? 0) + 1;
    const tries = [[], ...(sc.then.hazards ?? []).map((h) => [{ at, hazard: h }])];
    const reached = tries.some((script) => run({
      world: { ...world, leaves }, scenario: sc.scenario, tree: sc.tree, script,
      ticks: at + 2500, until: (s, h) => { if (h.length === 1) sc.start?.(s); return sc.then.goal.test(s, h); },
    }).passed);
    assert.ok(reached, "no listed hazard makes then.goal.test true within 2500 ticks");
  });
}

/* ── stepDone is the one rule ────────────────────────────────────────────── */
t("stepDone: a number means that tick, a function means a predicate", () => {
  const sim = { t: 3, state: { battery: 12 }, history: [{ t: 3 }] };
  assert.equal(stepDone(sim, { to: 3 }), true);
  assert.equal(stepDone(sim, { to: 4 }), false);
  assert.equal(stepDone(sim, { to: (s) => s.battery < 30 }), true);
});

console.log(failed ? `\n${failed} scene check(s) FAILED` : `\nscenes: every step happens, every goal is reachable (${passed} checks)`);
process.exit(failed ? 1 : 0);
```

Add to `package.json` `check`: `&& node scripts/check-scenes.mjs` after the checkride script.

Run: `node scripts/check-scenes.mjs`
Expected: fails to import `scenes.js`.

- [ ] **Step 3: Write `scenes.js`**

Note on `start`: a scene's `start(state)` runs once after `init`, as the plays did. In `runSteps` it runs right after `start()` from `run.js` builds the sim; in the goal check above it runs on the first history entry because `run()` has no hook, which is one tick late and only matters for goals, never for steps.

`src/data/scenes.js`:

```js
/* Every live scene in the course. Pure data plus two small functions the
   playground and the check share, so the story a reader watches is the story
   the build proved.

   A step runs the sim until `to` is met: a tick number, or a predicate on
   (state, history). `hazard` is applied on the step's first tick through
   advance(), never by a direct call. `say` is the caption, with {t} for the
   tick the step stopped at. `then` is the unlocked stage: the playground's own
   configuration, so the plays of version one live on here unchanged. */
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

/* Headless: the same loop the playground animates. */
export function runSteps(sc) {
  const world = WORLDS[sc.world];
  const W = { ...world, leaves: { ...world.leaves, ...(sc.extraLeaves ?? {}) } };
  const sim = start({ world: W, scenario: sc.scenario, tree: sc.tree });
  sc.start?.(sim.state);
  const stops = [];
  sc.steps.forEach((step, i) => {
    const cap = sim.t + (step.cap ?? 600);
    let first = true, ok = stepDone(sim, step) && typeof step.to !== "number";
    while (!ok && sim.t < cap) {
      const hz = first && step.hazard ? W.hazards.find((h) => h.id === step.hazard) : undefined;
      first = false;
      advance(sim, hz);
      ok = stepDone(sim, step);
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
    { say: "The ellipse answered Success. The rounded box is still flying, so it answered Running.", to: 1 },
    { say: "Hatched. The interpreter counted a change to the world while the ellipse was answering. A condition may only ask.", to: 2 },
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
    { say: "A gust from the west. The flight home fought it for 200 ticks; at tick {t} the timeout halted ReturnHome and answered Failure, so the delivery failed.", hazard: "gust", to: (s, h) => answered(h, "n9", "Failure"), cap: 2500 },
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
    { say: "Charge finished at tick {t}. Two Successes met the threshold, so the Parallel answered Success, and Hover was halted.", to: (s, h) => last(h)?.status === "Success", cap: 400 },
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
    { say: "Both children wrote the key mode this tick. Read the log on the right: the last writer won.", to: 1 },
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
    { say: "The goal moved to B at tick {t}. On the next tick FlyTo read B and turned. Nothing in the tree changed.", hazard: "goalB", to: (s) => s.target && s.target.x === s.waypoints.B.x && s.target.y === s.waypoints.B.y, cap: 10 },
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
```

- [ ] **Step 4: Run the check, and tune what does not happen**

Run: `node scripts/check-scenes.mjs`
Expected: every scene's steps pass, or the output names the step that did not. If a step fails, the story is wrong, not the check: read the printed stop ticks, run the tree by hand with `run()`, and change the predicate or the caption to what the interpreter does. Never raise a cap to hide a step that takes forever; a step that needs more than its cap is the wrong step. Record every change and its reason in the report. The scene check will fail on "scene exists" for every chapter until Task 5 places the blocks; that failure is expected until then and is the only one allowed.

- [ ] **Step 5: Delete `plays.js`, run everything, commit**

`git rm src/data/plays.js`. Grep `src/ scripts/` for `plays.js` and `PLAYS`: `steps.js` and `lesson.js` still import them until Task 4, so for now change those two imports to `SCENES` from `../data/scenes.js` and the one use in `steps.js` to `b.t === "scene" && SCENES[b.id]?.then?.goal`, and in `lesson.js` make the `play` case a no-op that logs (Task 4 rewrites it). `check-content.mjs` imports `PLAYS`: change it to `SCENES` and make its play rule count `scene` blocks instead (Task 5 rewrites the spine rule). The build must pass.

```bash
npm run check; npx vite build
git add -A
git commit -m "feat(scenes): every chapter's story as data, and a check that runs it"
```

---

### Task 2: The graph view

**Files:**
- Create: `src/play/graph-view.js`
- Delete: `src/play/tree-view.js` (after Task 3 switches the playground over; in this task leave it in place)
- Modify: `src/bt/run.js` (add `walkOrder`), `scripts/check-world.mjs` (test it), `src/styles/app.css` (graph rules)
- Test: `scripts/check-world.mjs`

**Interfaces:**
- Consumes: `layout` from `src/bt/layout.js`; `node`, `edge`, `esc` from `src/data/svg.js`; the built tree from `build()` (`tree.all` is the node list; each node carries `id, kind, name, leaf, args, mode, children, st` where `st.idx` is the memory mark; confirm the field names in `src/bt/tree.js` before use).
- Produces:
  - `walkOrder(trace) -> string[]` in `run.js`: the visited node ids in the order the tick walked them.
  - `graphView(host) -> { render(spec, bt), paint(entry, prev), replay(history, i), fit(), destroy() }` where `entry` is one history entry `{ t, status, trace }`.

- [ ] **Step 1: `walkOrder`, test first**

Append to `scripts/check-world.mjs` before the final summary lines:

```js
t("walkOrder: the tick walks in pre-order, so visited ids sort by number", () => {
  const trace = [{ id: "n2" }, { id: "n1" }, { id: "n5" }, { id: "n4" }, { id: "n0" }];   // post-order, as tick() records
  assert.deepEqual(walkOrder(trace), ["n0", "n1", "n2", "n4", "n5"]);
});
```

Add `walkOrder` to the import from `../src/bt/run.js` at the top of that file. Run it: fails with "walkOrder is not a function".

In `src/bt/run.js`:

```js
/* The order the tick walked the nodes it visited. tick() records post-order,
   but ids are pre-order and a tick is a depth first walk over the visited
   subtree, so the numeric order of the visited ids is the walk order. */
export const walkOrder = (trace) =>
  trace.map((e) => e.id).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
```

Run: `node scripts/check-world.mjs` passes, 20 checks.

- [ ] **Step 2: The graph view**

`src/play/graph-view.js`:

```js
/* The tree as a live graph. Layout comes from layout.js and shapes from svg.js,
   so it is the plate primitives made live: nodes take the interpreter's answer
   as a class, edges pulse in the order the tick walked, a node that was Running
   and is not visited flashes once (the halt), and a click opens a card that
   reads from the trace and the built tree, nothing else. Pan by drag, zoom by
   wheel or the buttons, fit to reset. */
import { layout } from "../bt/layout.js";
import { node, edge, esc } from "../data/svg.js";
import { walkOrder } from "../bt/run.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };
const OPTS = { nodeW: 104, nodeH: 34, hGap: 8, vGap: 44 };
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

export function graphView(host) {
  host.innerHTML =
    `<div class="gv">` +
      `<div class="gv__stage"></div>` +
      `<div class="gv__tools">` +
        `<button type="button" class="gv__fit" title="fit the whole tree">fit</button>` +
        `<button type="button" class="gv__in" aria-label="zoom in">+</button>` +
        `<button type="button" class="gv__out" aria-label="zoom out">-</button>` +
      `</div>` +
      `<div class="gv__card" hidden></div>` +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const stage = q(".gv__stage"), card = q(".gv__card");
  let svg = null, byId = new Map(), edgeTo = new Map(), base = null, vb = null;
  let bt = null, lastEntry = null, picked = null, prevRunning = new Set();

  const setVB = () => svg && svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoom = (k, cx, cy) => {
    /* Zoom about a point in viewBox units, clamped so the tree cannot vanish. */
    const w = Math.min(base.w * 4, Math.max(base.w / 4, vb.w * k));
    const h = w * (base.h / base.w);
    const fx = (cx - vb.x) / vb.w, fy = (cy - vb.y) / vb.h;
    vb = { x: cx - fx * w, y: cy - fy * h, w, h };
    setVB();
  };
  const toVB = (ev) => {
    const r = svg.getBoundingClientRect();
    return [vb.x + ((ev.clientX - r.left) / r.width) * vb.w, vb.y + ((ev.clientY - r.top) / r.height) * vb.h];
  };

  function bind() {
    let drag = null;
    svg.addEventListener("pointerdown", (ev) => { drag = { x: ev.clientX, y: ev.clientY, vx: vb.x, vy: vb.y }; svg.setPointerCapture(ev.pointerId); });
    svg.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const r = svg.getBoundingClientRect();
      vb.x = drag.vx - ((ev.clientX - drag.x) / r.width) * vb.w;
      vb.y = drag.vy - ((ev.clientY - drag.y) / r.height) * vb.h;
      setVB();
    });
    const up = (ev) => { if (drag && Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) < 4) pick(ev.target.closest("g[data-id]")?.dataset.id ?? null); drag = null; };
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", () => { drag = null; });
    svg.addEventListener("wheel", (ev) => { ev.preventDefault(); const [cx, cy] = toVB(ev); zoom(ev.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy); }, { passive: false });
    q(".gv__fit").onclick = () => { vb = { ...base }; setVB(); };
    q(".gv__in").onclick = () => zoom(1 / 1.25, vb.x + vb.w / 2, vb.y + vb.h / 2);
    q(".gv__out").onclick = () => zoom(1.25, vb.x + vb.w / 2, vb.y + vb.h / 2);
  }

  function pick(id) {
    picked = id && byId.has(id) ? id : null;
    byId.forEach((g, k) => g.classList.toggle("picked", k === picked));
    showCard();
  }
  function showCard() {
    if (!picked || !bt) { card.hidden = true; return; }
    const n = bt.all.find((x) => x.id === picked);
    const e = lastEntry?.trace.find((x) => x.id === picked);
    const rows = [
      ["kind", n.kind + (n.mode ? ` {${n.mode}}` : "")],
      ["name", n.leaf ?? n.name ?? ""],
      n.args?.length ? ["args", n.args.join(" ")] : null,
      ["answer", e ? e.status : "not asked this tick"],
      e?.dirty ? ["dirty", "changed the world while answering"] : null,
      e?.error ? ["error", e.error] : null,
      n.children?.length && n.st?.idx != null ? ["memory", `resume at child ${n.st.idx + 1}`] : null,
    ].filter(Boolean);
    card.innerHTML = `<button type="button" class="gv__close" aria-label="close">x</button>` +
      `<dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(String(v))}</dd>`).join("")}</dl>`;
    card.hidden = false;
    card.querySelector(".gv__close").onclick = () => pick(null);
  }

  return {
    render(spec, built) {
      bt = built; picked = null; prevRunning = new Set(); lastEntry = null;
      const L = layout(spec, OPTS);
      stage.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" class="figure tree-live" role="img" aria-label="The tree, repainted every tick">` +
        `<defs><pattern id="hatch-live" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
        L.edges.map((e) => edge(e.x1, e.y1, e.x2, e.y2).replace("<line", `<line data-to="${e.to}"`)).join("") +
        L.nodes.map((d) => node(d.kind, d.x, d.y, d.label, { w: d.w, h: d.h }).replace("<g class=", `<g data-id="${d.id}" class=`)).join("") +
        `</svg>`;
      svg = stage.firstElementChild;
      base = { x: 0, y: 0, w: L.w, h: L.h }; vb = { ...base }; setVB();
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
      edgeTo = new Map([...svg.querySelectorAll("line[data-to]")].map((l) => [l.dataset.to, l]));
      bind();
      card.hidden = true;
    },
    /* One history entry. `prev` is the entry before it, for the halt flash;
       when omitted the view uses what it painted last. */
    paint(entry, prev) {
      const before = prev ? new Set(prev.trace.filter((x) => x.status === "Running").map((x) => x.id)) : prevRunning;
      const seen = new Set(entry.trace.map((x) => x.id));
      for (const [id, g] of byId) {
        g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err", "halt");
        g.classList.add("st-idle");
        g.querySelector("title.err-t")?.remove();
        if (before.has(id) && !seen.has(id) && !REDUCED.matches) g.classList.add("halt");
      }
      for (const x of entry.trace) {
        const g = byId.get(x.id); if (!g) continue;
        g.classList.remove("st-idle"); g.classList.add(`st-${ST[x.status] ?? "idle"}`);
        if (x.dirty) g.classList.add("dirty");
        if (x.error) { g.classList.add("err"); g.insertAdjacentHTML("afterbegin", `<title class="err-t">${esc(x.error)}</title>`); }
      }
      edgeTo.forEach((l) => { l.classList.remove("pulse"); l.style.animationDelay = ""; });
      if (!REDUCED.matches) walkOrder(entry.trace).forEach((id, i) => {
        const l = edgeTo.get(id); if (!l) return;
        l.style.animationDelay = `${i * 40}ms`;
        void l.getBoundingClientRect();          // restart the animation when the class is re-added
        l.classList.add("pulse");
      });
      prevRunning = new Set(entry.trace.filter((x) => x.status === "Running").map((x) => x.id));
      lastEntry = entry;
      showCard();
    },
    replay(history, i) {
      if (!history[i]) return;
      this.paint(history[i], history[i - 1] ?? { trace: [] });
    },
    fit() { if (base) { vb = { ...base }; setVB(); } },
    destroy() { host.innerHTML = ""; svg = null; byId = new Map(); edgeTo = new Map(); },
  };
}
```

`layout()` must expose the child id on each edge for `data-to`. Read `src/bt/layout.js`: if an edge is `{ x1, y1, x2, y2 }` only, add `to: c.id` where edges are pushed (one field, no other change) and keep `check-bt.mjs` green.

- [ ] **Step 3: Graph CSS**

Append to `src/styles/app.css`, after the `.tree-live` rule:

```css
/* ── the graph view ─────────────────────────────────────────────────────── */
.gv { position: relative; }
.gv__stage svg { display: block; width: 100%; height: auto; max-height: 400px; cursor: grab; touch-action: none; }
.gv__stage svg:active { cursor: grabbing; }
.gv__tools { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; }
.gv__tools button { font-family: var(--f-mono); font-size: 11px; padding: 3px 7px; background: var(--paper); color: var(--ink);
  border: var(--w-hair) solid var(--rule); cursor: pointer; }
.gv__card { position: absolute; left: 6px; bottom: 6px; max-width: 260px; padding: 8px 10px 8px;
  background: var(--paper); border: var(--w-rule) solid var(--ink); font-family: var(--f-mono); font-size: 11px; }
.gv__card dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; margin: 0; }
.gv__card dt { color: var(--ink-3); }
.gv__card dd { margin: 0; color: var(--ink); }
.gv__close { position: absolute; top: 2px; right: 4px; border: 0; background: none; font-family: var(--f-mono); cursor: pointer; color: var(--ink-3); }
.tree-live .node.picked rect, .tree-live .node.picked ellipse, .tree-live .node.picked polygon { stroke-width: 2.5; }
/* The walk: each edge the tick crossed draws itself once, in order. The
   dash is the tick pulse colour, because a pulse is the tick, not an answer. */
.tree-live line.pulse { stroke: var(--s-tick); stroke-width: 2; stroke-dasharray: 60; stroke-dashoffset: 60;
  animation: gv-walk 260ms linear forwards; }
@keyframes gv-walk { to { stroke-dashoffset: 0; } }
/* The halt: a node that was Running last tick and was not asked this tick. */
.tree-live .node.halt rect, .tree-live .node.halt ellipse { animation: gv-halt 480ms ease-out 1; }
@keyframes gv-halt { 0% { stroke: var(--s-fail); stroke-width: 3; } 100% { stroke-width: 1; } }
@media (prefers-reduced-motion: reduce) {
  .tree-live line.pulse, .tree-live .node.halt rect, .tree-live .node.halt ellipse { animation: none; }
}
```

Check the token names against `src/styles/tokens.css` (`--s-tick`, `--s-fail`, `--paper`, `--ink`, `--ink-3`, `--rule`, `--f-mono`, `--w-rule`, `--w-hair`) and use the ones that exist.

- [ ] **Step 4: Prove it renders**

Write a throwaway page or use the browser console on any chapter: `const { graphView } = await import("/src/play/graph-view.js")` against a `div`, `render(spec, bt)` with a parsed tree and `paint({ t: 1, status: "Running", trace: [...] })`. Confirm: pan by drag, wheel zoom, fit, a click opens the card with the node's kind and answer, an edge pulses. Then delete the throwaway. Nothing else uses the view yet, so `npm run check` and `npx vite build` must pass unchanged.

```bash
git add -A
git commit -m "feat(play): a graph view with pan, zoom, walk pulses, a halt flash and a node card"
```

---

### Task 3: The playground runs a story before it unlocks

**Files:**
- Modify: `src/play/playground.js` (rewrite), `src/styles/app.css` (scene and story rules)
- Delete: `src/play/tree-view.js`
- Test: `scripts/check-scenes.mjs` (unchanged; the playground's step loop must use `stepDone` from `scenes.js` so the two cannot drift), plus a browser pass

**Interfaces:**
- Consumes: `start`, `advance`, `switchCount` from `run.js`; `parse`, `format`, `ParseError`; `WORLDS` from `src/world/index.js`; `stepDone`, `fill` from `src/data/scenes.js`; `graphView`.
- Produces: `mountPlayground(host, cfg, { onDone }) -> stop()` unchanged in signature. `cfg.steps` (array, may be empty or absent) turns on story mode. The checkride keeps calling it with no steps and behaves as today.

- [ ] **Step 1: Rewrite `playground.js`**

```js
/* Two panes: the graph, repainted every tick, and the world beside it. With
   `cfg.steps` the playground first tells a story: each step runs the sim to
   its moment at 20 ticks a second (or at once, with skip), stops, and shows
   its caption. After the last step the controls unlock: Step, Play, rate,
   Reset, hazards, variants, modes, the editor, the goal. Without steps it is
   unlocked from the start, which is what the checkride uses.

   Nothing here knows it is a drone: `cfg.world` names a WORLDS entry and
   everything comes off that object. Nothing here decides a step's stop either:
   stepDone() is shared with the check that proved every step happens. */
import { start, advance, switchCount } from "../bt/run.js";
import { parse, format, ParseError } from "../bt/parse.js";
import { WORLDS } from "../world/index.js";
import { stepDone, fill } from "../data/scenes.js";
import { graphView } from "./graph-view.js";
import { el } from "../ui/util.js";

const RATES = [1, 2, 5, 10, 30, 60];   // ticks per second on the slider
const STORY_RATE = 20;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

export function mountPlayground(host, cfg, { onDone } = {}) {
  const world = WORLDS[cfg.world];
  const leaves = { ...world.leaves, ...(cfg.extraLeaves ?? {}) };
  const W = { ...world, leaves };
  const steps = cfg.steps ?? [];
  let text = cfg.tree, sim = null, timer = null, rate = 10, done = false, lastStatus = null;
  let at = 0;                       // steps completed so far
  let story = steps.length > 0;     // locked until the last step has run

  host.innerHTML =
    `<div class="pg${story ? " pg--story" : ""}">` +
      (cfg.brief ? `<p class="pg__brief">${cfg.brief}</p>` : "") +
      `<div class="pg__panes"><div class="pg__tree"></div><div class="pg__world"></div></div>` +
      `<label class="pg__scrub">trace at tick <b>0</b> <input type="range" min="0" max="0" value="0"></label>` +
      (steps.length ? `<div class="pg__story"><div class="pg__steps"></div><p class="pg__say"></p></div>` : "") +
      `<div class="pg__bar">` +
        `<button class="pg__step" type="button">Step</button>` +
        `<button class="pg__play" type="button">Play</button>` +
        `<button class="pg__reset" type="button">Reset</button>` +
        `<label class="pg__rate">rate <input type="range" min="0" max="${RATES.length - 1}" value="3"><b>10</b> ticks/s</label>` +
        `<span class="pg__tick">tick <b>0</b> · root <i>Idle</i></span>` +
        (cfg.counter ? `<span class="pg__count">switches <b>0</b></span>` : "") +
      `</div>` +
      `<div class="pg__switches"></div>` +
      `<div class="pg__hazards"></div>` +
      `<div class="pg__goal" hidden></div>` +
      `<div class="pg__board"><table class="pg__bb"></table><table class="pg__log"></table></div>` +
      (cfg.editor ? `<div class="pg__edit"><textarea spellcheck="false" rows="12"></textarea><p class="pg__err" hidden></p><button type="button" class="pg__apply">Apply tree</button></div>` : "") +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const pg = q(".pg");
  const view = graphView(q(".pg__tree"));

  /* ── the sim ── */
  function boot() {
    stop();
    try { sim = start({ world: W, scenario: cfg.scenario, tree: text }); }
    catch (e) { showErr(e); return; }
    showErr(null);
    cfg.start?.(sim.state);
    view.render(sim.spec, sim.bt);
    lastStatus = null; done = false; at = 0; story = steps.length > 0;
    pg.classList.toggle("pg--story", story);
    if (cfg.counter) q(".pg__count b").textContent = "0";
    paintWorld(null);
    paintScrub();
    paintStory();
  }
  function showErr(e) {
    const p = q(".pg__err"); if (!p) { if (e) console.error(e); return; }
    p.hidden = !e; p.textContent = e ? e.message : "";
  }
  function oneTick(hazard) {
    if (!sim) return;
    const scripted = (cfg.script ?? []).filter((e) => e.at === sim.t + 1).map((e) => W.hazards.find((h) => h.id === e.hazard));
    hazard = [hazard, ...scripted].filter(Boolean);
    const { status, trace } = advance(sim, hazard);
    view.paint({ t: sim.t, status, trace });
    lastStatus = status;
    if (cfg.counter) q(".pg__count b").textContent = String(switchCount(sim.history, sim.bt.root.children.map((c) => c.id)));
    paintWorld(status);
    paintScrub();
    if (!done && cfg.goal?.test(sim.state, sim.history)) {
      done = true;
      const g = q(".pg__goal"); g.hidden = false; g.textContent = cfg.goal.done;
      onDone?.();
    }
  }
  function paintWorld(status) {
    q(".pg__world").innerHTML = W.draw(sim.state);
    q(".pg__tick b").textContent = String(sim.t);
    q(".pg__tick i").textContent = status ?? "Idle";
    const v = W.view(sim.state);
    q(".pg__bb").innerHTML = Object.entries(v).map(([k, x]) => `<tr><th>${k}</th><td>${x}</td></tr>`).join("");
    q(".pg__log").innerHTML = sim.bb.log.length
      ? `<tr><th colspan="4">writes this tick</th></tr>` + sim.bb.log.map((w) => `<tr><td>${w.node}</td><td>${w.key}</td><td>${w.from ?? ""}</td><td>${w.to}</td></tr>`).join("")
      : "";
  }
  /* The scrubber replays stored entries into the graph and the tick readout.
     It never re-simulates, and the map stays at the live state, so nothing on
     screen is invented: the graph shows a tick that happened, the map the one
     that is current. Stepping again snaps it back to the end. */
  function paintScrub() {
    const r = q(".pg__scrub input"); const n = sim.history.length;
    r.max = String(Math.max(0, n - 1)); r.value = String(Math.max(0, n - 1)); r.disabled = n < 2;
    q(".pg__scrub b").textContent = String(sim.t);
  }
  q(".pg__scrub input").oninput = (e) => {
    const i = Number(e.target.value);
    if (!sim.history[i]) return;
    view.replay(sim.history, i);
    q(".pg__scrub b").textContent = String(sim.history[i].t);
    q(".pg__tick b").textContent = String(sim.history[i].t);
    q(".pg__tick i").textContent = sim.history[i].status;
  };

  /* ── the story ── */
  function paintStory() {
    if (!steps.length) return;
    const box = q(".pg__steps"); box.innerHTML = "";
    steps.forEach((s, i) => {
      const b = el("button", "pg__stepbtn", String(i + 1)); b.type = "button";
      b.dataset.at = i < at ? "done" : i === at ? "now" : "todo";
      b.setAttribute("aria-label", `step ${i + 1} of ${steps.length}`);
      b.onclick = () => runTo(i, true);
      box.appendChild(b);
    });
    if (at < steps.length) {
      const next = el("button", "pg__next", at === 0 ? "Start" : "Next"); next.type = "button";
      next.onclick = () => runTo(at, false);
      const skip = el("button", "pg__skip", "skip"); skip.type = "button";
      skip.onclick = () => runTo(at, true);
      box.append(next, skip);
    }
    q(".pg__say").textContent = at === 0 ? "" : q(".pg__say").textContent;
  }
  /* Run step i. A click on an earlier step replays from the start at once;
     the current step animates unless `fast`. */
  function runTo(i, fast) {
    stop();
    if (i < at) { boot(); for (let k = 0; k < i; k++) runStep(k, true); }
    runStep(i, fast || REDUCED.matches);
  }
  function runStep(i, fast) {
    const step = steps[i];
    const cap = sim.t + (step.cap ?? 600);
    let first = true;
    const tick = () => {
      const hz = first && step.hazard ? W.hazards.find((h) => h.id === step.hazard) : undefined;
      first = false;
      oneTick(hz);
    };
    const finish = (ok) => {
      stop();
      at = i + 1;
      q(".pg__say").textContent = ok ? fill(step.say, sim.t) : `This did not happen within ${step.cap ?? 600} ticks.`;
      if (at === steps.length) { story = false; pg.classList.remove("pg--story"); }
      paintStory();
    };
    const predicateAlready = typeof step.to !== "number" && stepDone(sim, step);
    if (predicateAlready) return finish(true);
    if (fast) { while (!stepDone(sim, step) && sim.t < cap) tick(); return finish(stepDone(sim, step)); }
    timer = setInterval(() => {
      tick();
      if (stepDone(sim, step)) finish(true);
      else if (sim.t >= cap) finish(false);
    }, 1000 / STORY_RATE);
  }

  /* ── free play ── */
  function play() {
    if (timer) return;
    q(".pg__play").textContent = "Pause";
    timer = setInterval(() => oneTick(), 1000 / rate);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    const b = q(".pg__play"); if (b) b.textContent = "Play";
  }
  q(".pg__step").onclick = () => { stop(); oneTick(); };
  q(".pg__play").onclick = () => (timer ? stop() : play());
  q(".pg__reset").onclick = boot;
  q(".pg__rate input").oninput = (e) => { rate = RATES[e.target.value]; q(".pg__rate b").textContent = String(rate); if (timer) { stop(); play(); } };

  /* variants and the mode toggle */
  const sw = q(".pg__switches");
  (cfg.variants ?? []).forEach((v, i) => {
    const b = el("button", "pg__var" + (i === 0 ? " on" : ""), v.label); b.type = "button";
    b.onclick = () => {
      sw.querySelectorAll(".pg__var").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      text = v.tree;
      if (q("textarea")) q("textarea").value = text;
      const sel = q(".pg__mode select");
      if (sel) sel.value = parse(text, leaves).mode ?? "reactive";
      boot();
      /* A variant is the reader's own choice, so it opens unlocked: the story was
         told on the scene's own tree. */
      story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory();
    };
    sw.appendChild(b);
  });
  if (cfg.modes) {
    const lab = el("label", "pg__mode", `root mode <select><option>reactive</option><option>memory</option><option>keep</option></select>`);
    lab.querySelector("select").onchange = (e) => {
      const spec = parse(text, leaves);
      if (spec.kind === "Sequence" || spec.kind === "Fallback") { spec.mode = e.target.value; text = format(spec); if (q("textarea")) q("textarea").value = text; boot(); story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory(); }
    };
    sw.appendChild(lab);
  }
  /* hazards */
  const hz = q(".pg__hazards");
  (cfg.hazards ?? []).forEach((id) => {
    const h = W.hazards.find((x) => x.id === id); if (!h) return;
    const b = el("button", "pg__hz", h.label); b.type = "button";
    b.onclick = () => { if (!sim) return; h.apply(sim.state); paintWorld(lastStatus); };
    hz.appendChild(b);
  });
  /* editor */
  if (cfg.editor) {
    q("textarea").value = text;
    q(".pg__apply").onclick = () => {
      try { parse(q("textarea").value, leaves); text = q("textarea").value; boot(); story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory(); }
      catch (e) { showErr(e instanceof ParseError ? e : new Error(e.message)); }
    };
  }

  boot();
  return () => { stop(); view.destroy(); sim = null; };
}
```

Read `src/bt/run.js` `start()` to confirm the sim exposes `spec` and `bt` (it did for `view.render(sim.spec)` in version one; `bt` is used by the counter). The mode select's initial value must reflect the scene tree: after building the select set `sel.value = parse(text, leaves).mode ?? "reactive"`.

- [ ] **Step 2: Story CSS**

Append to `src/styles/app.css`:

```css
/* ── a scene's story ────────────────────────────────────────────────────── */
.pg--story .pg__bar, .pg--story .pg__switches, .pg--story .pg__hazards, .pg--story .pg__edit, .pg--story .pg__goal { display: none; }
.pg__story { margin-top: 12px; }
.pg__steps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pg__stepbtn[data-at="done"] { background: var(--ink); color: var(--paper); }
.pg__stepbtn[data-at="now"] { border-width: 2px; }
.pg__next { margin-left: 6px; }
.pg__skip { border-style: dashed; }
.pg__say { margin: 10px 0 0; font-size: 15px; line-height: 1.5; min-height: 1.5em; }
.pg__scrub { display: flex; align-items: center; gap: 8px; margin-top: 8px;
  font-family: var(--f-mono); font-size: 11px; color: var(--ink-3); }
.pg__scrub input { flex: 1; accent-color: var(--accent); }
.pg__scrub input:disabled { opacity: .4; }
```

- [ ] **Step 3: Delete the old view, check, look, commit**

`git rm src/play/tree-view.js`. Grep for `tree-view` and `treeView`: none may remain.

Browser pass on port 63601 (`npm run dev`): the checkride still works with no steps (`#checkride`, begin, judge a tree); a chapter still shows its playground (Task 4 switches chapters to scenes; until then the `play` case is a no-op, so test the story mode on the checkride host by temporarily passing `steps` in the console, or wait for Task 4 and test there; say which in the report).

```bash
npm run check; npx vite build
git add -A
git commit -m "feat(play): the playground tells its steps first, then unlocks, on the graph view"
```

---

### Task 4: One column, and the chapter page mounts scenes inline

**Files:**
- Modify: `src/ui/lesson.js`, `src/ui/steps.js`, `src/styles/app.css`
- Test: `npm run check` (steps.js is exercised by `check-content.mjs` through `stepsFor`), a browser pass on `#reactivity` and `#design`

**Interfaces:**
- Consumes: `sceneConfig` from `src/data/scenes.js`; `mountPlayground`; `DIAGRAMS` for the three surviving plates; `markStep`.
- Produces: flow block `{ t: "scene", id }` rendered inline; `fig` rendered inline with its step strip; steps key `scene`.

- [ ] **Step 1: `steps.js`**

Replace the `play` entry and its `stepsFor` line:

```js
import { SCENES } from "../data/scenes.js";
...
  scene: { label: "Run a scene to the end and meet its goal", hint: "the goal latches once met" },
...
  if (les?.flow.some((b) => b.t === "scene" && SCENES[b.id]?.then?.goal)) keys.push("scene");
```

`doneSteps` reads stored progress keyed `play` from version one; map it: in `doneSteps`, after reading `e`, `if (e && e.play && !e.scene) e = { ...e, scene: true };` so nobody who met a goal under the old key watches it empty out. Say so in a comment.

- [ ] **Step 2: `lesson.js`, one column**

Delete, in `renderLesson`: `benchWrap`, `bench`, `figIds`, `activeFig`, `cur`, `pinned`, `setStepOn`'s bench coupling (`pinned = true` lines), `setStep`, `plateName`, `showFigure`, the `fig-section` wrapper after the switch, the `showFigure(figIds[0])` call, and the whole scroll `track` block with its listeners and teardown. Keep `mountFigure` and `setStepOn` (they draw one plate with its strip; drop the two `pinned` assignments inside them). Change `wrap.append(head, col, benchWrap)` to `wrap.append(head, col)`.

Replace the `fig` case with an inline plate:

```js
      /* A drawing, inline, where the flow places it, with its own step strip.
         Only three plates survive the move to scenes: the ones that are not
         runs (the Nav2 tree, the stack, back chaining). */
      case "fig": {
        if (!DIAGRAMS[b.id]) { console.error("fig block with no builder:", b.id); break; }
        figSeen++;
        node = el("div", "figure-inline");
        node.appendChild(el("div", "figref__line",
          `<span class="t-label">Fig. ${i + 1}-${figSeen}</span><span class="figref__rule"></span>`));
        const plate = el("div", "figref__plate");
        node.appendChild(plate);
        mountFigure(plate, b.id, `Fig. ${i + 1}-${figSeen}`);
        break;
      }
```

Replace the `play` case with the scene:

```js
      /* A live scene: the interpreter on the real world, told in steps, then
         handed over. It sits exactly where the flow put it, which is right after
         the paragraph that set it up. */
      case "scene": {
        let cfg;
        try { cfg = sceneConfig(b.id); } catch (e) { console.error(e.message); break; }
        sceneSeen++;
        node = el("div", "scene");
        node.appendChild(el("div", "scene__cap",
          `<span>Scene ${i + 1}-${sceneSeen}</span><span>${cfg.steps.length ? `${cfg.steps.length} steps, then yours` : "yours"}</span>`));
        const host = el("div", "scene__host");
        node.appendChild(host);
        const stop = mountPlayground(host, cfg, { onDone: () => markStep(les.id, "scene") });
        const prev = teardown;
        teardown = () => { stop(); prev?.(); };
        if (!sceneNode) sceneNode = node;
        break;
      }
```

Declare `let sceneSeen = 0, sceneNode = null;` beside `figSeen`, rename `playNode` uses to `sceneNode`, and set `jump.scene = () => sceneNode`. Imports: drop `PLAYS`; add `import { sceneConfig } from "../data/scenes.js";`. The `figref__plate` on a wide screen was `display: none`; Task 4's CSS below makes it always block.

- [ ] **Step 3: CSS, one column**

In `src/styles/app.css`:

- `.lesson { display: block; }` and delete the `grid-column`/`grid-row` lines on `.lesson__head` and `.col`; delete the `.bench-wrap` and `.bench` rules and the narrow-screen `.bench-wrap { display: none; }` and the `.lesson` grid override in the `max-width: 1020px` block.
- `.col > *, .lesson__head > * { max-width: 68ch; }` stays; add `.col > .scene, .col > .figure-inline { max-width: none; }`.
- `.figref__plate { display: block; margin-top: 10px; background: var(--paper); border: var(--w-rule) solid var(--ink); }` at top level (move it out of the media query, delete the duplicate there).
- Add:

```css
/* ── a scene ────────────────────────────────────────────────────────────── */
.scene { margin: 28px 0; border: var(--w-rule) solid var(--ink); }
.scene__cap { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: var(--w-hair) solid var(--rule);
  font-family: var(--f-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
.scene .pg__panes { grid-template-columns: 3fr 2fr; }
.scene .gv__stage svg { max-height: 400px; }
.scene .pg__world svg { max-height: 400px; width: 100%; height: auto; }
.steps { max-width: none; }
@media (max-width: 1020px) {
  .scene .pg__panes { grid-template-columns: 1fr; }
  .scene .gv__stage svg, .scene .pg__world svg { max-height: 300px; }
}
```

Delete the `.play` and `.play__cap` rules (the class is gone).

- [ ] **Step 4: Check, look, commit**

Chapters still carry `fig` and `play` blocks until Task 5, so every chapter renders its plates inline and no scene yet; that is the expected state. Open `#reactivity`: one column, the plate inline with its strip, no bench, no console error. Open `#checkride`: unchanged.

```bash
npm run check; npx vite build
git add -A
git commit -m "feat(shell): one column, plates inline, and a scene block on the chapter page"
```

---

### Task 5: The chapters get their scenes

**Files:**
- Modify: `src/data/lessons.js`, `src/data/diagrams.js`, `scripts/check-content.mjs`
- Test: `scripts/check-content.mjs`, `scripts/check-scenes.mjs`, `scripts/check-figures.mjs`

- [ ] **Step 1: The spine rule**

In `scripts/check-content.mjs` replace the spine block:

```js
/* ── every chapter has the spine ─────────────────────────────────────────── */
const spineless = [];
for (const les of LESSONS) {
  const t = (k) => les.flow.some((b) => b.t === k);
  const missing = ["concrete", "myth", "check"].filter((k) => !t(k));
  if (!t("scene") && !t("fig")) missing.push("scene or fig");
  if (t("play")) missing.push("a play block, which no longer exists");
  if (missing.length) spineless.push(`${les.id} (no ${missing.join(", ")})`);
}
spineless.length
  ? fail(`chapters missing a spine block: ${spineless.join("; ")}`)
  : pass(`all ${LESSONS.length} chapters carry concrete, a scene or a figure, myth and check`);
```

Replace the play rule with a scene rule that every `scene` block id is in `SCENES` (the scene check does the same; keep this one so the content check stays self contained). Run it: fails on every chapter's `play` block.

- [ ] **Step 2: Place the scenes**

In `src/data/lessons.js`, chapter by chapter:

| chapter | remove | add, in the fig block's position | notes |
|---|---|---|---|
| the-tick | fig `tick/root-to-leaf`, play `tick/one-action` | scene `tick/root-to-leaf` | |
| three-answers | fig `answers/three`, play `answers/two-steps` | scene `answers/three` | |
| sequence | fig, play `sequence/todo` | scene `sequence/todo` | |
| fallback | fig, play `fallback/plan-b` | scene `fallback/plan-b` | |
| conditions | fig `condition/pure`, play `condition/dirty` | scene `condition/pure` | |
| reactivity | fig, play `reactive/preempt` | scene `reactive/preempt` | |
| memory | fig, play `memory/modes` | scene `memory/modes` | |
| decorators | fig, play `decorators/kinds` | scene `decorators/kinds` | |
| parallel | fig `parallel/m-of-n`, play `parallel/race` | scene `parallel/m-of-n` where the fig was; scene `parallel/race` where the play was | two scenes |
| blackboard | fig `blackboard/ports`, play `blackboard/goal` | scene `blackboard/ports` | |
| tree-or-machine | fig, play `fsm/transitions` | scene `fsm/transitions` | |
| design | play `design/mission` | scene `design/mission` where the play was | the three `fig` blocks stay |

A scene must sit right after the paragraph that sets it up. Read the `p` block before each `fig` and the `p` block between the old `fig` and `play`: keep every sentence that sets up the moment, reword every sentence that speaks of a drawing ("The figure draws", "Fig.", "the plate", "the bench", "shown on the bench", "below" meaning the playground, "the playground below") so it speaks of the scene ("The scene runs", "press Start", "step 3 shows"), and delete a sentence whose only job was to introduce the playground. Grep for `figure`, `Fig`, `plate`, `bench`, `playground` in `lessons.js` and decide each hit. Do not change any `myth`, `fact`, `check` or `ref` block. No em or en dash.

- [ ] **Step 3: Drop the ten plates**

In `src/data/diagrams.js` delete the builders `tick/root-to-leaf`, `answers/three`, `sequence/todo`, `fallback/plan-b`, `condition/pure`, `reactive/preempt`, `memory/modes`, `decorators/kinds`, `parallel/m-of-n`, `blackboard/ports`, `fsm/transitions`. Keep `design/backchain`, `nav2/tree`, `design/stack` and `indexTree`. Delete helpers that no surviving builder uses (`FIG_LEAVES` entries, `T` if unused, imports). `node scripts/check-figures.mjs` must report 4/4 clean (three plates and the index tree; read the check to see whether it counts the index tree).

- [ ] **Step 4: Run every check, read every chapter, commit**

`npm run check` green, including `check-scenes.mjs` with every scene placed and every step happening. `npx vite build`. Then open every chapter on port 63601, press Start on each scene, watch each step's caption match what the graph and map show, and confirm the controls unlock after the last step and the goal latches. Record any caption that reads wrong against what is on screen and fix its wording in `scenes.js` (never its predicate, unless the moment is wrong; then fix the predicate and re-run the check).

```bash
git add -A
git commit -m "feat(lessons): every chapter runs its scene where the text names the moment"
```

---

### Task 6: Docs, the visual grammar, and the final pass

**Files:**
- Modify: `README.md`, `PRODUCT.md`, `content/visual-grammar.md`, `NOTICE` (only if it names plates by count)
- Test: `npm run check`, `npx vite build`, a clean checkout build

- [ ] **Step 1: The visual grammar**

Append to `content/visual-grammar.md` a section "Scenes" stating: a scene is the interpreter running; node colour is the answer this tick; an edge pulse in the tick colour is the walk, in walk order; a red flash on a node is the halt; a hatched ellipse is a condition that changed the world; the card reads only from the trace and the built tree; the scrubber replays stored ticks and never re-simulates; captions may name a tick only through `{t}`. One sentence per line.

- [ ] **Step 2: README and PRODUCT**

README: replace the plates paragraph and counts with scenes (count them in `scenes.js`), name the three surviving drawings, add `check-scenes.mjs` to the verification table with what it asserts, and change the design section's sentence about the bench to the one-column rule. PRODUCT: the "Confirmed scope" paragraph names live scenes in one column; the evidence list adds `src/data/scenes.js` and `scripts/check-scenes.mjs`. One sentence per line in both. Count every number from the code.

- [ ] **Step 3: The whole check, a clean checkout build, and the eye**

```bash
npm run check
git stash -u; npm ci; npm run build; git stash pop
```

Run the stash commands one at a time (an empty stash exits non zero). Then the browser, on port 63601, with a critical eye: every chapter, the index, cards, dialects, sources, checkride; phone width (375 px) on two chapters; reduced motion on (the graph still colours, nothing pulses). Fix what looks off, in this task, and name it.

```bash
git add -A
git commit -m "docs(course): scenes in one column, and the checks that prove them"
```

---

## Self review against the spec

- Section 2 layout: Task 4 removes the bench and the grid, caps scene height, stacks on narrow screens, and keeps the other pages.
- Section 3 scene block: Task 1 defines `SCENES` with `steps`, `to`, `hazard`, `say`, `{t}`, `cap`, `then`; Task 5 places the blocks; the `play` block is gone (Task 5 spine rule).
- Section 4 component: Task 3 (steps at 20 ticks a second, skip, caption, unlock, Reset to step 1, `stop()` on route change through the existing teardown chain). `mountScene` from the spec is `mountPlayground` with `cfg.steps`: one component, not two, because the unlocked stage is the playground and the story only gates its controls. Recorded here as the one naming deviation.
- Section 5 graph: Task 2 (pan, zoom, fit, status classes, hatch, halt flash, walk-order pulses, node card, replay, reduced motion).
- Section 6 plates: Task 5's table; Task 1's scenes cover the ten runs; `design/backchain`, `nav2/tree`, `design/stack`, `index/tree` stay.
- Section 7 checks: Task 1's `check-scenes.mjs` (exists and used, parses, every step happens, `{t}` filled, hard coded tick note, goal reachable); Task 5's spine rule; `check-figures.mjs` kept.
- Section 8 progress: Task 4's `scene` key and the old `play` progress mapped forward.
- Section 9 errors: cap message on screen (Task 3), leaf errors on the card (Task 2), parse errors as before, teardown on route change (Task 4).
- Section 10 out of scope: nothing here adds React, dragging, or a pinned view.
- Type consistency: `stepDone(sim, step)` and `fill(say, t)` are defined in Task 1 and used in Task 3; `walkOrder(trace)` defined in Task 2 and used in Task 2; `sceneConfig(id)` defined in Task 1 and used in Task 4; `graphView(host).render(spec, bt)` in Task 2 matches Task 3's `view.render(sim.spec, sim.bt)`.

Deviations to carry into the tracker: `mountScene` folded into `mountPlayground`; two scenes in chapter 9; chapter 12 keeps three drawings.

## Execution

Plan complete. Two execution options:

1. Subagent driven (recommended): a fresh subagent per task, review between tasks.
2. Inline: execute the tasks in this session with checkpoints.

