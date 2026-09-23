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
