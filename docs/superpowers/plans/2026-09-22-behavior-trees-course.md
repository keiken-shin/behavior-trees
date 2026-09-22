# Behavior Trees Course Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the second course in the school series: twelve chapters on behavior trees with an inline playground where the reader edits a drone's mind and watches a 2D map respond, plus a typed checkride judged by the same interpreter.

**Architecture:** A copy of the `flight-dynamics` shell (Vite, vanilla ES modules, hand authored SVG plates, localStorage progress) with the flight model replaced by a 150 line tick interpreter (`src/bt/tree.js`), a text parser (`src/bt/parse.js`), a kinematic drone world (`src/world/drone.js`) and an inline two pane playground (`src/play/`). Every claim in a lesson carries a source id that the content check enforces.

**Tech Stack:** Node 22+, Vite 7, vanilla JavaScript ES modules, SVG, no runtime dependencies except the three font packages. Checks are Node scripts with `node:assert/strict`, no test framework.

**Spec:** `docs/superpowers/specs/2026-09-22-behavior-trees-course-design.md` (read it first; this plan argues from it). Research: `RESEARCH.md`.

## Global Constraints

- Repo root: `D:\Projects\Learning\school-for-newbies\behavior-trees`. The flight shell to copy from: `D:\Projects\Learning\school-for-newbies\flight-dynamics` (read only, never modify).
- No em dash (U+2014) or en dash (U+2013) anywhere in code, prose or commits. Use `-`. The flight shell files contain both; after every `cp` from it, run `sed -i 's/\xe2\x80\x94/-/g; s/\xe2\x80\x93/-/g' <file>` on the copied file before editing it.
- Commit message format: `<type>(<scope>): <subject>`. No `Co-Authored-By`, no `Generated with` lines.
- Long Markdown files: one sentence per line.
- Runtime dependencies: exactly `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono`, `@fontsource/archivo-narrow`. Dev dependency: `vite` only. No Three.js.
- Colour rule: colour means an answer only. Tokens `--s-ok`, `--s-fail`, `--s-run`, `--s-tick`. Node kind is shape only.
- Statuses are the strings `"Success"`, `"Failure"`, `"Running"`, and `"Idle"` for a node not visited this tick.
- One tick is `DT = 0.1` seconds of world time.
- Every `myth` and `fact` block in `src/data/lessons.js` carries `src`, an id that exists in `content/sources.json`.
- `npm run check` must pass at the end of every task that touches something it covers.
- Dev server port: 63601 (`.claude/launch.json` and `package.json`).

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.env.example`, `LICENSE`, `.claude/launch.json` | project shell | 1 |
| `src/styles/tokens.css`, `src/styles/app.css` | tokens and chrome, copied and renamed | 1 |
| `src/ui/util.js`, `src/ui/player.js`, `src/ui/logo.js` | copied helpers; logo redrawn | 1 |
| `src/bt/tree.js` | the interpreter | 2 |
| `scripts/check-bt.mjs` | interpreter, parser and layout assertions | 2, 3, 4 |
| `src/bt/parse.js` | text form to spec and back | 3 |
| `src/bt/layout.js` | tree geometry shared by figures and playground | 4 |
| `src/world/drone.js` | the drone world | 5 |
| `src/bt/run.js` | headless runner: world plus tree plus scripted hazards | 5 |
| `scripts/check-world.mjs` | world and runner assertions | 5 |
| `src/data/svg.js` | primitives, copied, plus `node`, `edge`, `craft`, `tree` | 6 |
| `scripts/check-figures.mjs` | copied | 6 |
| `content/sources.json`, `content/dialects.json`, `content/nav2.xml`, `content/visual-grammar.md` | sourced content | 7 |
| `scripts/check-content.mjs` | copied, adapted, sources rule | 7 |
| `src/data/lessons.js`, `src/data/deck.js`, `src/data/videos.js` | chapters | 7, 8, 9 |
| `src/data/plays.js` | playground configuration per chapter | 8, 9 |
| `src/data/diagrams.js`, `src/bt/nav2.js` | the plates | 10 |
| `src/play/tree-view.js`, `src/play/playground.js` | the playground | 11 |
| `src/ui/lesson.js`, `src/ui/steps.js` | chapter page with `play` block | 11 |
| `src/main.js`, `src/ui/home.js`, `src/ui/cards.js`, `src/ui/credits.js`, `src/ui/dialects.js` | app shell | 12 |
| `src/data/exam.js`, `src/ui/checkride.js`, `scripts/check-checkride.mjs` | the checkride | 13 |
| `content/concepts.json`, `scripts/yt.mjs`, `README.md`, `NOTICE`, `PRODUCT.md` | videos and docs | 14 |

---

### Task 1: Scaffold the repo from the flight shell

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.env.example`, `LICENSE`, `.claude/launch.json`, `src/main.js`, `src/styles/tokens.css`, `src/styles/app.css`, `src/ui/util.js`, `src/ui/player.js`, `src/ui/logo.js`

**Interfaces:**
- Produces: CSS tokens `--s-ok`, `--s-fail`, `--s-run`, `--s-tick`, `--ref`; `logoSvg({size})`, `faviconDataUri()` from `src/ui/logo.js`; `el`, `mark`, `progress`, `saveProgress`, `applyPlate`, `currentPlate`, `cyclePlate` from `src/ui/util.js` (unchanged from the flight course).

- [ ] **Step 1: Copy the shell files**

Run from the repo root (Git Bash):

```bash
F=../flight-dynamics
mkdir -p src/styles src/ui src/data src/bt src/world src/play scripts content .claude
cp $F/vite.config.js $F/.gitignore $F/.env.example $F/LICENSE .
cp $F/src/styles/tokens.css $F/src/styles/app.css src/styles/
cp $F/src/ui/util.js $F/src/ui/player.js src/ui/
cp $F/.claude/launch.json .claude/launch.json
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "behavior-trees",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "A visual learning platform for behavior trees.",
  "scripts": {
    "dev": "vite --port 63601",
    "build": "vite build",
    "preview": "vite preview",
    "check": "node scripts/check-bt.mjs && node scripts/check-world.mjs && node scripts/check-figures.mjs && node scripts/check-content.mjs && node scripts/check-checkride.mjs",
    "curate": "node scripts/yt.mjs curate",
    "verify:videos": "node scripts/yt.mjs verify",
    "videos": "node scripts/yt.mjs emit"
  },
  "devDependencies": {
    "vite": "^7.1.0"
  },
  "dependencies": {
    "@fontsource-variable/archivo": "^5.3.0",
    "@fontsource-variable/jetbrains-mono": "^5.3.0",
    "@fontsource/archivo-narrow": "^5.3.0"
  }
}
```

Until Tasks 2 to 13 exist, the `check` script names files that are not there. That is fine; `npm run check` is not run in this task.

- [ ] **Step 3: Edit vite.config.js, launch.json, .gitignore**

In `vite.config.js` delete the `build.rollupOptions` block and its comment about Three.js. Keep `server`, `resolve.alias` and `build.target`.

In `.claude/launch.json` change `"port": 63598` to `"port": 63601`.

In `.gitignore` delete the "Generated imagery" paragraph and its two `assets/generated` lines. Delete the `.impeccable/` lines. Keep `.env`, `.env.local`, `node_modules/`, `dist/`, and the editor noise lines.

In `.env.example` delete the first paragraph about image generation. Keep the YouTube key instructions.

- [ ] **Step 4: Rename the semantic tokens**

In `src/styles/tokens.css`, in all three places the semantic block appears (`:root`, the `prefers-color-scheme: dark` block, the `[data-plate="negative"]` block), replace the force, moment, flow, angle, pressure and relational lines with these four plus `--ref`:

Light:
```css
  /* semantic - an answer, never a kind. content/visual-grammar.md section 1 */
  --s-ok:   #2f9e44;   /* Success */
  --s-fail: #e03131;   /* Failure */
  --s-run:  #c77800;   /* Running */
  --s-tick: #0c8599;   /* the tick, travelling down an edge */
  --ref:    #8a8f98;
```
Dark (both dark blocks):
```css
    --s-ok: #51cf66; --s-fail: #ff6b6b; --s-run: #ffd43b; --s-tick: #22b8cf; --ref: #6c727c;
```
Rewrite the header comment of the file so it names this course: "the semantic colours are answers a node gives, and nothing else".

- [ ] **Step 5: Rename token uses in app.css and drop the flight only blocks**

```bash
sed -i 's/--f-thrust/--s-ok/g; s/--f-drag/--s-fail/g; s/--a-angle/--s-run/g; s/--v-flow/--s-tick/g' src/styles/app.css
```

Then delete by hand these blocks (find each by its comment): the `.readout` rules (from `/* controls + readout` to the `.readout .v-drag` line), the `.sandbox` rules (from `/* sandbox - the canvas sizes itself` to `.sandbox__hud button:hover`), the `.vp--sim` two lines, the `.sandbox--exam` line, the Part II relational figure rules (from `/* Part II - relational kinds. */` to the arrowhead fills for relational kinds), the term rung rules (from `/* ── term` to the end of the four rungs block), the glossary rules (from `/* ── the vocabulary` to the end of that section), and the home plate raster rules (from `/* The plate raster ships as black line on white.` to the end of the leader line animation block, but keep the `index table` rules that follow). Keep everything else. Rename the remaining `.figure .k-lift` family: replace the block of `.figure .k-*` lines with:

```css
.figure .k-ok{stroke:var(--s-ok)}     .figure .fill-ok{fill:var(--s-ok)}
.figure .k-fail{stroke:var(--s-fail)} .figure .fill-fail{fill:var(--s-fail)}
.figure .k-run{stroke:var(--s-run)}   .figure .fill-run{fill:var(--s-run)}
.figure .k-tick{stroke:var(--s-tick)} .figure .fill-tick{fill:var(--s-tick)}
.figure .k-ref{stroke:var(--ref)}     .figure .k-ink{stroke:var(--ink)}
.figure .chip-t.k-ok{fill:var(--s-ok)} .figure .chip-t.k-fail{fill:var(--s-fail)}
.figure .chip-t.k-run{fill:var(--s-run)} .figure .chip-t.k-tick{fill:var(--s-tick)}
```

Run `grep -n "f-lift\|f-weight\|f-other\|m-moment\|r-friendly\|r-threat\|r-track\|r-circle\|p-low\|p-high" src/styles/app.css` and expect no output.

- [ ] **Step 6: Draw the mark**

Write `src/ui/logo.js`:

```js
/* The mark: a root and two children on hairline edges, the smallest drawing
   that is unmistakably a tree being ticked. Square blocks, because every other
   container in this system has square corners. Drawn from geometry so it
   inherits ink and survives the negative plate. */
const BLOCKS = [
  { x: 9, y: 2, w: 6, h: 5 },      // root
  { x: 2, y: 15, w: 6, h: 5 },     // left child
  { x: 16, y: 15, w: 6, h: 5 },    // right child
];
const rects = (p) => p.map((r) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="currentColor"/>`).join("");
const EDGES = `<path d="M12 7 L12 11 L5 11 L5 15 M12 11 L19 11 L19 15" stroke="currentColor"
    stroke-width="1" fill="none" opacity=".7"/>`;

/** @param {{size?:number, cls?:string}} opts */
export function logoSvg({ size = 22, cls = "logo" } = {}) {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" aria-hidden="true" focusable="false">${EDGES}${rects(BLOCKS)}</svg>`;
}

/* A favicon renders outside the page, so currentColor has nothing to inherit. */
export function faviconDataUri() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<style>.m{fill:#14171c;stroke:#14171c}@media(prefers-color-scheme:dark){.m{fill:#eceae5;stroke:#eceae5}}</style>` +
    `<path class="m" fill="none" d="M12 7 L12 11 L5 11 L5 15 M12 11 L19 11 L19 15" stroke-width="1.3"/>` +
    rects(BLOCKS).replace(/fill="currentColor"/g, 'class="m" stroke="none"') +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
```

- [ ] **Step 7: Write index.html**

Copy `../flight-dynamics/index.html` to `index.html`, then: change `<title>` to `Behavior Trees`; change the `<meta name="description">` to `Behavior trees taken apart - twelve ideas in the order they make sense, each one naming the thing you probably believe that isn't true, with a playground where you edit a drone's mind and watch it fly.`; replace the inline favicon `href` value with the string returned by `faviconDataUri()` above (compute it once with `node -e` and paste); replace the `#boot svg` inner markup with the path and three rects from `logoSvg`; delete the `<!-- THESIS ... -->` comment block. Keep the boot cover CSS.

- [ ] **Step 8: Stub main.js and prove the build**

```js
import "./styles/app.css";
import { logoSvg, faviconDataUri } from "./ui/logo.js";
document.getElementById("app").innerHTML = `<h1 class="t-display">${logoSvg({ size: 40 })} Behavior Trees</h1>`;
document.querySelector('link[rel="icon"]').href = faviconDataUri();
document.getElementById("boot")?.classList.add("gone");
```

Run: `npm install && npm run build`
Expected: `dist/` built with no errors and no `three` chunk.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(shell): scaffold the course from the flight-dynamics shell"
```

---

### Task 2: The interpreter

**Files:**
- Create: `src/bt/tree.js`, `scripts/check-bt.mjs`

**Interfaces:**
- Produces:
  - `S = { SUCCESS: "Success", FAILURE: "Failure", RUNNING: "Running", IDLE: "Idle" }`
  - `build(spec, leaves) -> tree` where `spec` is `{ kind, name?, mode?, m?, dec?, leaf?, args?, children? }` and `leaves` is `{ [name]: { kind: "action"|"condition", tick(world, bb, args, node) -> status, halt?(world, node) } }`. Returns `{ root, all, tickNo }`; every node gets `id` (given or `n<index>`), `depth`, `children`, `st`.
  - `tick(tree, world, bb) -> { status, trace: [{ id, status, dirty, error }] }`. `world.mutations` must be a number.
  - `halt(node, world)`, `reset(tree, world)`, `makeBlackboard(data) -> { data, log, tick, get, set }`.
- Spec section 5 is the contract.

- [ ] **Step 1: Write the failing checks**

`scripts/check-bt.mjs`:

```js
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

console.log(failed ? `\n${failed} interpreter check(s) FAILED` : `\ninterpreter: ${passed} checks pass`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to see it fail**

Run: `node scripts/check-bt.mjs`
Expected: fails at import, `Cannot find module '../src/bt/tree.js'`.

- [ ] **Step 3: Write the interpreter**

`src/bt/tree.js`:

```js
/* The interpreter. This file is shown to the reader in chapter 1, so it stays
 * short and it stays honest: what it does is exactly what the textbook says
 * (Colledanchise and Ogren, arXiv 1709.00084, section 1.3), plus the two
 * memory modes BehaviorTree.CPP documents on its Sequence and Fallback pages.
 *
 * A tree is ticked from the root. Every node visited answers Success, Failure
 * or Running. A node that was Running last tick and is not visited this tick
 * is halted. That is the whole engine.
 */

export const S = Object.freeze({ SUCCESS: "Success", FAILURE: "Failure", RUNNING: "Running", IDLE: "Idle" });

const fresh = () => ({ status: S.IDLE, idx: 0, memo: [], count: 0, runFor: 0, seen: -1, dirty: false, error: null });

/* Turn a plain spec into a runnable tree. Leaves are resolved here so an
   unknown name fails at build time, never mid tick. */
export function build(spec, leaves) {
  let n = 0;
  const all = [];
  const make = (s, depth) => {
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
    if (node.st.status === S.RUNNING && node.st.seen !== tree.tickNo) halt(node, world);
  return { status, trace };
}

export function halt(node, world) {
  for (const c of node.children) halt(c, world);
  if (node.st.status === S.RUNNING) node.impl?.halt?.(world, node);
  node.st = fresh();
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
      if (++st.runFor > n) { halt(child, world); st.runFor = 0; return S.FAILURE; }
      return S.RUNNING;
    default:
      throw new Error(`unknown decorator "${type}"`);
  }
}
```

- [ ] **Step 4: Run the checks**

Run: `node scripts/check-bt.mjs`
Expected: every line `pass`, final line `interpreter: N checks pass`. If the pick and place walk through disagrees, trace it by hand against figure 1.6 and 1.7 of the textbook before changing either side.

- [ ] **Step 5: Commit**

```bash
git add src/bt/tree.js scripts/check-bt.mjs
git commit -m "feat(bt): the tick interpreter, asserted against the textbook"
```

---

### Task 3: The text form

**Files:**
- Create: `src/bt/parse.js`
- Modify: `scripts/check-bt.mjs` (append a section before the final summary lines)

**Interfaces:**
- Consumes: nothing from `tree.js`; produces specs `tree.js` accepts.
- Produces: `parse(text) -> spec`, `format(spec) -> text`, `class ParseError extends Error { line }`. Spec section 6 is the grammar.
- Spec shape: `{ kind, name?, mode?, m?, dec?: { type, n }, leaf?, args?: string[], children: [] }`. Leaf `kind` is decided by the caller of `build` through the leaf library, so `parse` emits `kind: "Leaf"` for any leaf line and `build` will reject it. Therefore `parse` takes an optional second argument `leaves` and, when given, sets `kind` to `"Action"` or `"Condition"` from `leaves[name].kind`, and throws `ParseError` for a name not in it. `format` prints leaves regardless of kind.

- [ ] **Step 1: Append the failing checks**

Insert before the `console.log(failed ? ...` line in `scripts/check-bt.mjs`:

```js
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
  ["FlyTo A\n  Land", 2, /leaf cannot have children/],
]) t(`parse error at line ${line}: ${re}`, () => {
  assert.throws(() => parse(text, LEAVES), (e) => e instanceof ParseError && e.line === line && re.test(e.message));
});
```

- [ ] **Step 2: Run to see the new checks fail**

Run: `node scripts/check-bt.mjs`
Expected: import failure for `../src/bt/parse.js`.

- [ ] **Step 3: Write the parser**

`src/bt/parse.js`:

```js
/* The text form of a tree. One node per line, two spaces per level.
 *
 *   ? root                     Fallback
 *     -> low battery {memory}  Sequence, with a mode
 *       BatteryBelow 30        a leaf and its arguments
 *       ReturnHome
 *     => 2 both                Parallel, threshold 2
 *     retry 3                  decorators: ! retry N timeout N repeat N
 *       Charge
 *
 * Used by the checkride editor and by every tree in the lesson data, so the
 * course has exactly one way to write a tree.
 */

export class ParseError extends Error {
  constructor(line, message) { super(`line ${line}: ${message}`); this.line = line; }
}

const MODES = new Set(["reactive", "memory", "keep"]);
const DECOS = { "!": "Inverter", retry: "Retry", timeout: "Timeout", repeat: "Repeat" };

function head(text, no) {
  const modeM = text.match(/\s*\{(\w+)\}\s*$/);
  let mode;
  if (modeM) {
    if (!MODES.has(modeM[1])) throw new ParseError(no, `unknown mode "{${modeM[1]}}"; use reactive, memory or keep`);
    mode = modeM[1];
    text = text.slice(0, modeM.index);
  }
  const words = text.trim().split(/\s+/);
  const [w0, ...rest] = words;
  if (w0 === "->") return { kind: "Sequence", name: rest.join(" ") || undefined, mode, children: [] };
  if (w0 === "?") return { kind: "Fallback", name: rest.join(" ") || undefined, mode, children: [] };
  if (w0 === "=>") {
    const m = Number(rest[0]);
    if (!Number.isInteger(m) || m < 1) throw new ParseError(no, "a Parallel needs a whole number threshold, like => 2");
    return { kind: "Parallel", m, name: rest.slice(1).join(" ") || undefined, children: [] };
  }
  if (mode) throw new ParseError(no, "a mode only belongs on -> or ?");
  if (DECOS[w0]) {
    let n = 0;
    if (w0 !== "!") {
      n = Number(rest[0]);
      if (!Number.isInteger(n) || n < 1) throw new ParseError(no, `${w0} needs a whole number, like ${w0} 3`);
    }
    return { kind: "Decorator", dec: { type: DECOS[w0], n }, children: [] };
  }
  return { kind: "Leaf", leaf: w0, args: rest, children: [] };
}

export function parse(text, leaves) {
  const lines = text.split(/\r?\n/);
  const stack = [];           // [{ node, depth, line }]
  let root = null;
  lines.forEach((raw, i) => {
    const no = i + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) return;
    const spaces = raw.match(/^ */)[0].length;
    if (spaces % 2) throw new ParseError(no, "indent by two spaces per level");
    const depth = spaces / 2;
    const node = head(raw, no);
    if (node.kind === "Leaf") {
      if (leaves) {
        const l = leaves[node.leaf];
        if (!l) throw new ParseError(no, `unknown leaf "${node.leaf}"`);
        node.kind = l.kind === "condition" ? "Condition" : "Action";
      }
    }
    if (depth === 0) {
      if (root) throw new ParseError(no, "only one root; indent this under it");
      root = node; stack.length = 0; stack.push({ node, depth, line: no });
      return;
    }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    if (!parent || parent.depth !== depth - 1) throw new ParseError(no, "indent jumps a level");
    if (parent.node.kind === "Action" || parent.node.kind === "Condition" || parent.node.kind === "Leaf")
      throw new ParseError(no, "a leaf cannot have children");
    if (parent.node.kind === "Decorator" && parent.node.children.length)
      throw new ParseError(no, "a decorator takes exactly one child");
    parent.node.children.push(node);
    stack.push({ node, depth, line: no });
  });
  if (!root) throw new ParseError(1, "empty tree");
  check(root, lines);
  return root;
}

/* Structural rules that need the whole tree: composites need a child, a
   decorator needs exactly one. Line numbers are recovered by walking the text
   again in order, which is cheap and keeps nodes free of bookkeeping. */
function check(root, lines) {
  const order = [];
  (function walk(n) { order.push(n); n.children.forEach(walk); })(root);
  const nos = lines.map((l, i) => (!l.trim() || l.trim().startsWith("#") ? null : i + 1)).filter(Boolean);
  order.forEach((n, i) => {
    const no = nos[i];
    if ((n.kind === "Sequence" || n.kind === "Fallback" || n.kind === "Parallel") && !n.children.length)
      throw new ParseError(no, `a ${n.kind} with no child`);
    if (n.kind === "Decorator" && n.children.length !== 1)
      throw new ParseError(no, "a decorator takes exactly one child");
  });
}

const SYM = { Sequence: "->", Fallback: "?", Parallel: "=>" };
const DSYM = { Inverter: "!", Retry: "retry", Timeout: "timeout", Repeat: "repeat" };

export function format(spec, depth = 0) {
  const pad = "  ".repeat(depth);
  let line;
  if (spec.kind === "Parallel") line = `=> ${spec.m}${spec.name ? " " + spec.name : ""}`;
  else if (SYM[spec.kind]) line = `${SYM[spec.kind]}${spec.name ? " " + spec.name : ""}${spec.mode ? ` {${spec.mode}}` : ""}`;
  else if (spec.kind === "Decorator") line = spec.dec.type === "Inverter" ? "!" : `${DSYM[spec.dec.type]} ${spec.dec.n}`;
  else line = [spec.leaf, ...(spec.args ?? [])].join(" ");
  return [pad + line, ...(spec.children ?? []).map((c) => format(c, depth + 1))].join("\n");
}
```

- [ ] **Step 4: Run the checks**

Run: `node scripts/check-bt.mjs`
Expected: all pass. The error line tests are exact; if `"-> a\n  retry 2\n    FlyTo A\n    Land"` reports line 3 instead of 4, the "exactly one child" check in `parse` fires on the fourth line's push, which is what the test wants, so fix the push order rather than the test.

- [ ] **Step 5: Commit**

```bash
git add src/bt/parse.js scripts/check-bt.mjs
git commit -m "feat(bt): the indented text form, parsed and formatted"
```

---

### Task 4: Tree layout

**Files:**
- Create: `src/bt/layout.js`
- Modify: `scripts/check-bt.mjs` (append before the summary lines)

**Interfaces:**
- Produces: `layout(spec, opts?) -> { nodes, edges, w, h }` with `nodes: [{ id, kind, label, x, y, w, h, spec }]` (x, y is the node centre), `edges: [{ from, to, x1, y1, x2, y2 }]`; `labelOf(spec) -> string`; default `opts = { nodeW: 96, nodeH: 34, hGap: 16, vGap: 46, pad: 8 }`. Node ids: `spec.id` if present, else pre-order `n0, n1, ...`, which is the same numbering `build` uses, so a trace from `tick` maps onto a layout of the same spec by id.

- [ ] **Step 1: Append the failing checks**

```js
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
t("labelOf names a node by its name, else its symbol or leaf", () => {
  assert.equal(labelOf({ kind: "Fallback", name: "root" }), "? root");
  assert.equal(labelOf({ kind: "Sequence" }), "->");
  assert.equal(labelOf({ kind: "Action", leaf: "FlyTo", args: ["A"] }), "FlyTo A");
  assert.equal(labelOf({ kind: "Decorator", dec: { type: "Retry", n: 3 } }), "retry 3");
  assert.equal(labelOf({ kind: "Parallel", m: 2 }), "=> 2");
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node scripts/check-bt.mjs`
Expected: import failure for `../src/bt/layout.js`.

- [ ] **Step 3: Write the layout**

`src/bt/layout.js`:

```js
/* Where each node of a tree sits. Shared by the authored plates (svg.js) and
   the live playground (tree-view.js) so a figure and the playground can never
   draw the same tree two different ways.
   Simple by design: every subtree is as wide as its children side by side, and
   a parent is centred over them. Trees in this course are small. */

const SYM = { Sequence: "->", Fallback: "?", Parallel: "=>" };
const DSYM = { Inverter: "!", Retry: "retry", Timeout: "timeout", Repeat: "repeat" };

export function labelOf(s) {
  if (s.kind === "Parallel") return `=> ${s.m}${s.name ? " " + s.name : ""}`;
  if (SYM[s.kind]) return `${SYM[s.kind]}${s.name ? " " + s.name : ""}`;
  if (s.kind === "Decorator") return s.dec.type === "Inverter" ? "!" : `${DSYM[s.dec.type]} ${s.dec.n}`;
  return [s.leaf, ...(s.args ?? [])].join(" ");
}

export function layout(spec, opts = {}) {
  const { nodeW = 96, nodeH = 34, hGap = 16, vGap = 46, pad = 8 } = opts;
  let n = 0;
  const nodes = [], edges = [];
  const width = (s) => {
    const kids = s.children ?? [];
    s._w = kids.length ? Math.max(nodeW, kids.reduce((a, c) => a + width(c), 0) + hGap * (kids.length - 1)) : nodeW;
    return s._w;
  };
  width(spec);
  const place = (s, left, depth) => {
    const id = s.id ?? `n${n++}`;
    const x = left + s._w / 2, y = pad + nodeH / 2 + depth * (nodeH + vGap);
    const node = { id, kind: s.kind, label: labelOf(s), x, y, w: nodeW, h: nodeH, spec: s };
    nodes.push(node);
    let cursor = left;
    for (const c of s.children ?? []) {
      const child = place(c, cursor, depth + 1);
      edges.push({ from: id, to: child.id, x1: x, y1: y + nodeH / 2, x2: child.x, y2: child.y - nodeH / 2 });
      cursor += c._w + hGap;
    }
    delete s._w;
    return node;
  };
  place(spec, pad, 0);
  const w = Math.max(...nodes.map((d) => d.x + d.w / 2)) + pad;
  const h = Math.max(...nodes.map((d) => d.y + d.h / 2)) + pad;
  return { nodes, edges, w, h };
}
```

Note the pre-order numbering: `place` assigns the id before recursing into children, and `build` in `tree.js` assigns ids in `make` before recursing too. Both are pre-order. The check asserts it.

- [ ] **Step 4: Run the checks**

Run: `node scripts/check-bt.mjs`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/bt/layout.js scripts/check-bt.mjs
git commit -m "feat(bt): tree layout shared by figures and the playground"
```

---

### Task 5: The drone world and the headless runner

**Files:**
- Create: `src/world/drone.js`, `src/bt/run.js`, `scripts/check-world.mjs`

**Interfaces:**
- Consumes: `S`, `build`, `tick`, `makeBlackboard` from `tree.js`; `parse` from `parse.js`.
- Produces:
  - `DRONE = { name, scenarios, init(scenarioId) -> state, step(state, dt), leaves, hazards, draw(state) -> svgString, view(state) -> object }` and constants `DT, SPEED, TURN_RATE, DRAIN, CHARGE_RATE, ARRIVE, MAP_W, MAP_H`.
  - `state` fields: `x, y, heading, flying, target, battery, dead, home, waypoints, goal, noFly, wind, landed, charging, track, mutations, t, goalMoves`.
  - `leaves[name] = { kind, doc, tick(state, bb, args, node), halt?(state) }` for: `BatteryBelow, BatteryAbove, AtWaypoint, AtHome, InNoFly, GoalIs, WindAbove, Landed` (conditions) and `FlyTo, ReturnHome, Land, TakeOff, Charge, Hover, ExitNoFly, Drop` (actions).
  - `hazards = [{ id, label, apply(state) }]` with ids `battery12, gust, calm, nofly, goalB`.
  - `run({ world, scenario, tree, script, ticks, until }) -> { state, bb, history, ticks, passed }` in `run.js`; `tree` is text or a spec; `script` is `[{ at: tickNo, hazard: id }]`; `until(state, history)` optional early stop returning true; `history[i] = { t, x, y, heading, battery, target, status, trace, landed }`.
- Any world file that exports the same object shape can replace `DRONE` in `plays.js` later (the home robot). Nothing in `run.js`, `playground.js` or `tree-view.js` may import `drone.js` by name.

- [ ] **Step 1: Write the failing checks**

`scripts/check-world.mjs`:

```js
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
```

- [ ] **Step 2: Run to see it fail**

Run: `node scripts/check-world.mjs`
Expected: import failure for `../src/world/drone.js`.

- [ ] **Step 3: Write the world**

`src/world/drone.js`:

```js
/* The drone world. A dot with a heading on a top down map, a battery, a home
 * pad, three waypoints, an optional no fly zone and wind.
 *
 * This is NOT the Cessna from the flight course and it is not trying to be. It
 * is kinematic: it turns at a fixed rate and flies at a fixed speed, and the
 * numbers below are chosen for the lesson, not measured from an aircraft. The
 * lesson is the mind, not the airframe. What has to be honest is the tick: the
 * tree really is asked every DT seconds, and the leaves really do only what
 * they say.
 *
 * Every world exports the same five things: init, step, leaves, hazards, draw,
 * plus view. A second world (a home robot with a dock) is a second file with
 * the same shape; nothing outside this file may know it is a drone.
 */
import { S } from "../bt/tree.js";
import { craft } from "../data/svg.js";

export const DT = 0.1;             // seconds per tick
export const SPEED = 10;           // m/s, chosen for the lesson
export const TURN_RATE = 120;      // deg/s, chosen for the lesson
export const DRAIN = 0.8;          // percent per second airborne: 125 s of flight.
                                   // Derived from the checkride: a drop to 12 percent at tick 80 (about
                                   // 70 m out) must be survivable by turning back (7 s, 5.6 percent) and
                                   // fatal if the delivery goes on (about 26 s more, 20.6 percent).
export const CHARGE_RATE = 5;      // percent per second on the pad
export const ARRIVE = 3;           // m, "there"
export const MAP_W = 200, MAP_H = 140;   // m

/* heading: degrees clockwise from north, north is up the screen. */
const toRad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/* Every change to the world goes through here so a Condition that changes
   anything is caught by the interpreter's mutation counter. */
const mut = (s) => { s.mutations++; };

const SCENARIOS = {
  delivery: {
    home: { x: 20, y: 120 },
    waypoints: { A: { x: 160, y: 30 }, B: { x: 170, y: 110 }, C: { x: 60, y: 30 } },
    goal: "A",
  },
};

export function init(scenarioId = "delivery") {
  const sc = SCENARIOS[scenarioId] ?? SCENARIOS.delivery;
  return {
    x: sc.home.x, y: sc.home.y, heading: 0, flying: false, target: null,
    battery: 100, dead: false, home: { ...sc.home },
    waypoints: Object.fromEntries(Object.entries(sc.waypoints).map(([k, v]) => [k, { ...v }])),
    goal: sc.goal, noFly: [], wind: { x: 0, y: 0 }, landed: true, charging: false,
    delivered: false, track: [], mutations: 0, t: 0, goalMoves: 0,
  };
}

export function step(s, dt = DT) {
  s.t += dt;
  if (s.dead) return;
  if (!s.landed) {
    if (s.target) {
      const want = (Math.atan2(s.target.x - s.x, -(s.target.y - s.y)) * 180) / Math.PI;   // 0 = north
      let d = ((want - s.heading + 540) % 360) - 180;
      const maxTurn = TURN_RATE * dt;
      d = Math.max(-maxTurn, Math.min(maxTurn, d));
      s.heading = (s.heading + d + 360) % 360;
      if (dist(s, s.target) > ARRIVE) {
        s.x += Math.sin(toRad(s.heading)) * SPEED * dt;
        s.y -= Math.cos(toRad(s.heading)) * SPEED * dt;
      }
    }
    s.x += s.wind.x * dt;
    s.y += s.wind.y * dt;
    s.battery = Math.max(0, s.battery - DRAIN * dt);
    if (s.battery <= 0) { s.dead = true; s.target = null; }
    if (s.track.length === 0 || dist(s.track[s.track.length - 1], s) > 1) s.track.push({ x: s.x, y: s.y });
  } else if (s.charging) {
    s.battery = Math.min(100, s.battery + CHARGE_RATE * dt);
  }
}

const resolve = (s, name) => {
  if (name === "Goal") name = s.goal;
  if (name === "Home") return s.home;
  const w = s.waypoints[name];
  if (!w) throw new Error(`no waypoint "${name}"`);
  return w;
};
const flyTo = (s, p) => {
  if (s.dead) return S.FAILURE;
  if (s.landed) { s.landed = false; s.charging = false; mut(s); }
  if (!s.target || s.target.x !== p.x || s.target.y !== p.y) { s.target = { ...p }; mut(s); }
  return dist(s, p) <= ARRIVE ? S.SUCCESS : S.RUNNING;
};
const clearTarget = (s) => { if (s.target) { s.target = null; mut(s); } };
const cond = (doc, f) => ({ kind: "condition", doc, tick: (s, bb, args) => (f(s, args) ? S.SUCCESS : S.FAILURE) });

export const leaves = {
  BatteryBelow: cond("battery below N percent", (s, [n]) => s.battery < Number(n)),
  BatteryAbove: cond("battery above N percent", (s, [n]) => s.battery > Number(n)),
  AtWaypoint: cond("within 3 m of waypoint NAME", (s, [n]) => dist(s, resolve(s, n)) <= ARRIVE),
  AtHome: cond("within 3 m of the home pad", (s) => dist(s, s.home) <= ARRIVE),
  InNoFly: cond("inside a no fly zone", (s) => s.noFly.some((r) => inRect(s, r))),
  GoalIs: cond("the goal is waypoint NAME", (s, [n]) => s.goal === n),
  WindAbove: cond("wind speed above N m/s", (s, [n]) => Math.hypot(s.wind.x, s.wind.y) > Number(n)),
  Landed: cond("on the ground", (s) => s.landed),

  FlyTo: { kind: "action", doc: "fly to waypoint NAME (or Goal); Running until there",
    tick: (s, bb, [n]) => flyTo(s, resolve(s, n)), halt: clearTarget },
  ReturnHome: { kind: "action", doc: "fly to the home pad; Running until there",
    tick: (s) => flyTo(s, s.home), halt: clearTarget },
  Land: { kind: "action", doc: "land where you are; Success at once",
    tick: (s) => { if (s.dead) return S.FAILURE; if (!s.landed) { s.landed = true; s.target = null; mut(s); } return S.SUCCESS; } },
  TakeOff: { kind: "action", doc: "leave the ground; Success at once",
    tick: (s) => { if (s.dead) return S.FAILURE; if (s.landed) { s.landed = false; s.charging = false; mut(s); } return S.SUCCESS; } },
  Charge: { kind: "action", doc: "charge on the pad; Failure away from home, Running until full",
    tick: (s) => {
      if (dist(s, s.home) > ARRIVE) return S.FAILURE;
      if (s.battery >= 100) { if (s.charging) { s.charging = false; mut(s); } return S.SUCCESS; }
      if (!s.landed || !s.charging) { s.landed = true; s.charging = true; s.target = null; mut(s); }
      return S.RUNNING;
    },
    halt: (s) => { if (s.charging) { s.charging = false; mut(s); } } },
  Hover: { kind: "action", doc: "hold position; always Running",
    tick: (s) => { if (s.dead) return S.FAILURE; if (s.landed) { s.landed = false; mut(s); } clearTarget(s); return S.RUNNING; } },
  ExitNoFly: { kind: "action", doc: "fly to the nearest edge of the zone you are in; Running until out",
    tick: (s) => {
      const r = s.noFly.find((z) => inRect(s, z));
      if (!r) { clearTarget(s); return S.SUCCESS; }
      const exits = [{ x: r.x - 6, y: s.y }, { x: r.x + r.w + 6, y: s.y }, { x: s.x, y: r.y - 6 }, { x: s.x, y: r.y + r.h + 6 }];
      const p = exits.reduce((a, b) => (dist(s, a) < dist(s, b) ? a : b));
      flyTo(s, p);
      return S.RUNNING;
    }, halt: clearTarget },
  Drop: { kind: "action", doc: "drop the parcel; Success only at the goal",
    tick: (s) => {
      if (dist(s, resolve(s, "Goal")) > ARRIVE) return S.FAILURE;
      if (!s.delivered) { s.delivered = true; mut(s); }
      return S.SUCCESS;
    } },
};

export const hazards = [
  { id: "battery12", label: "Battery drops to 12 percent", apply: (s) => { s.battery = Math.min(s.battery, 12); mut(s); } },
  { id: "gust", label: "Gust: 4 m/s wind from the west", apply: (s) => { s.wind = { x: 4, y: 0 }; mut(s); } },
  { id: "calm", label: "Wind stops", apply: (s) => { s.wind = { x: 0, y: 0 }; mut(s); } },
  { id: "nofly", label: "A no fly zone appears on the path", apply: (s) => { s.noFly = [{ x: 80, y: 40, w: 50, h: 40 }]; mut(s); } },
  { id: "goalB", label: "The goal moves to B", apply: (s) => { s.goal = s.goal === "B" ? "C" : "B"; s.goalMoves++; mut(s); } },
];

/* What the blackboard table shows. Plain values only. */
export const view = (s) => ({
  battery: `${s.battery.toFixed(0)} %`, goal: s.goal, landed: s.landed, charging: s.charging,
  target: s.target ? `${s.target.x.toFixed(0)}, ${s.target.y.toFixed(0)}` : "none",
  wind: `${Math.hypot(s.wind.x, s.wind.y).toFixed(1)} m/s`, noFly: s.noFly.length, delivered: s.delivered,
});

/* The map. Colour here is chrome, not an answer: the craft, the pad and the
   zones are ink and grey. Only the battery bar borrows the status tokens,
   because a low battery IS a Failure waiting to happen. */
export function draw(s) {
  const wp = Object.entries(s.waypoints).map(([k, p]) =>
    `<circle class="wp${s.goal === k ? " wp--goal" : ""}" cx="${p.x}" cy="${p.y}" r="3"/>` +
    `<text class="wp-t" x="${p.x + 5}" y="${p.y + 3}">${k}</text>`).join("");
  const nf = s.noFly.map((r) => `<rect class="nofly" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`).join("");
  const tr = s.track.length > 1 ? `<polyline class="track" points="${s.track.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}"/>` : "";
  const wind = Math.hypot(s.wind.x, s.wind.y) > 0
    ? `<g class="wind" transform="translate(12 12) rotate(${(Math.atan2(s.wind.x, -s.wind.y) * 180) / Math.PI})"><path d="M0 6 L0 -6 M-3 -3 L0 -6 L3 -3"/></g>` : "";
  const bat = `<rect class="bat" x="150" y="6" width="40" height="5"/>` +
    `<rect class="bat-f${s.battery < 30 ? " low" : ""}" x="150" y="6" width="${(40 * s.battery) / 100}" height="5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" class="map" role="img" aria-label="Top down map of the drone">` +
    `<rect class="pad" x="${s.home.x - 5}" y="${s.home.y - 5}" width="10" height="10"/>` +
    nf + tr + wp + wind + bat +
    (s.dead ? `<path class="dead" d="M${s.x - 4} ${s.y - 4} L${s.x + 4} ${s.y + 4} M${s.x + 4} ${s.y - 4} L${s.x - 4} ${s.y + 4}"/>`
      : craft(s.x, s.y, s.heading, { landed: s.landed })) +
    `</svg>`;
}

export const DRONE = { name: "drone", scenarios: Object.keys(SCENARIOS), init, step, leaves, hazards, draw, view };
```

`craft` does not exist until Task 6. For this task add a temporary `src/data/svg.js` containing only:

```js
export function craft(cx, cy, heading, { landed = false } = {}) {
  return `<g class="craft${landed ? " craft--landed" : ""}" transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${heading.toFixed(2)})"><path d="M0 -6 L4 5 L0 3 L-4 5 Z"/></g>`;
}
```

Task 6 replaces this file with the full primitives and keeps this function unchanged.

- [ ] **Step 4: Write the runner**

`src/bt/run.js`:

```js
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
```

- [ ] **Step 5: Run the checks and tune the numbers**

Run: `node scripts/check-world.mjs`
Expected: all pass. The two `run:` checks are the ones that may need tuning. The rule is fixed by the checkride: after a drop to 12 percent at tick 80 (8 s out, about 70 m from home), the reactive tree must get home alive and the memory tree must die. With `DRAIN = 0.8` the return costs about 5.6 percent and finishing the delivery about 20.6 percent, so both hold with margin. If you change `SPEED`, `DRAIN` or the map, re-derive those two numbers in the comment next to `DRAIN`.

- [ ] **Step 6: Commit**

```bash
git add src/world/drone.js src/bt/run.js src/data/svg.js scripts/check-world.mjs
git commit -m "feat(world): the kinematic drone with a heading, and the headless runner"
```

---

### Task 6: Figure primitives

**Files:**
- Create: `src/data/svg.js` (replacing the stub), `scripts/check-figures.mjs`, `src/data/diagrams.js` (one figure, to prove the check runs)

**Interfaces:**
- Consumes: `layout`, `labelOf` from `src/bt/layout.js`.
- Produces from `svg.js`: `line, dashed, path, poly, dot, chip, note, arc, frame, figure, n, esc` (copied from the flight course, same signatures, force only helpers dropped), plus `node(kind, cx, cy, label, { status, w, h, dirty, href })`, `edge(x1, y1, x2, y2, { pulse })`, `craft(cx, cy, heading, { landed })`, `tree(spec, { x, y, status, pulse, hrefs, nodeW, nodeH, hGap, vGap })`. Kinds for `k()`: `ok, fail, run, tick, ref, ink`. Status values for nodes: `"ok" | "fail" | "run" | "idle"`.
- `DIAGRAMS` default export of `diagrams.js`: `{ [figId]: () => svgString }`.

- [ ] **Step 1: Copy the figure check and the primitives**

```bash
cp ../flight-dynamics/scripts/check-figures.mjs scripts/
cp ../flight-dynamics/src/data/svg.js src/data/svg.js
```

In `src/data/svg.js`: delete `arrow`, `component`, `moment`, `blob`, `turnCircle`, `trackPath`, `aircraft`, `AIRFRAME`, `DETAIL`, `cgMark`, `airfoil`, `curve` and the `HEADS` list. Replace `KIND` with:

```js
const KIND = { ok: "k-ok", fail: "k-fail", run: "k-run", tick: "k-tick", ref: "k-ref", ink: "k-ink" };
```

Replace `defs()` with one that emits a hatch pattern for dirty conditions and no arrowheads:

```js
function defs() {
  return `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>`;
}
```

- [ ] **Step 2: Add the tree primitives**

Append to `src/data/svg.js` before the `export` block, and add `node, edge, craft, tree` to the export list:

```js
import { layout } from "../bt/layout.js";

/* ── nodes: shape is the kind, fill is the answer ─────────────────────────
   Textbook notation (Colledanchise and Ogren, table 1.1): Sequence is a box
   with an arrow, Fallback a box with a question mark, Parallel a box with a
   double arrow, Decorator a rhombus, Action a rounded box, Condition an
   ellipse. Custom is for a real world node we draw but do not run (Nav2). */
function node(kind, cx, cy, label, { status = "idle", w = 96, h = 34, dirty = false, href = null } = {}) {
  const x = cx - w / 2, y = cy - h / 2;
  let shape;
  if (kind === "Condition") shape = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(w / 2)}" ry="${n(h / 2)}"/>`;
  else if (kind === "Decorator") shape = `<polygon points="${n(cx)},${n(y)} ${n(x + w)},${n(cy)} ${n(cx)},${n(y + h)} ${n(x)},${n(cy)}"/>`;
  else if (kind === "Action") shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}" rx="8"/>`;
  else if (kind === "Custom") shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}"/><rect x="${n(x + 3)}" y="${n(y + 3)}" width="${w - 6}" height="${h - 6}"/>`;
  else shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}"/>`;
  const body = `<g class="node node--${kind.toLowerCase()} st-${status}${dirty ? " dirty" : ""}">${shape}` +
    `<text class="node-t" x="${n(cx)}" y="${n(cy)}">${esc(label)}</text></g>`;
  return href ? `<a href="${esc(href)}">${body}</a>` : body;
}

/* An edge, optionally carrying the tick as a dot part way down it. `pulse` is
   0..1 along the edge. */
function edge(x1, y1, x2, y2, { pulse = null } = {}) {
  let out = `<line class="edge" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
  if (pulse != null) out += `<circle class="pulse" cx="${n(x1 + (x2 - x1) * pulse)}" cy="${n(y1 + (y2 - y1) * pulse)}" r="4"/>`;
  return out;
}

/* The drone, nose up at heading 0, rotated clockwise. Same glyph on the map
   and on the plates. */
function craft(cx, cy, heading, { landed = false } = {}) {
  return `<g class="craft${landed ? " craft--landed" : ""}" transform="translate(${n(cx)} ${n(cy)}) rotate(${n(heading)})"><path d="M0 -6 L4 5 L0 3 L-4 5 Z"/></g>`;
}

/* A whole tree from a spec, laid out by layout.js. `status` maps node id to
   ok | fail | run; `pulse` maps an edge "from>to" to 0..1; `hrefs` maps id to
   a link (the index plate). */
function tree(spec, { x = 0, y = 0, status = {}, dirty = {}, pulse = {}, hrefs = {}, ...opts } = {}) {
  const L = layout(spec, opts);
  const edges = L.edges.map((e) => edge(x + e.x1, y + e.y1, x + e.x2, y + e.y2, { pulse: pulse[`${e.from}>${e.to}`] ?? null })).join("");
  const nodes = L.nodes.map((d) => node(d.kind, x + d.x, y + d.y, d.label,
    { status: status[d.id] ?? "idle", w: d.w, h: d.h, dirty: !!dirty[d.id], href: hrefs[d.id] ?? null })).join("");
  return `<g class="tree">${edges}${nodes}</g>`;
}
```

- [ ] **Step 3: Style the node classes**

Append to `src/styles/app.css` under the figures section:

```css
/* ── trees: shape is the kind, fill is the answer ─────────────────────── */
.node rect, .node ellipse, .node polygon { fill: var(--paper); stroke: var(--ink); stroke-width: var(--w-line); }
.node .node-t { font-family: var(--f-mono); font-size: 12px; fill: var(--ink); text-anchor: middle; dominant-baseline: central; }
.node.st-ok rect, .node.st-ok ellipse, .node.st-ok polygon { stroke: var(--s-ok); fill: color-mix(in srgb, var(--s-ok) 22%, var(--paper)); }
.node.st-fail rect, .node.st-fail ellipse, .node.st-fail polygon { stroke: var(--s-fail); fill: color-mix(in srgb, var(--s-fail) 22%, var(--paper)); }
.node.st-run rect, .node.st-run ellipse, .node.st-run polygon { stroke: var(--s-run); fill: color-mix(in srgb, var(--s-run) 26%, var(--paper)); }
.node.dirty ellipse { fill: url(#hatch); }
.hatch { stroke: var(--s-fail); stroke-width: 1; }
.edge { stroke: var(--ink-3); stroke-width: var(--w-rule); }
.pulse { fill: var(--s-tick); }
.craft path { fill: var(--ink); }
.craft--landed path { fill: var(--paper); stroke: var(--ink); stroke-width: 1; }
.map { width: 100%; height: auto; background: var(--paper-sunk); border: var(--w-hair) solid var(--rule); }
.map .pad { fill: none; stroke: var(--ink); stroke-width: .8; }
.map .wp { fill: var(--paper); stroke: var(--ink); stroke-width: .8; }
.map .wp--goal { fill: var(--ink); }
.map .wp-t { font-family: var(--f-mono); font-size: 6px; fill: var(--ink); }
.map .nofly { fill: url(#hatch); stroke: var(--s-fail); stroke-width: .6; }
.map .track { fill: none; stroke: var(--ink-3); stroke-width: .5; stroke-dasharray: 1 1; }
.map .wind path { fill: none; stroke: var(--ink-2); stroke-width: .8; }
.map .bat { fill: none; stroke: var(--ink); stroke-width: .5; }
.map .bat-f { fill: var(--s-ok); } .map .bat-f.low { fill: var(--s-fail); }
.map .dead path { stroke: var(--s-fail); stroke-width: 1.2; }
```

The map's `url(#hatch)` needs the pattern inside the map svg too: in `drone.js` `draw`, add `<defs><pattern id="hatch-map" ...>` with the same pattern and use `url(#hatch-map)` in the nofly rect (an id inside another svg is not visible from here). Do that now.

- [ ] **Step 4: One figure and the check**

`src/data/diagrams.js`:

```js
/* Every authored figure in the project. Each builder returns a complete SVG.
   Colour is never named here, only an answer, so the colour rule holds by
   construction. Trees are written in the text form and laid out by layout.js,
   so a plate and the playground can never disagree about a tree's shape. */
import { figure, tree, chip, note, craft, line, dashed } from "./svg.js";
import { parse } from "../bt/parse.js";
import { DRONE } from "../world/drone.js";

const D = {};
/* Leaves are classified so the plate draws an ellipse for a condition. The
   drone's real leaves plus the few invented for a figure. */
const FIG_LEAVES = { ...DRONE.leaves,
  NudgedNorth: { kind: "condition" }, Delivered: { kind: "condition" }, SetMode: { kind: "action" } };
const T = (text) => parse(text, FIG_LEAVES);

D["tick/root-to-leaf"] = () => {
  const spec = T("? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n  -> deliver\n    FlyTo A\n    Drop");
  const at = { x: 150, y: 40 };
  return figure({
    title: "A tick travels from the root to a leaf and an answer comes back",
    desc: "A seven node tree. The tick starts at the root, goes down the first branch, reaches the condition, which answers Failure, so the tick moves to the second branch and reaches FlyTo, which answers Running.",
    captions: [
      "A tree. Nothing has happened yet.",
      "A tick leaves the root and goes to the first child.",
      "The condition answers Failure, so the Sequence answers Failure.",
      "The Fallback tries its second child. FlyTo answers Running. So does the root.",
    ],
    states: [
      tree(spec, at),
      tree(spec, { ...at, pulse: { "n0>n1": 0.5 } }),
      tree(spec, { ...at, status: { n2: "fail", n1: "fail" } }),
      tree(spec, { ...at, status: { n2: "fail", n1: "fail", n5: "run", n4: "run", n0: "run" } }),
    ],
  });
};

export default D;
```

In `scripts/check-figures.mjs` the transform parser handles `translate` and `rotate`; make sure it also composes `scale(s)` (the Nav2 plate in Task 10 uses one). Text metrics are read from `.chip-t`, `.sm`, `.note` classes. Add `.node-t` to the `FS` function as 12px so node labels are measured for the inside-the-viewBox rule, but do NOT include `node-t` in the overlap pairs: a later state legitimately redraws the same tree over the earlier one with new fills, and identical positions would read as overlap.

Run: `node scripts/check-figures.mjs`
Expected: passes for the one figure (4 states, captions, no overlap, everything inside the viewBox).

- [ ] **Step 5: Run every check so far and commit**

Run: `node scripts/check-bt.mjs && node scripts/check-world.mjs && node scripts/check-figures.mjs`
Expected: all pass.

```bash
git add -A
git commit -m "feat(figures): tree primitives, the craft glyph, and the first plate"
```

---

### Task 7: Sourced content files and the content check

**Files:**
- Create: `content/sources.json`, `content/dialects.json`, `content/nav2.xml`, `content/visual-grammar.md`, `src/data/lessons.js` (spine and chapter 1 only), `src/data/deck.js`, `src/data/videos.js`, `src/data/plays.js` (empty map), `scripts/check-content.mjs`

**Interfaces:**
- Produces: `SOURCES` shape `{ [id]: { title, url, grade, read } }`; `LESSONS`, `PARTS`, `COURSE`, `partOf`, `lessonsIn` from `lessons.js` with block types `p, concrete, aside, myth{claim,truth,src}, fact{text,src}, fig{id}, play{id}, check{q,options,answer,why}, videos, ref{ch,why}`; `PLAYS` from `plays.js`; `buildDeck()` from `deck.js`; `VIDEOS` from `videos.js`.

- [ ] **Step 1: Fetch the Nav2 tree verbatim**

```bash
curl -sL https://raw.githubusercontent.com/ros-navigation/navigation2/main/nav2_bt_navigator/behavior_trees/navigate_to_pose_w_replanning_and_recovery.xml -o content/nav2.xml
head -5 content/nav2.xml
```
Expected: the file starts with an XML comment or `<root`. Add a first line comment inside the file: `<!-- Copied verbatim from ros-navigation/navigation2 (Apache 2.0) on 2026-09-22 for drawing only. See NOTICE. -->`.

- [ ] **Step 2: Write sources.json**

`content/sources.json`. Every id below is used by a chapter in Tasks 8 and 9; do not rename any.

```json
{
  "$comment": "Every source a lesson cites. grade is a sentence in words a reader understands; read says what was actually opened. A forum post may only be cited by a myth's 'who believes this' line, never by a fact.",
  "sources": {
    "book": { "title": "Colledanchise and Ogren, Behavior Trees in Robotics and AI: An Introduction (arXiv 1709.00084v6, CRC Press 2018)", "url": "https://arxiv.org/abs/1709.00084", "grade": "the textbook itself, peer reviewed and published", "read": "chapters 1 to 3 in full from the PDF text" },
    "survey": { "title": "Iovino, Scukins, Styrud, Ogren, Smith, A Survey of Behavior Trees in Robotics and AI (Robotics and Autonomous Systems 2022)", "url": "https://arxiv.org/abs/2005.05842", "grade": "peer reviewed survey", "read": "sections 1, 2 and 5 in full" },
    "annrev": { "title": "Ogren and Sprague, Behavior Trees in Robot Control Systems (Annual Review of Control, Robotics, and Autonomous Systems 2022)", "url": "https://arxiv.org/abs/2203.13083", "grade": "peer reviewed review", "read": "sections 1 to 3 in full" },
    "conc": { "title": "Colledanchise and Natale, Handling Concurrency in Behavior Trees (IEEE Transactions on Robotics)", "url": "https://arxiv.org/abs/2110.11813", "grade": "peer reviewed", "read": "abstract and sections I and II" },
    "sle20": { "title": "Ghzouli, Berger, Johnsen, Dragule, Wasowski, Behavior Trees in Action: A Study of Robotics Applications (SLE 2020)", "url": "https://www.cse.chalmers.se/~bergert/paper/2020-sle-behaviortrees.pdf", "grade": "peer reviewed empirical study", "read": "in full, author copy" },
    "tse23": { "title": "Ghzouli et al., Behavior Trees and State Machines in Robotics Applications (IEEE Transactions on Software Engineering 2023)", "url": "https://arxiv.org/abs/2208.04211", "grade": "peer reviewed empirical study", "read": "sections 1, 4, 5, 6 and 9" },
    "btcpp-basics": { "title": "BehaviorTree.CPP documentation, Introduction to BTs", "url": "https://www.behaviortree.dev/docs/learn-the-basics/BT_basics", "grade": "the library's own documentation", "read": "in full" },
    "btcpp-seq": { "title": "BehaviorTree.CPP documentation, Sequences", "url": "https://www.behaviortree.dev/docs/nodes-library/SequenceNode", "grade": "the library's own documentation", "read": "in full, including the comparison table" },
    "btcpp-fb": { "title": "BehaviorTree.CPP documentation, Fallback", "url": "https://www.behaviortree.dev/docs/nodes-library/FallbackNode", "grade": "the library's own documentation", "read": "in full, including the comparison table" },
    "btcpp-async": { "title": "BehaviorTree.CPP documentation, Asynchronous Actions", "url": "https://www.behaviortree.dev/docs/guides/asynchronous_nodes", "grade": "the library's own documentation", "read": "in full" },
    "btcpp-dec": { "title": "BehaviorTree.CPP documentation, Decorators", "url": "https://www.behaviortree.dev/docs/nodes-library/DecoratorNode", "grade": "the library's own documentation", "read": "in full" },
    "btcpp-ports": { "title": "BehaviorTree.CPP documentation, Blackboard and ports", "url": "https://www.behaviortree.dev/docs/tutorial-basics/tutorial_02_basic_ports", "grade": "the library's own documentation", "read": "in full" },
    "pytrees-comp": { "title": "py_trees documentation, Composites", "url": "https://py-trees.readthedocs.io/en/devel/composites.html", "grade": "the library's own documentation", "read": "in full" },
    "pytrees-bb": { "title": "py_trees documentation, Blackboards", "url": "https://py-trees.readthedocs.io/en/devel/blackboards.html", "grade": "the library's own documentation", "read": "in full" },
    "nav2-xml": { "title": "Nav2, navigate_to_pose_w_replanning_and_recovery.xml", "url": "https://raw.githubusercontent.com/ros-navigation/navigation2/main/nav2_bt_navigator/behavior_trees/navigate_to_pose_w_replanning_and_recovery.xml", "grade": "the project's own source file", "read": "in full, copied to content/nav2.xml" },
    "nav2-walk": { "title": "Nav2 documentation, Detailed Behavior Tree Walkthrough", "url": "https://docs.nav2.org/rolling/getting_started/nav2_behavior_trees/detailed_behavior_tree_walkthrough/detailed_behavior_tree_walkthrough/", "grade": "the project's own documentation", "read": "in full" },
    "nav2-nodes": { "title": "Nav2 documentation, Nav2 Specific Nodes", "url": "https://docs.nav2.org/rolling/getting_started/nav2_behavior_trees/nav2_specific_nodes/nav2_specific_nodes/", "grade": "the project's own documentation", "read": "in full" },
    "isla05": { "title": "Damian Isla, Handling Complexity in the Halo 2 AI (GDC 2005 proceeding)", "url": "https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai", "grade": "the original talk's own write up", "read": "in full" },
    "starterkit": { "title": "Champandard and Dunstan, The Behavior Tree Starter Kit (Game AI Pro, chapter 6, 2013)", "url": "https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter06_The_Behavior_Tree_Starter_Kit.pdf", "grade": "the chapter itself, free from the publisher", "read": "in full" },
    "francis": { "title": "Anthony Francis, Overcoming Pitfalls in Behavior Tree Design (Game AI Pro 3, chapter 9)", "url": "https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter09_Overcoming_Pitfalls_in_Behavior_Tree_Design.pdf", "grade": "the chapter itself, free from the publisher", "read": "in full" },
    "simpson": { "title": "Chris Simpson, Behavior trees for AI: How they work (Gamasutra 2014)", "url": "https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work", "grade": "a widely read tutorial by a practitioner", "read": "in full" },
    "anguelov": { "title": "Bobby Anguelov, Behavior Trees: Breaking the Cycle of Misuse (2020)", "url": "https://takinginitiative.net/2020/01/07/behavior-trees-breaking-the-cycle-of-misuse/", "grade": "a practitioner's own critique", "read": "in full, article and PDF" },
    "arborist": { "title": "Vehkala, Anguelov, Weber, AI Arborist: Proper Cultivation and Care for Your Behavior Trees (GDC 2017 slides)", "url": "https://media.gdcvault.com/gdc2017/Presentations/Vehkala_AI%20Arborist.pdf", "grade": "the talk's own slides", "read": "slide text in full, no speaker notes" },
    "ue-overview": { "title": "Unreal Engine documentation, Behavior Tree Overview", "url": "https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview", "grade": "the engine's own documentation", "read": "in full" },
    "ue-dec": { "title": "Unreal Engine documentation, Behavior Tree Node Reference: Decorators", "url": "https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-behavior-tree-node-reference-decorators", "grade": "the engine's own documentation", "read": "in full" },
    "unity": { "title": "Unity Behavior package manual", "url": "https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/index.html", "grade": "the engine's own documentation", "read": "index, node types and behavior graph pages" },
    "limbo": { "title": "LimboAI documentation, Introduction to Behavior Trees", "url": "https://limboai.readthedocs.io/en/latest/behavior-trees/introduction.html", "grade": "the addon's own documentation", "read": "introduction and the BTSequence and BTDynamicSelector class pages" },
    "klockner": { "title": "Klockner, Behavior Trees for UAV Mission Management (DLR, INFORMATIK 2013)", "url": "https://elib.dlr.de/91679/1/kloeckner2013behavior.pdf", "grade": "peer reviewed, from the DLR library", "read": "pages 1 to 6" },
    "aerostack2": { "title": "Fernandez-Cortizas et al., Aerostack2 (arXiv 2303.18237) and the as2_behavior_tree docs", "url": "https://arxiv.org/pdf/2303.18237", "grade": "the project's own paper and documentation", "read": "paper pages 1 to 6; the behaviors docs page; the as2_behavior_tree folder" },
    "px4": { "title": "PX4 documentation, Modules Reference: System (commander)", "url": "https://docs.px4.io/main/en/modules/modules_system.html", "grade": "the autopilot's own documentation", "read": "in full, with the flight modes concept page" },
    "ardupilot": { "title": "ArduPilot Copter documentation, Flight Modes", "url": "https://ardupilot.org/copter/docs/flight-modes.html", "grade": "the autopilot's own documentation", "read": "in full" },
    "drone-trees": { "title": "Bristol Flight Lab, drone_trees", "url": "https://github.com/BristolFlightLab/drone_trees", "grade": "the project's own repository", "read": "README in full" },
    "ogren12": { "title": "Ogren, Increasing Modularity of UAV Control Systems using Computer Game Behavior Trees (AIAA GNC 2012)", "url": "https://api.openalex.org/works/doi:10.2514/6.2012-4458", "grade": "peer reviewed; abstract only, the paper is closed access", "read": "abstract only" },
    "plexil": { "title": "PLEXIL documentation (NASA Ames)", "url": "https://plexil-group.github.io/plexil_docs/", "grade": "the project's own documentation", "read": "front page in full" },
    "jpl-heli": { "title": "Di Pierno, Hewitt, Weiss, Brockers, Hybrid Autonomy Framework for a Future Mars Science Helicopter (arXiv 2509.01980)", "url": "https://arxiv.org/html/2509.01980v1", "grade": "a research paper with JPL authors; a design study, not flight software", "read": "in full" },
    "kth": { "title": "Petter Ogren, video lectures on behavior trees (KTH)", "url": "https://www.kth.se/profile/petter/page/video-lectures-on-behavior-trees", "grade": "the author's own lecture list", "read": "the list page; the lectures are not transcribed" },
    "robohub": { "title": "Sebastian Castro, Introduction to behavior trees (Robohub 2021)", "url": "https://robohub.org/introduction-to-behavior-trees/", "grade": "an independent tutorial", "read": "in full" },
    "se-decision": { "title": "GameDev StackExchange, Decision tree vs behavior tree (74 votes)", "url": "https://gamedev.stackexchange.com/questions/51693/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "se-preempt": { "title": "GameDev StackExchange, Preempting Behavior Trees (27 votes)", "url": "https://gamedev.stackexchange.com/questions/61495/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "se-running": { "title": "GameDev StackExchange, Actions That Take Longer Than One Tick (19 votes)", "url": "https://gamedev.stackexchange.com/questions/51738/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "se-cancel": { "title": "Stack Overflow, Behaviour trees, canceling running events", "url": "https://stackoverflow.com/questions/51798122/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "se-rate": { "title": "GameDev StackExchange, Behavior Tree Iteration Rate", "url": "https://gamedev.stackexchange.com/questions/53144/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "se-ternary": { "title": "GameDev StackExchange, Ternary conditional in behaviour trees", "url": "https://gamedev.stackexchange.com/questions/154476/", "grade": "a forum post; evidence that the confusion exists", "read": "in full" },
    "btcpp-pr329": { "title": "BehaviorTree.CPP pull request 329, SequenceStar restarting after halt", "url": "https://github.com/BehaviorTree/BehaviorTree.CPP/pull/329", "grade": "a bug report on a mature library; evidence that the confusion exists", "read": "title and description" }
  }
}
```

- [ ] **Step 3: Write dialects.json**

```json
{
  "$comment": "The lookup appendix. One row per concept, one cell per dialect, each cell's source named. Not a lesson; the deck never sees it.",
  "columns": [
    { "id": "book", "title": "Textbook", "src": "book" },
    { "id": "btcpp", "title": "BehaviorTree.CPP", "src": "btcpp-basics" },
    { "id": "ue", "title": "Unreal Engine", "src": "ue-overview" },
    { "id": "unity", "title": "Unity Behavior", "src": "unity" },
    { "id": "limbo", "title": "Godot LimboAI", "src": "limbo" }
  ],
  "rows": [
    { "concept": "Try children until one succeeds", "book": "Fallback", "btcpp": "Fallback, ReactiveFallback", "ue": "Selector", "unity": "Try In Order", "limbo": "BTSelector, BTDynamicSelector" },
    { "concept": "Run children in order until one fails", "book": "Sequence", "btcpp": "Sequence, ReactiveSequence, SequenceWithMemory", "ue": "Sequence", "unity": "Sequence", "limbo": "BTSequence (remembers the running child by default), BTDynamicSequence" },
    { "concept": "Tick all children", "book": "Parallel, M of N", "btcpp": "Parallel", "ue": "Simple Parallel, plus Services", "unity": "Run In Parallel, Join", "limbo": "BTParallel" },
    { "concept": "Wrap one child", "book": "Decorator", "btcpp": "DecoratorNode", "ue": "Decorator, which also serves as the condition", "unity": "Modifier", "limbo": "BTDecorator" },
    { "concept": "Ask a question, never Running", "book": "Condition (a leaf)", "btcpp": "ConditionNode", "ue": "not a leaf: a Decorator on the branch", "unity": "Conditional Guard, Conditional Branch", "limbo": "BTCondition" },
    { "concept": "Do something", "book": "Action", "btcpp": "ActionNode (Sync, Stateful, Threaded)", "ue": "Task", "unity": "Action", "limbo": "BTAction" },
    { "concept": "Shared memory", "book": "not part of the formalism", "btcpp": "Blackboard with typed ports", "ue": "Blackboard asset with Keys", "unity": "Blackboard variables", "limbo": "Blackboard" },
    { "concept": "When the tree is re-read", "book": "every tick, from the root", "btcpp": "every tick, from the root", "ue": "event driven: a branch runs until it finishes or an Observer Abort fires", "unity": "each Update of the agent", "limbo": "usually each frame" },
    { "concept": "Answers", "book": "Success, Failure, Running", "btcpp": "SUCCESS, FAILURE, RUNNING, IDLE", "ue": "Succeeded, Failed, InProgress, Aborted", "unity": "Running, Succeeded, Failed, Waiting, Interrupted", "limbo": "SUCCESS, FAILURE, RUNNING, FRESH" }
  ]
}
```

- [ ] **Step 4: Write visual-grammar.md**

`content/visual-grammar.md`, one sentence per line:

```markdown
# Visual Grammar - Behavior Trees

The contract every figure obeys.
Written before figure one so consistency is structural.

## 1. Colour means an answer

| Meaning | Token | Use |
|---|---|---|
| Success | `--s-ok` | fill and stroke of a node that answered Success this tick |
| Failure | `--s-fail` | fill and stroke of a node that answered Failure this tick |
| Running | `--s-run` | fill and stroke of a node that answered Running this tick |
| The tick | `--s-tick` | a dot travelling down an edge |
| Idle | paper | a node not visited this tick |

Nothing else on a plate is coloured.
The map's battery bar is the one exception, and it borrows Success and Failure because an empty battery is a Failure waiting to happen.

## 2. Shape means a kind

From the textbook's own notation (Colledanchise and Ogren, table 1.1): Sequence is a box labelled with an arrow, Fallback a box with a question mark, Parallel a box with a double arrow, Decorator a rhombus, Action a rounded box, Condition an ellipse.
A real world node the course draws but does not run (Nav2's own control nodes) is a double ruled box.
A greyscale print must still read, which it does, because kind never depends on colour.

## 3. One tree, one drawing

Every tree on a plate is written in the text form and laid out by `src/bt/layout.js`, the same code the playground uses.
A plate can therefore never show a shape the playground would draw differently.

## 4. Progressive states

Two to four states per plate.
Each state keeps everything before it and adds one thing.
The caption names what was added.

## 5. Line weights

Three, as in the flight course: hairline, rule, line.
Edges are rule weight.
Node outlines are line weight.
```

- [ ] **Step 5: Write the lesson spine with chapter 1**

`src/data/lessons.js` (chapters 2 to 12 arrive in Tasks 8 and 9; keep the block order concrete, fig, play, myth, check, videos, aside):

```js
/* Lesson content. Every chapter follows the same spine: concrete anchor, the
   figure, the playground, the myth, the check. Every myth and every fact
   carries `src`, an id in content/sources.json; check-content.mjs fails the
   build on one that does not. */
export const PARTS = [
  {
    n: 1, title: "Behavior Trees", plate: "tree",
    lede: "Twelve ideas in the order they make sense. Every one names the thing you " +
      "probably believe that isn't true, then hands you the tree so you can watch it be wrong. " +
      "Pick a node, or start at one.",
  },
];
export const COURSE = PARTS.map((p) => p.title).join(" & ");
export const partOf = (id) => LESSONS.find((l) => l.id === id)?.part ?? 1;
export const lessonsIn = (n) => LESSONS.filter((l) => l.part === n);

export const LESSONS = [
{
  id: "the-tick", part: 1, title: "The Tick",
  oneLiner: "A tree is not run once. It is asked again, and again, and again.",
  flow: [
    { t: "concrete", text: "A toddler with a to do list of one line: get to the door. You do not tell them once and walk away. You ask, every second, are you there yet? And every second they answer: not yet, not yet, not yet, yes. That question, asked on a clock, is the whole of a behavior tree." },
    { t: "p", text: "A behavior tree is a drawing of what an agent should do, with the decisions at the top and the doing at the bottom. What makes it different from a flowchart is not the drawing. It is that nobody runs it once. A clock sends a signal, called a tick, into the root, many times a second. The tick walks down the tree, reaches something to do, and an answer walks back up." },
    { t: "fact", src: "book", text: "The textbook puts it in one sentence: the root generates ticks with a given frequency, and a node is executed if and only if it receives a tick." },
    { t: "fig", id: "tick/root-to-leaf" },
    { t: "p", text: "Watch it happen. One action, fly to A. Press step and the tick goes down, the action answers Running, and the tick count goes up by one. Press play and the drone moves, because it is being asked every tenth of a second and it keeps answering not yet." },
    { t: "play", id: "tick/one-action" },
    { t: "myth", src: "book", claim: "A behavior tree runs once, from the top to the bottom, like a program.", truth: "It is re-read from the root every tick, and there are ten ticks a second here. Nothing in the tree remembers that it ran; the world remembers, and the tree looks at the world again. That is what lets it react to a change it did not plan for. The textbook, section 2.6.1, names this as the reason a behavior tree is reactive: the continual generation of ticks is a closed loop." },
    { t: "check", q: "The drone is halfway to A and the tree is ticking. How many times has the root been asked?",
      options: ["Once, when the flight started", "Once per tick, so roughly ten times a second", "It is asked only when something changes"],
      answer: 1, why: "The root is asked on a clock, whether or not anything changed. Being asked when nothing changed is not waste. It is the price of noticing the moment something does." },
    { t: "videos" },
    { t: "aside", text: "The interpreter that runs every tree in this course is about 150 lines, and it is in the repository as src/bt/tree.js. There is no other engine behind the playground. If the tree on the screen does something, it is because that file did it." },
  ],
},
];
```

- [ ] **Step 6: Copy deck.js, stub videos.js and plays.js**

```bash
cp ../flight-dynamics/src/data/deck.js src/data/deck.js
```
In `deck.js` delete the `formula` branch (this course has no formula blocks) and its comment lines; keep `myth` and `check`.

`src/data/videos.js`:
```js
/* Generated from content/videos.json by `npm run videos`. Empty until a
   curation pass has run with a YouTube Data API key. Do not hand edit. */
export const VIDEOS = {};
```

`src/data/plays.js`:
```js
/* What each chapter's playground shows. Pure data: which world, which scenario,
   the starting tree in the text form, the variants and switches offered, the
   hazards shown, whether the editor is open, and the goal that marks the
   chapter's "make it happen" step. Filled in by the chapter tasks. */
import { DRONE } from "../world/drone.js";
export const WORLDS = { drone: DRONE };
export const PLAYS = {};
export const hasPlay = (id) => Object.hasOwn(PLAYS, id);
```

- [ ] **Step 7: Adapt the content check**

```bash
cp ../flight-dynamics/scripts/check-content.mjs scripts/check-content.mjs
```

Edit `scripts/check-content.mjs`:
- Replace the imports of `TASKS, MISSING` with `import { PLAYS } from "../src/data/plays.js";` and `import { readFileSync } from "node:fs";` stays. Add `const { sources: SOURCES } = JSON.parse(readFileSync(new URL("../content/sources.json", import.meta.url), "utf8"));` and `const DIAL = JSON.parse(readFileSync(new URL("../content/dialects.json", import.meta.url), "utf8"));`.
- Spine check: `["concrete", "fig", "play", "myth", "check"]`.
- Delete the `term` provenance block and the whole taxonomy block (glossary rows, figure names, seeAlso). Replace with the sources rule:

```js
/* ── the sources rule: every myth and fact names a source that exists ───── */
const unsourced = [], phantom = [], forum = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "myth" || x.t === "fact")) {
    if (!b.src) unsourced.push(`${les.id}: ${b.t} "${(b.claim ?? b.text).slice(0, 40)}"`);
    else if (!SOURCES[b.src]) phantom.push(`${les.id}: ${b.t} cites "${b.src}"`);
    else if (b.t === "fact" && /forum post/.test(SOURCES[b.src].grade)) forum.push(`${les.id}: fact cites forum post "${b.src}"`);
  }
const claimCount = LESSONS.flatMap((l) => l.flow).filter((b) => b.t === "myth" || b.t === "fact").length;
unsourced.length || phantom.length || forum.length
  ? fail(`sources: ${[...unsourced, ...phantom, ...forum].join("; ")}`)
  : pass(`all ${claimCount} myths and facts cite a real source, and no fact rests on a forum post`);
const thin = Object.entries(SOURCES).filter(([, s]) => !(s.title && s.url?.startsWith("https://") && s.grade && s.read));
thin.length
  ? fail(`sources missing title, https url, grade or read: ${thin.map(([id]) => id).join(", ")}`)
  : pass(`all ${Object.keys(SOURCES).length} sources carry a title, an https url, a grade in words and what was read`);

/* ── the dialect table cites real sources ────────────────────────────────── */
const badCols = DIAL.columns.filter((c) => !SOURCES[c.src]);
const badRows = DIAL.rows.filter((r) => DIAL.columns.some((c) => typeof r[c.id] !== "string" || !r[c.id]));
badCols.length || badRows.length
  ? fail(`dialects: ${badCols.length} columns without a source, ${badRows.length} rows with an empty cell`)
  : pass(`dialect table: ${DIAL.rows.length} rows, every column sourced`);
```

- Replace the "a chapter without a sandbox says why" block with:

```js
/* ── every play block resolves, and every chapter has one ────────────────── */
const badPlays = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "play"))
    if (!PLAYS[b.id]) badPlays.push(`${les.id} → ${b.id}`);
badPlays.length
  ? fail(`play blocks with no configuration in plays.js: ${badPlays.join(", ")}`)
  : pass(`all ${Object.keys(PLAYS).length} playgrounds resolve`);
```

- Keep the cross reference, figure, deck, parts, tracked asset and silent clip checks as they are.

Run: `node scripts/check-content.mjs`
Expected: FAIL on `play blocks with no configuration` (chapter 1 names `tick/one-action`, and `PLAYS` is empty). Everything else passes. That failure is what Task 8 fixes first.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(content): sourced content files and the sources rule in the content check"
```

---

### Task 8: Chapters 1 to 6 and their playgrounds

**Files:**
- Modify: `src/data/lessons.js` (append chapters 2 to 6), `src/data/plays.js` (entries for chapters 1 to 6)

**Interfaces:**
- `PLAYS[id] = { world: "drone", scenario: "delivery", tree: text, variants?: [{ label, tree }], modes?: boolean, hazards?: [hazardId], editor?: boolean, brief: text, goal?: { test(state, history) -> boolean, done: text } }`. `goal.test` is called after every tick by the playground and by `run`'s `until`.
- Figure ids named here are built in Task 10. The content check will fail on missing figures until then; that is expected and stated in Task 10.

Voice: direct, concrete, willing to say something is wrong. No em dashes. Every fact block cites. Chapter 1 is already written; use it as the model.

- [ ] **Step 1: Playground entries for chapters 1 to 6**

Append to `PLAYS` in `src/data/plays.js`:

```js
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
```

Two new fields the playground (Task 11) honours: `start(state)` runs once after `init` to place the drone for the lesson, and `extraLeaves` are merged over the world's leaves for that playground only.

- [ ] **Step 2: Chapters 2 to 6**

Append to `LESSONS` in `src/data/lessons.js`:

```js
{
  id: "three-answers", part: 1, title: "Three Answers",
  oneLiner: "Every node says one of three things. The third one is the whole trick.",
  flow: [
    { t: "concrete", text: "Ask someone to boil the kettle. Ask again two seconds later. They do not say yes and they do not say no. They say: still going. A tree that could only say yes or no could never boil a kettle." },
    { t: "p", text: "A node answers Success when it has done its job, Failure when it cannot, and Running when it is not finished yet. An action that takes time, fly to A, answers Running on every tick until it arrives. A condition never answers Running, because a question does not take time." },
    { t: "fact", src: "book", text: "The textbook, page 8: while the action is ongoing it returns Running. And page 9: a Condition node never returns a status of Running." },
    { t: "fig", id: "answers/three" },
    { t: "p", text: "Step this one tick at a time. FlyTo answers Running, Running, Running, and then Success. Only then does the tick reach Land. Two actions, one after the other, and the second one waits for the first to say it is done." },
    { t: "play", id: "answers/two-steps" },
    { t: "myth", src: "se-running", claim: "Every action finishes in one tick.", truth: "Almost nothing finishes in one tick. A tick is a tenth of a second here and a flight takes fifteen seconds. Running is what an action says for a hundred and fifty ticks, and Running is the answer that lets the rest of the tree keep being asked while the drone flies. The textbook's remark 1.1 says a tree without Running is non reactive and of limited use, and the question asked most often by beginners is when to return it. The answer is: whenever you are not done." },
    { t: "check", q: "A condition checks whether the battery is below 30 percent. What can it answer?",
      options: ["Success or Failure only", "Success, Failure or Running", "Running until the battery is measured"],
      answer: 0, why: "A question has an answer now. Only doing takes time. If a condition ever needs time, it is an action wearing a costume." },
    { t: "videos" },
    { t: "aside", text: "BehaviorTree.CPP, the library most real robots use, writes the rule into its type system: a ConditionNode shall not return RUNNING. The course borrows that as a check. A condition that answers Running is reported as an error on the trace." },
  ],
},
{
  id: "sequence", part: 1, title: "Sequence, the To Do List",
  oneLiner: "Do these in order. Stop at the first one that fails.",
  flow: [
    { t: "concrete", text: "Take off, fly to A, drop the parcel, fly home, land. A list. If any line fails, the list has failed, and there is no point reading further. That is a Sequence, and its symbol is an arrow." },
    { t: "p", text: "A Sequence ticks its children left to right. The first child that answers Running or Failure becomes the Sequence's answer. If every child answers Success, the Sequence answers Success. It is an AND that stops early." },
    { t: "fact", src: "book", text: "Algorithm 1 in the textbook is five lines: for each child, tick it; if Running return Running; if Failure return Failure; after the loop return Success." },
    { t: "fig", id: "sequence/todo" },
    { t: "p", text: "The list below starts with a check: battery above 30 percent. Play it, then drop the battery. The check fails, so the Sequence fails, and on the next tick the whole list is read again from the top. Nothing skipped ahead. Now try the memory variant and see what changes." },
    { t: "play", id: "sequence/todo" },
    { t: "myth", src: "btcpp-seq", claim: "A Sequence remembers where it was.", truth: "The textbook Sequence remembers nothing. Every tick it starts at its first child. What makes it look like it remembers is that the first children usually answer Success at once, so the tick reaches the running one in the same tick. The library's own table says it plainly: the plain Sequence restarts from the first child when a child fails, and re-ticks the same child when one is Running. The version that really remembers is a different node with a star on it, and chapter 7 is about what that costs." },
    { t: "check", q: "A Sequence has four children. The third answers Running. What happens to the fourth?",
      options: ["It is ticked, because the Sequence continues", "It is not ticked this tick", "It is ticked only in memory mode"],
      answer: 1, why: "Running stops the walk. The fourth child waits until the third has said Success, which may be many ticks from now." },
    { t: "videos" },
    { t: "aside", text: "In 75 real open source trees studied in 2020, Sequence was more than half of all control nodes. It is the node you will write most, and the one whose restart rule bites most." },
    { t: "fact", src: "sle20", text: "Ghzouli and colleagues counted Sequence at 56 percent, Selector at 21 percent, Decorator at 16 percent and Parallel at 7 percent of the composite nodes in the trees they mined." },
  ],
},
{
  id: "fallback", part: 1, title: "Fallback, Plan B",
  oneLiner: "Try these in order. Stop at the first one that works.",
  flow: [
    { t: "concrete", text: "Charge the battery. Cannot, not at home. Then fly home. A Fallback is a list of plans, and it takes the first one that does not fail. Its symbol is a question mark, and other people call it a Selector." },
    { t: "p", text: "A Fallback is the mirror of a Sequence. It ticks children left to right and stops at the first Success or Running. Only if every child fails does it fail. It is an OR that stops early, and the order is a priority: the leftmost plan is preferred." },
    { t: "fact", src: "book", text: "Algorithm 2 in the textbook is the same five lines with the answers swapped, and footnote 2 on page 6 says Fallback nodes are sometimes also called selector or priority selector nodes." },
    { t: "fig", id: "fallback/plan-b" },
    { t: "p", text: "Below, plan A is Charge and it fails because the drone is out over the map. Plan B flies home. Watch plan A: it is asked on every tick, answers Failure on every tick, and the moment the drone is on the pad it answers Running instead, and plan B is never asked again. Then flip to memory and count again." },
    { t: "play", id: "fallback/plan-b" },
    { t: "myth", src: "se-ternary", claim: "A Fallback is an if/else.", truth: "An if/else is decided once. A Fallback is decided again every tick, and that is the entire difference. Plan A does not get one chance; it gets a chance every tenth of a second, so the moment it can succeed, it does, and plan B is dropped mid flight. People who try to write a ternary with Sequence and Fallback are reaching for a decision made once, which is the thing a tree is built not to do." },
    { t: "check", q: "A Fallback's first child answers Running. Is the second child ticked?",
      options: ["Yes, so it can start early", "No, Running stops the walk", "Only if the first child was Running last tick too"],
      answer: 1, why: "Same rule as the Sequence, mirrored. Running and Success both stop a Fallback; only Failure lets it move right." },
    { t: "videos" },
    { t: "aside", text: "The word matters less than the shape. Selector, Fallback, Priority, Try In Order: four names in four tools for a box with a question mark on it. The appendix has the table." },
  ],
},
{
  id: "conditions", part: 1, title: "Conditions Only Ask",
  oneLiner: "A condition reads the world. It never writes it.",
  flow: [
    { t: "concrete", text: "Is the door open? You look. You do not open it a little to check. A condition that changes the thing it is checking is not a condition. It is an action that lies about what it is." },
    { t: "p", text: "Leaves come in two kinds. An action does something and may take time. A condition asks something and answers at once, Success or Failure. The tree treats them differently because it re-asks conditions freely, every tick, on the assumption that asking is harmless." },
    { t: "fact", src: "btcpp-basics", text: "BehaviorTree.CPP's own definition of a ConditionNode: should not alter the system, and shall not return RUNNING." },
    { t: "fig", id: "condition/pure" },
    { t: "p", text: "The playground below has a condition that cheats. It nudges the drone north every time it is asked. The interpreter counts changes to the world across every condition, and the trace hatches the one that changed something. Step it and find the liar." },
    { t: "play", id: "condition/dirty" },
    { t: "myth", src: "book", claim: "A condition can do a little work while it checks.", truth: "The moment it does, the tree's promise breaks. A reactive tree re-asks conditions every tick precisely because asking is free. A condition with a side effect runs that side effect ten times a second, in every branch that asks it, and the bug it causes appears nowhere near the condition. The textbook's page 9 definition is that a condition checks a proposition. Checking is all it may do." },
    { t: "check", q: "A condition takes 200 ms to compute its answer. What should it be?",
      options: ["A condition; the tree will wait", "An action that answers Running while it computes, and writes the result to the blackboard", "A decorator"],
      answer: 1, why: "Time is what Running is for. Compute in an action, store the answer, and let a cheap condition read it. The tree keeps ticking while the work happens." },
    { t: "videos" },
    { t: "aside", text: "Unreal Engine takes the idea further and does not let a condition be a leaf at all: it is a Decorator sitting on a branch, watching, and it can abort the branch when its answer changes. Same principle, different drawing. Chapter 12's appendix has the wording." },
  ],
},
{
  id: "reactivity", part: 1, title: "Reactivity, the Whole Point",
  oneLiner: "A higher priority branch can cut a running one, because the root is asked again.",
  flow: [
    { t: "concrete", text: "You are carrying a parcel across the road. A car comes. You do not finish crossing first. You stop, step back, and the parcel waits. Nobody scheduled that. The world changed, you looked again, and the more important thing won." },
    { t: "p", text: "Put safety on the left of a Fallback and the job on the right. Every tick the root asks the safety branch first. While the battery is fine it fails at once, the Fallback moves right, and the delivery runs. When the battery drops, the safety branch answers Running, the Fallback stops there, and the delivery is simply not asked. A node that was Running and is no longer asked gets halted." },
    { t: "fact", src: "book", text: "This is the textbook's section 2.6.1 on reactivity: actions are executed and aborted according to the ticks' traversal, which depends on the leaf nodes' return statuses." },
    { t: "fig", id: "reactive/preempt" },
    { t: "p", text: "Play the tree below, and when the drone is well out over the map drop the battery. The delivery branch goes idle mid flight, the return branch lights up, and the drone turns. It charges, and because the safety branch then fails again, the delivery starts over. Nothing in the tree said abort. The tick just stopped arriving." },
    { t: "play", id: "reactive/preempt" },
    { t: "myth", src: "se-preempt", claim: "A running action cannot be interrupted until it finishes.", truth: "It is interrupted the first tick it is not visited. There is no interrupt call, no flag, no event; the parent simply chose a different child, and the interpreter halts anything that was Running and did not get a tick. How to preempt a running node is one of the most upvoted beginner questions about behavior trees, and the answer is that you do not do it; the tick does." },
    { t: "fact", src: "btcpp-async", text: "The library asks the same of a real action: it must be aborted as fast as possible if the halt method is called, and it must never block inside its tick." },
    { t: "check", q: "The delivery branch is halfway through FlyTo A when the safety branch takes over. What does FlyTo A do?",
      options: ["Finishes the flight, then yields", "Is halted at once and its target cleared", "Keeps its target and resumes from there later"],
      answer: 1, why: "Halt means halt. The drone turns immediately. When the delivery is asked again after charging, FlyTo A starts from wherever the drone is, because the world remembers and the tree does not." },
    { t: "videos" },
    { t: "aside", text: "In the flight course the autopilot holds one number and does not know whether it is still the right one. This is the layer that knows. It does not fly the drone. It decides, ten times a second, what the drone should be trying to do." },
    { t: "ref", ch: 1, why: "The tick is what makes this work. If you skipped chapter 1, this is where it pays." },
  ],
},
```

- [ ] **Step 3: Run the content check**

Run: `node scripts/check-content.mjs`
Expected: the sources rule passes and the play blocks resolve; the only failure is `figures referenced but not built` for `answers/three`, `sequence/todo`, `fallback/plan-b`, `condition/pure`, `reactive/preempt`. Task 10 builds them.

- [ ] **Step 4: Commit**

```bash
git add src/data/lessons.js src/data/plays.js
git commit -m "feat(lessons): chapters 1 to 6 with their playgrounds"
```

---

### Task 9: Chapters 7 to 12, the appendix text, and their playgrounds

**Files:**
- Modify: `src/data/lessons.js` (append chapters 7 to 12), `src/data/plays.js` (entries for chapters 7 to 12)

- [ ] **Step 1: Playground entries**

Append to `src/data/plays.js`:

```js
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
  brief: "A retry around Charge, a timeout around the flight. Add a gust and watch the timeout fire.",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> deliver {memory}\n    timeout 200\n      FlyTo A\n    Drop\n    ReturnHome\n    Land",
  /* n7 is the timeout node in pre-order: root n0, low battery n1..n5, deliver n6, timeout n7, FlyTo n8. */
  goal: { test: (s, h) => h.some((x) => x.trace.some((n) => n.status === "Failure" && n.id === "n7")), done: "The timeout gave up on the flight. The Sequence failed, and the tree is asked again." },
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
PLAYS["fsm/transitions"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12"], counter: true,
  brief: "The chapter 6 tree again, with a counter of how many times control moved between branches.",
  tree: PREEMPT,
  goal: { test: (s, h) => s.delivered, done: "Every switch you counted would be a drawn transition in a state machine." },
};
PLAYS["design/mission"] = {
  world: "drone", scenario: "delivery", hazards: ["battery12", "gust", "calm", "nofly", "goalB"], editor: true,
  brief: "The whole mission, every hazard, and the editor open. Break it, then fix it.",
  tree: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo Goal\n    Drop\n    ReturnHome\n    Land",
  goal: { test: (s) => s.delivered && s.landed && s.goalMoves > 0, done: "Delivered to a moved goal, and home. The mission survived everything you threw at it." },
};
```

`counter: true` asks the playground to show how many ticks the root's chosen child changed (Task 11).

- [ ] **Step 2: Chapters 7 to 12**

Append to `LESSONS`:

```js
{
  id: "memory", part: 1, title: "Memory, and What It Costs",
  oneLiner: "A node that remembers where it was stops looking at what changed.",
  flow: [
    { t: "concrete", text: "Reading a recipe with your finger on the line. Fast, and you never repeat a step. But if the oven goes out at step six, your finger does not know. Only re-reading from the top would catch it." },
    { t: "p", text: "A Sequence or Fallback with memory keeps its finger on the running child. Earlier children are not asked again while it runs. The textbook draws it as the same box with a star, and says it can always be rewritten without memory using extra conditions, which is why it calls memory syntactic sugar." },
    { t: "fact", src: "book", text: "Section 1.3.2: nodes with memory remember whether a child returned Success or Failure, avoiding its re-execution until the whole Sequence or Fallback finishes; the memory is cleared when the parent returns. And section 3.6: memory is advised exclusively where no unexpected event will undo the execution of the subtree." },
    { t: "fig", id: "memory/modes" },
    { t: "p", text: "Three modes in the playground. Reactive is the textbook. Memory is the textbook's star, which is also the plain Sequence of BehaviorTree.CPP. Keep is the library's third variant, which holds its memory even across a Failure. Put memory on the root, play, drop the battery. The safety check is on the left of the running child, so it is never asked, and the drone dies." },
    { t: "play", id: "memory/modes" },
    { t: "myth", src: "kth", claim: "Memory is free. It just saves re-ticking things that already passed.", truth: "It saves re-ticking the things that already passed, and those things are your safety checks. Petter Ogren, who co-wrote the textbook, has a lecture titled Why Memory Nodes is a bad idea, and the survey he co-authored criticises a library whose Sequence is memory by default for removing one of the advantages of using a BT, i.e. reactivity. The honest rule is the textbook's: memory where nothing outside can undo the subtree, reactive everywhere a check has to stay live." },
    { t: "fact", src: "survey", text: "The survey, section 5, quotes the textbook's caution and applies it to a real library whose Sequence node is implemented with memory." },
    { t: "p", text: "Now the counter case, because memory is not evil. Patrol A then B, reactive. Add a gust. The drone reaches A, the wind pushes it three metres off, and on the next tick FlyTo A is asked again, answers Running, and drags it back. It never reaches B. With memory, A stays done." },
    { t: "fact", src: "klockner", text: "Klockner's 2013 paper on UAV mission management describes this exact case: a waypoint whose success condition stops holding once the aircraft has left it, and the need for a memory or a latch to move on." },
    { t: "check", q: "A delivery Sequence sits under a safety Fallback. Which node should have memory?",
      options: ["The Fallback, so the delivery is not interrupted", "The delivery Sequence, so finished legs are not re-flown", "Both"],
      answer: 1, why: "Memory on the Sequence keeps flown legs flown. Memory on the Fallback would stop it re-asking the safety check. The chapter 6 tree is drawn exactly this way." },
    { t: "videos" },
    { t: "fact", src: "btcpp-pr329", text: "A pull request on BehaviorTree.CPP fixed a SequenceStar that restarted from the first child after a halt and re-ran actions that had already completed. Even the people who write the libraries get the memory rule wrong sometimes." },
    { t: "aside", text: "Test yours. Every mode in this course is asserted by scripts/check-bt.mjs against the textbook's algorithms and the library's table, and the playground runs that same code." },
  ],
},
{
  id: "decorators", part: 1, title: "Decorators",
  oneLiner: "One child, and a rule about what to do with its answer.",
  flow: [
    { t: "concrete", text: "Try the key three times before giving up. Give the kettle five minutes, then assume it is broken. Neither is a new job. Each is a rule wrapped around a job you already have." },
    { t: "p", text: "A decorator has exactly one child and changes what its answer means or how often it is ticked. Inverter swaps Success and Failure. Retry N turns the first N failures into Running. Timeout N halts a child that has been Running too long and reports Failure. Repeat N asks for N successes. The rhombus is the textbook's drawing." },
    { t: "fact", src: "book", text: "Page 9: a Decorator is a control flow node with a single child that manipulates the return status of its child according to a user defined rule and also selectively ticks the child. The examples given are invert, max N tries and max T seconds." },
    { t: "fig", id: "decorators/kinds" },
    { t: "p", text: "Below, Charge is wrapped in retry 3 and the flight in timeout 200 ticks. Add a gust from the west and the flight slows into the wind; when two hundred ticks pass the timeout halts it and answers Failure, the delivery fails, and the root is asked again." },
    { t: "play", id: "decorators/kinds" },
    { t: "myth", src: "btcpp-dec", claim: "A decorator is just an inverter.", truth: "Inverter is the smallest one. The library ships eleven, and the useful ones are about time and attempts: Retry, Timeout, Delay, Cooldown, RunOnce. What they share is not inversion but position. A decorator sits between a parent and one child and gets to see every answer go past, which is the only place in a tree where a rule about answers can live." },
    { t: "check", q: "timeout 50 wraps FlyTo A and the flight takes 80 ticks. What does the parent see?",
      options: ["Running for 80 ticks, then Success", "Running for 50 ticks, then Failure, and FlyTo A is halted", "Failure at once"],
      answer: 1, why: "The timeout is a rule about Running: too much of it becomes Failure. It halts the child so the drone stops trying, then reports up." },
    { t: "videos" },
    { t: "aside", text: "Every decorator in this course ticks its child at most once per tick. That is why a tick always finishes: the tree is finite and nothing in it loops inside a tick. Retry spreads its attempts across ticks, one per tick." },
  ],
},
{
  id: "parallel", part: 1, title: "Parallel, Carefully",
  oneLiner: "Tick every child, every tick. Then argue about what they wrote.",
  flow: [
    { t: "concrete", text: "Two people filling in the same form at once. Both write in the box marked mode. Whoever put the pen down last wins, and neither of them knows it." },
    { t: "p", text: "A Parallel ticks all its children on every tick and answers by count: Success once M of them have succeeded, Failure once so many have failed that M is out of reach, Running otherwise. It is not threads. Everything still happens one node at a time inside a single tick. What is parallel is only that no child waits for another to finish." },
    { t: "fact", src: "book", text: "Algorithm 3: return Success if at least M children succeed, Failure if more than N minus M fail, Running otherwise." },
    { t: "fact", src: "btcpp-async", text: "BehaviorTree.CPP is explicit that its engine is single threaded: all the tick methods are executed sequentially." },
    { t: "fig", id: "parallel/m-of-n" },
    { t: "p", text: "Below, two children write the same blackboard key on every tick. Step it and read the write log under the map. Six writes in three ticks, and the value at the end of each tick is whichever child ran second. Nothing is wrong with either child. The Parallel put them in a race." },
    { t: "play", id: "parallel/race" },
    { t: "myth", src: "conc", claim: "Parallel means the children run at the same time, like threads.", truth: "They run in the same tick, in order, and that is enough to race. A peer reviewed paper on concurrency in behavior trees says the Parallel composition still entails concurrency issues, race conditions, starvation and deadlocks among them, and that it is safe only when the children act on orthogonal state. In the 75 real trees studied in 2020, Parallel was 7 percent of composites. Rare, and for a reason." },
    { t: "check", q: "A Parallel with M equal to 2 has three children. Two answer Success and one Running. What does it answer?",
      options: ["Running, until all three finish", "Success", "Failure, because one is not done"],
      answer: 1, why: "M is the threshold. Two successes reach it, so the Parallel is done, and the Running child will be halted because its parent no longer needs it." },
    { t: "videos" },
    { t: "aside", text: "Unreal Engine does not ship a general Parallel at all. It has a Simple Parallel, whose own documentation reads: while doing A, do B as well. Two children, one of which is the main task. Less power, fewer races." },
  ],
},
{
  id: "blackboard", part: 1, title: "The Blackboard",
  oneLiner: "The tree remembers nothing. So where does the goal live?",
  flow: [
    { t: "concrete", text: "A whiteboard in a kitchen. Anyone can write on it and anyone can read it. It works until three people write over each other, or until somebody reads a note from last week as if it were today's." },
    { t: "p", text: "Nodes do not talk to each other. They read and write a shared store called the blackboard. A condition reads the battery from it. An action writes the path it computed to it. The interpreter here logs every write with the tick and the node that made it, so the store is never a mystery." },
    { t: "fact", src: "btcpp-ports", text: "BehaviorTree.CPP defines the Blackboard as a key/value storage shared by all the nodes of a tree, and makes every node declare typed ports for the keys it uses, so the connections are visible in the tree file." },
    { t: "fact", src: "pytrees-bb", text: "py_trees says blackboards are not a necessary component of behaviour tree implementations, but are nonetheless a fairly common mechanism, and makes each node register read or write access to each key so all of the magic is exposed for debugging." },
    { t: "fig", id: "blackboard/ports" },
    { t: "p", text: "Two trees below. One types the waypoint in: FlyTo A. The other reads it: FlyTo Goal. Play either, then move the goal. The typed one delivers to the wrong place, because the name A was baked into the tree. The reading one turns, because the goal lives in the world and the tree looks at it every tick." },
    { t: "play", id: "blackboard/goal" },
    { t: "myth", src: "francis", claim: "The blackboard is just global variables, so put everything on it.", truth: "The third of Anthony Francis's three behavior tree pitfalls is routing everything through the blackboard. A key nobody reads is dead weight; a key two nodes write is a race; a key with no declared owner is a bug you find at 3 a.m. The libraries' answer is to make access explicit: ports in one, registered read and write access in the other. The course's answer is the write log. If you cannot say who writes a key and who reads it, it should not be a key." },
    { t: "check", q: "The goal can change while the drone flies. Where should the tree get it from?",
      options: ["Typed into the FlyTo node when the tree is written", "Read from the blackboard on every tick", "Passed once to the root when the tree starts"],
      answer: 1, why: "Anything that can change during the mission has to be read, not remembered. The tree is re-read every tick precisely so this works." },
    { t: "videos" },
    { t: "aside", text: "The blackboard table under the map is the world's view of itself, and the write log beneath it is every change the tree made this tick. Between them there is nothing hidden." },
  ],
},
{
  id: "tree-or-machine", part: 1, title: "Tree or State Machine",
  oneLiner: "Same power. Different price for every extra way to change your mind.",
  flow: [
    { t: "concrete", text: "Directions as a list of turns versus directions as a map. The list is faster to follow and useless the moment a road is closed. The map costs more to read and survives the closure." },
    { t: "p", text: "A finite state machine draws states and the transitions between them. Every transition is an arrow: from this state, on this event, go there. Add a new state and every state that should be able to reach it needs a new arrow. The textbook compares a transition to a GOTO: a one way transfer of control that leaves no way back." },
    { t: "fact", src: "book", text: "Section 1.2: FSM transitions are one way control transfers; for the system to be reactive there need to be many of them, which harms modularity, and if one component is removed every transition to it needs to be revised. BTs use two way control transfers, governed by the internal nodes." },
    { t: "fact", src: "annrev", text: "The 2022 review states the arithmetic: with N modules there are N squared possible transitions, whereas a BT module only has to know if it succeeded or not. It also states, citing Biggar, Zamani and Shames, that the two are equally expressive." },
    { t: "fig", id: "fsm/transitions" },
    { t: "p", text: "The figure draws the chapter 6 tree as a state machine and counts the arrows. The playground below counts something related: every tick the root's chosen child changed. Each of those switches is a transition you would have had to draw." },
    { t: "play", id: "fsm/transitions" },
    { t: "myth", src: "tse23", claim: "Behavior trees replaced state machines.", truth: "They did not, and the people who counted say so. A 2023 study of open source robotics code found 2065 state machine models in SMACH alone against 658 behavior tree models across every library, with behavior tree use increasing rapidly. The autopilot under every drone in this course is a state machine: PX4's own documentation says its commander module contains the state machine for mode switching and failsafe behavior. Trees sit above machines more often than they replace them." },
    { t: "fact", src: "px4", text: "PX4 documents flight modes as operational states selected by a state machine in the commander module, and does not mention behavior trees." },
    { t: "p", text: "The critique from inside the games industry is worth hearing in its own words. At GDC 2017 Bobby Anguelov said behavior trees are inherently bad at two things, transitions and interruptions, and behavior prioritisation, and that using an acyclic structure to model cyclic behaviour is the root of the trouble. His answer was a hybrid: a state machine for the modes, a tree inside each state." },
    { t: "fact", src: "arborist", text: "The AI Arborist slides carry those two lines and the phrase hierarchical finite state machine behavior tree hybrid." },
    { t: "check", q: "You add a new safety branch to the chapter 6 tree. How many existing nodes must change?",
      options: ["Every branch that could be interrupted by it", "None; it goes on the left of the Fallback", "The root only, and every leaf"],
      answer: 1, why: "That is the two way transfer. The new branch is asked first because of where it sits, and the old branches do not need to know it exists. In a state machine each old state would need an arrow to the new one." },
    { t: "videos" },
    { t: "fact", src: "jpl-heli", text: "A JPL research paper on a future Mars science helicopter draws exactly this hybrid: a finite state machine for the mission phases, and a behavior tree governing the logic inside each state." },
    { t: "aside", text: "The flight course's chapter 12 is about a control loop that holds one number. This chapter is about the layer that chooses which number." },
    { t: "ref", ch: 6, why: "The tree being redrawn as a machine is the one from chapter 6." },
  ],
},
{
  id: "design", part: 1, title: "Design, and the Real Thing",
  oneLiner: "How the textbook says to build one, what a production tree looks like, and where it sits above the autopilot.",
  flow: [
    { t: "concrete", text: "Start from the end. What does done look like? If the parcel is at A, you are done; if not, what one thing would make it so, and is that possible right now? Work backwards until every leaf is something the drone can do today." },
    { t: "p", text: "The textbook's chapter 3 gives the rules. Give every action an explicit success condition, and put that condition to its left under a Fallback, so an action that is already satisfied is never run. Chain backwards from the goal, adding a branch for each precondition that could be false. Use Sequences to guard irreversible actions. Use memory only where nothing outside can undo a subtree." },
    { t: "fact", src: "book", text: "Chapter 3 of the textbook: explicit success conditions (3.1), implicit sequences (3.2), sequences for safety (3.4), backward chaining (3.5), and memory nodes only where non reactivity is wanted (3.6)." },
    { t: "fig", id: "design/backchain" },
    { t: "p", text: "Now a real one. The default navigation tree of ROS 2 Nav2, the navigation stack on a large share of research and commercial ground robots, is a file of about a hundred lines. The figure draws it from that file, node for node. Its own control nodes, RecoveryNode, PipelineSequence, RoundRobin, are drawn as double ruled boxes because this course's interpreter does not run them; their rules are in the Nav2 documentation, cited beneath." },
    { t: "fact", src: "nav2-walk", text: "Nav2's walkthrough: the top RecoveryNode retries navigation up to six times; a RateController limits planning to once a second; a ReactiveFallback lets a new goal preempt any recovery; a RoundRobin advances through clearing the costmaps, spinning, waiting and backing up, one per failure." },
    { t: "fact", src: "nav2-nodes", text: "Nav2 documents why it wrote PipelineSequence: it re-ticks previous children when a child returns Running, so the path can be recomputed while the robot is still following the old one, which no stock Sequence does." },
    { t: "fig", id: "nav2/tree" },
    { t: "p", text: "And the drone. Every drone project that uses a behavior tree puts it in the same place: above the autopilot, not inside it. The autopilot is a state machine that holds a mode and keeps the aircraft stable in it. The tree decides which mode to ask for and when." },
    { t: "fact", src: "klockner", text: "Klockner's figure 2 places mission management outside a loop of guidance, autopilot and aircraft, and gives as the simplest mission task engaging a specific autopilot mode, e.g. flight level change." },
    { t: "fact", src: "aerostack2", text: "Aerostack2, a drone framework from the Technical University of Madrid, runs BehaviorTree.CPP as an optional mission layer above its own behaviours, which sit above PX4 or ArduPilot, and its documentation warns readers not to mix up its behaviors with behavior trees." },
    { t: "fact", src: "drone-trees", text: "The Bristol Flight Lab's drone_trees runs py_trees above a MAVLink autopilot; its example tree returns home if the battery drops below 30 percent or the state estimator goes unhealthy." },
    { t: "fig", id: "design/stack" },
    { t: "myth", src: "ardupilot", claim: "The autopilot is a behavior tree.", truth: "Neither of the two open source autopilots is. PX4's mode switching and failsafes are a state machine in its commander module; ArduPilot documents twenty five flight modes selected by switch, mission command or ground station. The first robotics paper on behavior trees, in 2012, was about UAV guidance, and every drone project since has put the tree where that paper put it: above the machine that flies the aircraft, choosing what it should be trying to do." },
    { t: "fact", src: "ogren12", text: "Ogren's 2012 AIAA paper argues that the modularity, reusability and complexity of UAV guidance and control systems might be improved by a behavior tree architecture. Only its abstract is open access, and that is all this course quotes." },
    { t: "p", text: "The playground below is the whole mission with the editor open. Every hazard is on the buttons. Break the tree, then fix it. The checkride after this chapter asks for five trees of your own, and the interpreter grades them." },
    { t: "play", id: "design/mission" },
    { t: "check", q: "Where does a drone's behavior tree send its decisions?",
      options: ["Directly to the motors", "To the autopilot, as a mode or a setpoint to hold", "To the ground station"],
      answer: 1, why: "The tree picks what to try. The autopilot's state machine and control loops make the aircraft do it. Two layers, two jobs, and the flight course was about the lower one." },
    { t: "videos" },
    { t: "fact", src: "plexil", text: "NASA's documented plan executive is PLEXIL, a plan language from NASA Ames used on rovers and the ISS, and its documentation does not mention behavior trees." },
    { t: "aside", text: "No ESA document mentioning behavior trees was found while researching this course. That is reported as an absence, not as proof of one. The sources page lists what was and was not reachable." },
    { t: "ref", ch: 7, why: "Memory only where nothing outside can undo the subtree. The rule is from here." },
  ],
},
```

- [ ] **Step 3: Run the content check**

Run: `node scripts/check-content.mjs`
Expected: everything passes except `figures referenced but not built` for the chapter 7 to 12 figure ids (`memory/modes`, `decorators/kinds`, `parallel/m-of-n`, `blackboard/ports`, `fsm/transitions`, `design/backchain`, `nav2/tree`, `design/stack`) plus the five from Task 8. The cross reference check must pass (chapter 6 refers back to 1, chapter 11 to 6, chapter 12 to 7).

- [ ] **Step 4: Commit**

```bash
git add src/data/lessons.js src/data/plays.js
git commit -m "feat(lessons): chapters 7 to 12 with their playgrounds"
```

---

### Task 10: The plates

**Files:**
- Modify: `src/data/diagrams.js` (add thirteen figures)
- Create: `src/bt/nav2.js`

**Interfaces:**
- Consumes: `figure, tree, chip, note, craft, line, dashed, path, dot` from `svg.js`; `parse` from `parse.js`; `layout` from `layout.js`.
- Produces: figure ids `answers/three`, `sequence/todo`, `fallback/plan-b`, `condition/pure`, `reactive/preempt`, `memory/modes`, `decorators/kinds`, `parallel/m-of-n`, `blackboard/ports`, `fsm/transitions`, `design/backchain`, `nav2/tree`, `design/stack`, and `index/tree` (used by the home page in Task 12); `nav2ToSpec(xml) -> spec` from `nav2.js`.
- Node ids in a parsed tree are pre-order `n0, n1, ...`. Write each tree once as text at the top of its builder and count the ids in a comment before using them in `status`.

Every figure: `title`, `desc` (a full sentence description for a screen reader), 2 to 4 `states`, one `caption` per state, everything inside the viewBox, no chip on chip overlap (the figure check measures it). Default viewBox is 800x500; a tall tree may use `vb: "0 0 800 560"`.

- [ ] **Step 1: The Nav2 converter**

`src/bt/nav2.js`:

```js
/* Turn BehaviorTree.CPP XML into a drawable spec. Drawing only: the course's
   interpreter does not run Nav2's own control nodes, and this file never
   pretends otherwise. A tag we know maps to its textbook kind; a control tag
   we do not know is drawn as Custom, a double ruled box. Leaf tags are Actions
   unless Nav2's node reference lists them as conditions. */
const CONTROL = {
  Sequence: ["Sequence", "memory"], ReactiveSequence: ["Sequence", "reactive"], SequenceWithMemory: ["Sequence", "keep"],
  Fallback: ["Fallback", "memory"], ReactiveFallback: ["Fallback", "reactive"], Parallel: ["Parallel"],
};
const DECOR = new Set(["Inverter", "RetryUntilSuccessful", "Repeat", "Timeout", "Delay", "ForceSuccess", "ForceFailure",
  "RateController", "DistanceController", "SpeedController", "GoalUpdater", "SingleTrigger", "KeepRunningUntilFailure"]);
/* Conditions from the Nav2 node reference (docs.nav2.org, Nav2 Specific Nodes,
   "Condition Nodes"). Verify against that page before adding one. */
const CONDITIONS = new Set(["GoalReached", "GoalUpdated", "GlobalUpdatedGoal", "InitialPoseReceived", "IsStuck",
  "TransformAvailable", "DistanceTraveled", "TimeExpired", "IsBatteryLow", "IsPathValid", "IsBatteryCharging",
  "WouldAControllerRecoveryHelp", "WouldAPlannerRecoveryHelp", "WouldASmootherRecoveryHelp", "IsGoalNearby",
  "AreErrorCodesPresent", "IsStopped", "PathExpiringTimer", "GoalUpdatedController"]);

export function nav2ToSpec(xml) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const main = doc.querySelector("BehaviorTree");
  const conv = (el) => {
    const tag = el.tagName, kids = [...el.children].map(conv);
    const name = el.getAttribute("name") || undefined;
    if (CONTROL[tag]) return { kind: CONTROL[tag][0], mode: CONTROL[tag][1], name: name ?? tag, m: 1, children: kids };
    if (DECOR.has(tag)) return { kind: "Decorator", dec: { type: "Custom", n: 0 }, name: tag, leaf: tag, children: kids };
    if (kids.length) return { kind: "Custom", name: name ?? tag, leaf: tag, children: kids };
    return { kind: CONDITIONS.has(tag) ? "Condition" : "Action", leaf: name ?? tag, args: [], children: [] };
  };
  return conv(main.firstElementChild);
}
```

`labelOf` in `layout.js` must label a Custom control node and a Custom decorator by `name`: add at the top of `labelOf`: `if (s.kind === "Custom" || (s.kind === "Decorator" && s.dec?.type === "Custom")) return s.name ?? s.leaf;`. `node()` in `svg.js` already draws `Custom` as a double ruled box; a `Decorator` with `dec.type === "Custom"` is drawn as a rhombus like any decorator. `DOMParser` exists in the browser; for the figure check under Node, `check-figures.mjs` must supply one: add at its top `import { DOMParser } from "@xmldom/xmldom"` only if you are willing to add a dev dependency; instead, keep zero dependencies and give `nav2ToSpec` a second argument `parser` defaulting to `globalThis.DOMParser`, and in `check-figures.mjs` pass a tiny regex based parser:

```js
/* Enough XML for nav2.xml: nested elements with quoted attributes, no text
   nodes, no namespaces. Not a general parser and not used in the browser. */
export function tinyXml(xml) {
  const stack = [{ children: [] }];
  for (const m of xml.matchAll(/<\/?([A-Za-z_][\w.]*)((?:\s+[\w.:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (m[0].startsWith("</")) { stack.pop(); continue; }
    const attrs = Object.fromEntries([...m[2].matchAll(/([\w.:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const el = { tagName: m[1], children: [], getAttribute: (k) => attrs[k] ?? null };
    stack[stack.length - 1].children.push(el);
    if (!m[3]) stack.push(el);
  }
  const root = stack[0].children[0];
  const find = (el, tag) => el.tagName === tag ? el : el.children.map((c) => find(c, tag)).find(Boolean);
  return { querySelector: (tag) => find(root, tag), get firstElementChild() { return root; } };
}
```
Put `tinyXml` in `src/bt/nav2.js` too and let `nav2ToSpec(xml, parse = (x) => new DOMParser().parseFromString(x, "application/xml"))` accept it; `diagrams.js` calls `nav2ToSpec(NAV2)` in the browser and the figure check calls `D` builders after setting `globalThis.DOMParser = class { parseFromString(x) { return tinyXml(x); } }`. Also `main` above must handle the tiny parser's object: use `doc.querySelector("BehaviorTree")` in both cases (the tiny one implements it). Strip XML comments before parsing: `xml.replace(/<!--[\s\S]*?-->/g, "")`.

`diagrams.js` imports the XML as text: `import NAV2 from "../../content/nav2.xml?raw";`. Under Node the `?raw` import does not resolve, so the checks must read the file themselves and expose it: in `diagrams.js` write `const NAV2 = globalThis.__NAV2 ?? (await import("../../content/nav2.xml?raw")).default;` and in BOTH `check-figures.mjs` and `check-content.mjs` set `globalThis.__NAV2 = readFileSync(new URL("../content/nav2.xml", import.meta.url), "utf8")` before importing `diagrams.js` (turn their static import of `diagrams.js` into `const { default: D } = await import("../src/data/diagrams.js");` placed after that line).

- [ ] **Step 2: The figures**

Append to `src/data/diagrams.js` (its header, imports and `T` exist from Task 6; the two imports below join that header). The chapter 6 tree is used by four figures, so it is a constant:

```js
import { nav2ToSpec } from "../bt/nav2.js";
import { layout } from "../bt/layout.js";
const NAV2 = globalThis.__NAV2 ?? (await import("../../content/nav2.xml?raw")).default;

/* Chapter 6's tree. Pre-order ids:
   n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 Charge
   n5 -> deliver | n6 FlyTo A | n7 Drop | n8 ReturnHome | n9 Land */
const PREEMPT = "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land";
/* Wide enough for "BatteryBelow 30" at 12px mono (15 chars, 108px), and seven
   leaves still fit an 800 box: 7 x 104 + 6 x 6 = 764. */
const WIDE = { nodeW: 104, hGap: 6, vGap: 44 };

D["answers/three"] = () => {
  const one = T("FlyTo A");
  const col = (x, st) => tree(one, { x, y: 60, status: st ? { n0: st } : {} });
  return figure({
    title: "The three answers, and one action across four ticks",
    desc: "Three copies of one action node filled Success, Failure and Running, then the same FlyTo node shown across four consecutive ticks answering Running three times and Success once.",
    captions: [
      "A node can answer three things.",
      "Success: the job is done. Failure: it cannot be done.",
      "Running: not yet. This is the answer that takes time.",
      "The same action, four ticks in a row. Not yet, not yet, not yet, done.",
    ],
    states: [
      col(120) + col(360) + col(600),
      col(120, "ok") + chip(168, 130, "Success", "ok") + col(360, "fail") + chip(408, 130, "Failure", "fail") + col(600),
      col(600, "run") + chip(648, 130, "Running", "run"),
      [0, 1, 2, 3].map((i) => tree(one, { x: 120 + i * 180, y: 300, status: { n0: i < 3 ? "run" : "ok" } }) +
        note(168 + i * 180, 370, `tick ${i + 1}`)).join(""),
    ],
  });
};

D["sequence/todo"] = () => {
  /* n0 -> deliver | n1 BatteryAbove | n2 TakeOff | n3 FlyTo A | n4 Drop | n5 ReturnHome | n6 Land */
  const s = T("-> deliver\n  BatteryAbove 30\n  TakeOff\n  FlyTo A\n  Drop\n  ReturnHome\n  Land");
  const at = { x: 40, y: 80, ...WIDE };
  return figure({
    title: "A Sequence walks its list and stops at the first Running or Failure",
    desc: "A Sequence with six children. First all idle; then the first two answer Success and the third Running, so the Sequence answers Running; then the battery condition answers Failure and the Sequence answers Failure with the rest untouched.",
    captions: [
      "Six things to do, in order.",
      "Tick: the check passes, take off passes, the flight is Running. So is the list.",
      "Next tick the check fails. The list fails. Nothing to the right is asked.",
      "The tick after that, the list starts from the first child again. It does not remember.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n1: "ok", n2: "ok", n3: "run", n0: "run" } }),
      tree(s, { ...at, status: { n1: "fail", n0: "fail" } }),
      tree(s, { ...at, pulse: { "n0>n1": 0.5 } }) + note(400, 300, "tick 3: back to the first child"),
    ],
  });
};

D["fallback/plan-b"] = () => {
  /* n0 ? get power | n1 Charge | n2 ReturnHome */
  const s = T("? get power\n  Charge\n  ReturnHome");
  const at = { x: 280, y: 100 };
  return figure({
    title: "A Fallback tries plan A every tick and takes plan B only while A fails",
    desc: "A Fallback with two children, Charge and ReturnHome. Charge answers Failure and ReturnHome Running for many ticks; then Charge answers Running and ReturnHome is not asked.",
    captions: [
      "Two plans. The left one is preferred.",
      "Charge fails, away from the pad. ReturnHome runs. The Fallback runs.",
      "Every tick, the same: plan A is asked first, and fails again.",
      "On the pad, plan A answers Running. Plan B is not asked, and is halted.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n1: "fail", n2: "run", n0: "run" } }),
      tree(s, { ...at, pulse: { "n0>n1": 0.4 } }) + note(400, 300, "asked again, ten times a second"),
      tree(s, { ...at, status: { n1: "run", n0: "run" } }),
    ],
  });
};

D["condition/pure"] = () => {
  /* n0 -> peek | n1 NudgedNorth | n2 FlyTo A */
  const s = T("-> peek\n  NudgedNorth\n  FlyTo A");
  const at = { x: 280, y: 100 };
  return figure({
    title: "A condition is an ellipse because it only asks; a dirty one is hatched",
    desc: "A Sequence with a condition and an action. The condition is drawn as an ellipse and the action as a rounded box; in the last state the condition is hatched to show it changed the world while answering.",
    captions: [
      "An ellipse asks. A rounded box does.",
      "Both answer Success on this tick.",
      "The interpreter counted a change to the world during the ellipse. Hatched: this condition did something.",
    ],
    states: [
      tree(s, at) + note(400, 300, "condition: ellipse. action: rounded box."),
      tree(s, { ...at, status: { n1: "ok", n2: "run", n0: "run" } }),
      tree(s, { ...at, status: { n1: "ok", n2: "run", n0: "run" }, dirty: { n1: true } }) + note(400, 330, "hatched: a condition with a side effect"),
    ],
  });
};

D["reactive/preempt"] = () => {
  const s = T(PREEMPT), at = { x: 18, y: 60, ...WIDE };
  return figure({
    title: "The safety branch cuts the delivery the tick the battery drops",
    desc: "The chapter 6 tree. Delivery Running on the right; then the battery condition on the left answers Success, ReturnHome runs, and every delivery node goes idle.",
    captions: [
      "Safety on the left, the job on the right.",
      "Battery fine: the check fails, the Fallback moves right, the flight is Running.",
      "Battery drops: the check passes, ReturnHome runs, and the Fallback stops there.",
      "The delivery was not asked. Anything Running in it is halted. Nothing said abort.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n2: "fail", n1: "fail", n6: "run", n5: "run", n0: "run" } }),
      tree(s, { ...at, status: { n2: "ok", n3: "run", n1: "run", n0: "run" } }),
      tree(s, { ...at, status: { n2: "ok", n3: "run", n1: "run", n0: "run" } }) + note(560, 330, "idle: halted, target cleared"),
    ],
    vb: "0 0 800 360",
  });
};

D["memory/modes"] = () => {
  const s = T(PREEMPT), at = { x: 18, y: 60, ...WIDE };
  const battery = { n2: "ok", n3: "run", n1: "run", n0: "run" };
  const skipped = { n6: "run", n5: "run", n0: "run" };
  return figure({
    title: "The tick after the battery drops, in three modes",
    desc: "The chapter 6 tree, the tick after the battery drops. With the root reactive the battery check passes and ReturnHome runs. With the root in memory or keep mode the check is skipped and the flight keeps running.",
    captions: [
      "Same tree. The mode on the root is what changes below.",
      "Root reactive: the left branch is asked first, every tick. The check catches the drop.",
      "Root memory: the root's finger is on the delivery. The check is not asked. The drone flies on.",
      "Root keep: the same on this tick. It differs only after a Failure, when it will not restart.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: battery }) + note(400, 300, "root {reactive}"),
      tree(s, { ...at, status: skipped }) + note(400, 320, "root {memory}: the check on the left is never asked"),
      note(400, 340, "root {keep}: identical on this tick"),
    ],
    vb: "0 0 800 360",
  });
};

D["decorators/kinds"] = () => {
  /* n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 retry 3 | n5 Charge
     n6 -> deliver | n7 timeout 200 | n8 FlyTo A | n9 Drop | n10 ReturnHome | n11 Land */
  const s = T("? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> deliver {memory}\n    timeout 200\n      FlyTo A\n    Drop\n    ReturnHome\n    Land");
  const at = { x: 40, y: 40, nodeW: 88, hGap: 10, vGap: 40 };
  return figure({
    title: "Decorators sit between a parent and one child and rule on its answer",
    desc: "The chapter 6 tree with a retry rhombus above Charge and a timeout rhombus above FlyTo A. In the last state the timeout answers Failure while its child was Running.",
    captions: [
      "Two rhombuses. Each has exactly one child.",
      "retry 3: Charge fails once, the rhombus answers Running and will try again.",
      "timeout 200: the flight has been Running for 201 ticks. The rhombus halts it and answers Failure.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n5: "fail", n4: "run" } }),
      tree(s, { ...at, status: { n8: "run", n7: "fail", n6: "fail" } }) + note(400, 460, "the child was Running; the rhombus turned that into Failure"),
    ],
    vb: "0 0 800 480",
  });
};

D["parallel/m-of-n"] = () => {
  /* n0 => 2 both | n1 A | n2 B | n3 C */
  const s = T("=> 2 both\n  Hover\n  Charge\n  Land");
  const at = { x: 220, y: 100 };
  return figure({
    title: "A Parallel ticks every child and answers by count",
    desc: "A Parallel with threshold 2 over three actions. Every child is ticked every tick; with two Successes the Parallel answers Success even though the third is Running.",
    captions: [
      "Three children, threshold two.",
      "Every child is ticked. One Success, two Running: not there yet.",
      "Two Successes reach the threshold. The Parallel answers Success. The third child is halted.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n1: "ok", n2: "run", n3: "run", n0: "run" } }),
      tree(s, { ...at, status: { n1: "ok", n2: "ok", n3: "run", n0: "ok" } }) + note(400, 300, "M = 2 of N = 3"),
    ],
  });
};

D["blackboard/ports"] = () => {
  /* n0 -> deliver | n1 FlyTo Goal | n2 Drop */
  const s = T("-> deliver\n  FlyTo Goal\n  Drop");
  const at = { x: 60, y: 100 };
  const board = (goal, hi) =>
    `<rect class="stroke k-ref" x="470" y="110" width="270" height="120" fill="none"/>` +
    note(605, 100, "blackboard") +
    chip(540, 150, "goal", "ink") + chip(660, 150, goal, hi ? "run" : "ink") +
    chip(540, 195, "battery", "ink") + chip(660, 195, "74 %", "ink");
  return figure({
    title: "Nodes do not talk to each other; they read and write a shared store",
    desc: "A two node Sequence beside a box labelled blackboard holding a goal key and a battery key. A dashed line from FlyTo Goal to the goal key shows it reads the value; in the last state the value has changed and FlyTo reads the new one.",
    captions: [
      "The tree on the left. The store on the right.",
      "FlyTo Goal reads the goal key every tick. It does not hold a copy.",
      "The goal changes to B. Next tick FlyTo reads B. Nothing in the tree had to change.",
    ],
    states: [
      tree(s, at) + board("A"),
      tree(s, at) + board("A") + dashed(150, 200, 620, 160),
      tree(s, at) + board("B", true) + dashed(150, 200, 620, 160),
    ],
  });
};

D["fsm/transitions"] = () => {
  /* the chapter 6 tree as a machine: four states, and the arrows a machine needs */
  const st = (x, y, label) => `<rect class="stroke k-ink" x="${x - 50}" y="${y - 18}" width="100" height="36" fill="none"/>` + chip(x, y, label, "ink", { small: true });
  const P = { fly: [160, 120], drop: [400, 120], home: [640, 120], charge: [400, 320] };
  const arrowLine = (a, b) => line(P[a][0], P[a][1], P[b][0], P[b][1], "ref");
  const happy = arrowLine("fly", "drop") + arrowLine("drop", "home");
  const safety = arrowLine("fly", "charge") + arrowLine("drop", "charge") + arrowLine("home", "charge") + arrowLine("charge", "fly");
  return figure({
    title: "The chapter 6 tree as a state machine: every interruption is an arrow",
    desc: "Four state boxes, Fly, Drop, Home and Charge. The happy path is two arrows. Adding the low battery rule adds an arrow from every state to Charge and one back.",
    captions: [
      "The same behaviour as four states.",
      "The happy path: two arrows.",
      "Now the battery rule. Every state needs an arrow to Charge, and Charge needs one back. Four more.",
      "In the tree, the battery rule was one branch on the left, and no other node changed.",
    ],
    states: [
      st(...P.fly, "FLY TO A") + st(...P.drop, "DROP") + st(...P.home, "RETURN HOME") + st(...P.charge, "CHARGE"),
      happy,
      safety + note(400, 420, "N states, up to N squared arrows"),
      note(400, 450, "the tree: one new branch, zero edits elsewhere"),
    ],
  });
};

D["design/backchain"] = () => {
  /* n0 ? delivered | n1 AtWaypoint Goal | n2 -> | n3 ? there | n4 AtWaypoint Goal | n5 FlyTo Goal | n6 Drop */
  const goal = T("? parcel at goal\n  Delivered\n  -> \n    ? at the goal\n      AtWaypoint Goal\n      FlyTo Goal\n    Drop");
  const at = { x: 160, y: 60 };
  return figure({
    title: "Backward chaining: start from done and add a branch for each thing that could be false",
    desc: "A tree grown from the goal. The root Fallback checks the parcel is delivered; if not, a Sequence gets to the goal, using a Fallback that checks the drone is already there before flying, then drops.",
    captions: [
      "Start at the end: is the parcel delivered? If so, nothing to do.",
      "If not, the one action that makes it so is Drop. But Drop needs the drone at the goal.",
      "So put that condition on the left of a Fallback, and the action that makes it true on the right.",
      "Every action has its success condition to its left. An action already satisfied is never run.",
    ],
    states: [
      tree(T("? parcel at goal\n  Delivered"), at),
      tree(T("? parcel at goal\n  Delivered\n  -> \n    AtWaypoint Goal\n    Drop"), at),
      tree(goal, at),
      tree(goal, at) + note(400, 330, "implicit sequence: condition left, action right"),
    ],
  });
};

D["nav2/tree"] = () => {
  const spec = nav2ToSpec(NAV2);
  const small = { nodeW: 74, nodeH: 22, hGap: 4, vGap: 26 };
  const L = layout(spec, small);
  const scale = Math.min(1, 780 / L.w);
  return figure({
    title: "The default Nav2 navigation tree, drawn from its own XML file",
    desc: "The ROS 2 Nav2 navigate to pose tree with replanning and recovery, every node drawn from the project's XML. Its custom control nodes are double ruled boxes because this course does not run them.",
    captions: [
      "A production tree, node for node, from content/nav2.xml. The labels are small on purpose: this plate is about the shape. The file is on the sources page.",
      "Double ruled boxes are Nav2's own control nodes: RecoveryNode, PipelineSequence, RoundRobin. Their rules are in the Nav2 documentation, not in this course's interpreter.",
    ],
    states: [
      `<g transform="translate(${(800 - L.w * scale) / 2} 20) scale(${scale.toFixed(3)})">${tree(spec, { x: 0, y: 0, ...small })}</g>`,
      note(400, 480, "drawn, not executed"),
    ],
    vb: "0 0 800 500",
  });
};

D["design/stack"] = () => {
  const box = (y, label, kind) => `<rect class="stroke ${kind === "tree" ? "k-ink" : "k-ref"}" x="250" y="${y}" width="300" height="60" fill="none"/>` + chip(400, y + 30, label, "ink");
  return figure({
    title: "Where the tree sits: above the autopilot, not inside it",
    desc: "Four stacked boxes: mission behavior tree at the top, then the autopilot's mode state machine, then its control loops, then the airframe. Arrows down carry a mode to hold; arrows up carry the state.",
    captions: [
      "The airframe, and the loops that keep it stable. This was the flight course.",
      "Above them, the autopilot's mode machine: which number is being held.",
      "Above that, the tree. It decides which mode to ask for, ten times a second.",
      "Klockner 2013, Aerostack2 and drone_trees all draw it this way. PX4 and ArduPilot are the middle two layers.",
    ],
    states: [
      box(340, "airframe", "ref") + box(260, "control loops (hold a number)", "ref"),
      box(180, "autopilot mode state machine", "ref"),
      box(100, "mission behavior tree", "tree") + line(400, 160, 400, 180, "tick") + line(400, 240, 400, 260, "ref") + line(400, 320, 400, 340, "ref"),
      note(400, 440, "the tree asks for a mode; the machine and the loops fly the aircraft"),
    ],
  });
};

/* The index plate: the course as a tree, one chapter per node, each a link.
   Built from LESSONS so a renamed chapter cannot leave a stale label. Imported
   lazily so diagrams.js does not depend on lessons.js at module load. */
export function indexTree(lessons) {
  const spec = {
    kind: "Fallback", name: "the course", id: "root", children: [
      { kind: "Sequence", name: "the tick", id: "a", children: lessons.slice(0, 2).map((l) => ({ kind: "Action", leaf: l.title, id: l.id, children: [] })) },
      { kind: "Sequence", name: "control", id: "b", children: lessons.slice(2, 6).map((l) => ({ kind: "Action", leaf: l.title, id: l.id, children: [] })) },
      { kind: "Sequence", name: "power", id: "c", children: lessons.slice(6, 10).map((l) => ({ kind: "Action", leaf: l.title, id: l.id, children: [] })) },
      { kind: "Sequence", name: "the world", id: "d", children: lessons.slice(10, 12).map((l) => ({ kind: "Action", leaf: l.title, id: l.id, children: [] })) },
    ],
  };
  const hrefs = Object.fromEntries(lessons.map((l) => [l.id, `#${l.id}`]));
  const L = layout(spec, { nodeW: 118, nodeH: 40, hGap: 10, vGap: 60 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.w} ${L.h}" class="figure figure--index" role="img" aria-label="The course drawn as a tree; every leaf is a chapter">` +
    tree(spec, { hrefs, nodeW: 118, nodeH: 40, hGap: 10, vGap: 60 }) + `</svg>`;
}
```

- [ ] **Step 3: Run the figure and content checks**

Run: `node scripts/check-figures.mjs && node scripts/check-content.mjs`
Expected: figures pass (every state inside the viewBox, no chip overlaps, one caption per state; if a chip overlaps, move the chip, do not shrink the text) and the content check passes completely, including `all 14 figure builders resolve` (thirteen plus `tick/root-to-leaf`; `indexTree` is a named export, not a builder).

- [ ] **Step 4: Commit**

```bash
git add src/data/diagrams.js src/bt/nav2.js src/bt/layout.js scripts/check-figures.mjs
git commit -m "feat(figures): thirteen plates, the Nav2 tree from its XML, and the index tree"
```

---

### Task 11: The playground, and the chapter page that mounts it

**Files:**
- Create: `src/play/tree-view.js`, `src/play/playground.js`
- Create from copy: `src/ui/lesson.js`, `src/ui/steps.js`
- Modify: `src/styles/app.css` (playground rules)

**Interfaces:**
- Consumes: `start, advance` from `run.js`; `parse, format, ParseError` from `parse.js`; `reset` from `tree.js`; `layout` from `layout.js`; `node, edge` from `svg.js`; `PLAYS, WORLDS` from `plays.js`; `el, mark` from `util.js`; `markStep, stepsFor, doneSteps` from `steps.js`.
- Produces: `treeView(host) -> { render(spec), paint(trace), clear() }`; `mountPlayground(host, cfg, { onDone }) -> stop()`; lesson block `play` rendered inline; steps key `play` with label "Make it happen in the playground".

- [ ] **Step 1: The tree view**

`src/play/tree-view.js`:

```js
/* Draws a tree as SVG and repaints it from a trace. Layout comes from
   layout.js, shapes from svg.js, so this is the plate primitives made live. */
import { layout } from "../bt/layout.js";
import { node, edge } from "../data/svg.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };

export function treeView(host) {
  let svg = null, byId = new Map();
  return {
    render(spec) {
      const L = layout(spec, { nodeW: 104, nodeH: 34, hGap: 8, vGap: 44 });
      host.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.w} ${L.h}" class="figure tree-live" role="img" aria-label="The tree, repainted every tick">` +
        `<defs><pattern id="hatch-live" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
        L.edges.map((e) => edge(e.x1, e.y1, e.x2, e.y2)).join("") +
        L.nodes.map((d) => node(d.kind, d.x, d.y, d.label, { w: d.w, h: d.h }).replace("<g class=", `<g data-id="${d.id}" class=`)).join("") +
        `</svg>`;
      svg = host.firstElementChild;
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
    },
    paint(trace) {
      for (const g of byId.values()) { g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err"); g.classList.add("st-idle"); }
      for (const t of trace) {
        const g = byId.get(t.id);
        if (!g) continue;
        g.classList.remove("st-idle");
        g.classList.add(`st-${ST[t.status] ?? "idle"}`);
        if (t.dirty) g.classList.add("dirty");
        if (t.error) { g.classList.add("err"); g.querySelector("title")?.remove(); g.insertAdjacentHTML("afterbegin", `<title>${t.error}</title>`); }
      }
    },
    clear() { this.paint([]); },
  };
}
```

In `svg.js` the `.node.dirty ellipse { fill: url(#hatch) }` rule needs the live id too: change the CSS rule to `.node.dirty ellipse { fill: url(#hatch); } .tree-live .node.dirty ellipse { fill: url(#hatch-live); }`.

- [ ] **Step 2: The playground**

`src/play/playground.js`:

```js
/* Two panes: the tree, repainted every tick, and the world beside it. The
   reader steps ticks, plays them at a chosen rate, flips variants and modes,
   injects hazards, and (in the checkride and chapter 12) edits the tree as
   text. Nothing here knows it is a drone: `cfg.world` names a WORLDS entry
   and everything the playground needs comes off that object. */
import { start, advance } from "../bt/run.js";
import { parse, format, ParseError } from "../bt/parse.js";
import { WORLDS } from "../data/plays.js";
import { treeView } from "./tree-view.js";
import { el, mark } from "../ui/util.js";

const RATES = [1, 2, 5, 10, 30, 60];   // ticks per second on the slider

export function mountPlayground(host, cfg, { onDone } = {}) {
  const world = WORLDS[cfg.world];
  const leaves = { ...world.leaves, ...(cfg.extraLeaves ?? {}) };
  const W = { ...world, leaves };
  let text = cfg.tree, sim = null, timer = null, rate = 10, done = false, lastPick = null, switches = 0;

  host.innerHTML =
    `<div class="pg">` +
      `<p class="pg__brief">${cfg.brief}</p>` +
      `<div class="pg__panes"><div class="pg__tree"></div><div class="pg__world"></div></div>` +
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
  const view = treeView(q(".pg__tree"));

  function boot() {
    stop();
    try { sim = start({ world: W, scenario: cfg.scenario, tree: text }); }
    catch (e) { showErr(e); return; }
    showErr(null);
    cfg.start?.(sim.state);
    view.render(sim.spec);
    view.clear();
    lastPick = null; switches = 0; done = false;
    paintWorld(null);
  }
  function showErr(e) {
    const p = q(".pg__err"); if (!p) { if (e) console.error(e); return; }
    p.hidden = !e; p.textContent = e ? e.message : "";
  }
  function oneTick(hazard) {
    if (!sim) return;
    const { status, trace } = advance(sim, hazard);
    view.paint(trace);
    if (cfg.counter) {
      /* The trace is post-order (a node is pushed after its children), so the
         LAST root child in it is the branch that decided the root's answer. */
      const kids = new Set(sim.bt.root.children.map((c) => c.id));
      const pick = [...trace].reverse().find((t) => kids.has(t.id))?.id ?? null;
      if (lastPick !== null && pick !== lastPick) switches++;
      lastPick = pick;
      q(".pg__count b").textContent = String(switches);
    }
    paintWorld(status);
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
    b.onclick = () => { sw.querySelectorAll(".pg__var").forEach((x) => x.classList.remove("on")); b.classList.add("on"); text = v.tree; if (q("textarea")) q("textarea").value = text; boot(); };
    sw.appendChild(b);
  });
  if (cfg.modes) {
    const lab = el("label", "pg__mode", `root mode <select><option>reactive</option><option>memory</option><option>keep</option></select>`);
    lab.querySelector("select").onchange = (e) => {
      const spec = parse(text, leaves);
      if (spec.kind === "Sequence" || spec.kind === "Fallback") { spec.mode = e.target.value; text = format(spec); if (q("textarea")) q("textarea").value = text; boot(); }
    };
    sw.appendChild(lab);
  }
  /* hazards */
  const hz = q(".pg__hazards");
  (cfg.hazards ?? []).forEach((id) => {
    const h = W.hazards.find((x) => x.id === id); if (!h) return;
    const b = el("button", "pg__hz", h.label); b.type = "button";
    b.onclick = () => { if (!sim) return; h.apply(sim.state); paintWorld(null); };
    hz.appendChild(b);
  });
  /* editor */
  if (cfg.editor) {
    q("textarea").value = text;
    q(".pg__apply").onclick = () => {
      try { parse(q("textarea").value, leaves); text = q("textarea").value; boot(); }
      catch (e) { showErr(e instanceof ParseError ? e : new Error(e.message)); }
    };
  }

  boot();
  return () => { stop(); sim = null; };
}
```

- [ ] **Step 3: Copy lesson.js and steps.js and switch them from sandbox to play**

```bash
cp ../flight-dynamics/src/ui/lesson.js ../flight-dynamics/src/ui/steps.js src/ui/
```

In `src/ui/steps.js`: replace the `TASKS` import with `import { PLAYS } from "../data/plays.js";`. Change `STEPS.fly` to `play: { label: "Make it happen in the playground", hint: "the goal latches once met" }`. In `stepsFor`, replace `if (Object.hasOwn(TASKS, id)) keys.push("fly");` with `if (les?.flow.some((b) => b.t === "play" && PLAYS[b.id]?.goal)) keys.push("play");`. Change the event name `fd:progress` to `bt:progress` here and in `lesson.js`. In `util.js` change the storage keys `fd.progress` to `bt.progress` and `fd.plate` to `bt.plate` (a fresh course does not share progress with the flight one).

In `src/ui/lesson.js`:
- Delete the `hasTask` import and add `import { PLAYS } from "../data/plays.js";` and `import { mountPlayground } from "../play/playground.js";`.
- Delete the `term` case entirely (this course has no term blocks).
- Add a `fact` case after `p`: `case "fact": node = el("p", "fact", b.text); break;` and a `play` case:

```js
      /* The playground, inline. No dialog: there is no engine to download and
         the reader edits the tree while reading about it. */
      case "play": {
        const cfg = PLAYS[b.id];
        if (!cfg) { console.error("play block with no configuration:", b.id); break; }
        node = el("div", "play");
        node.appendChild(el("div", "play__cap", `<span>Playground</span><span>Ch ${String(i + 1).padStart(2, "0")} · ${b.id}</span>`));
        const host = el("div", "play__host");
        node.appendChild(host);
        const stop = mountPlayground(host, cfg, { onDone: () => markStep(les.id, "play") });
        const prev = teardown;
        teardown = () => { stop(); prev?.(); };
        playNode = node;
        break;
      }
```
  with `let playNode = null;` declared beside `vidsNode` and `checkNode`, and the `jump` map changed to `{ video: () => vidsNode, check: () => checkNode, play: () => playNode }`.
- Delete the whole `if (hasTask(les.id)) { ... }` block (the launch button and the dialog). Delete `let launchBtn = null;`.
- Everything else (bench, figure stepping, steps list, footer) stays.

- [ ] **Step 4: Playground CSS**

Append to `src/styles/app.css`:

```css
/* ── the playground ──────────────────────────────────────────────────────── */
.play { margin: 28px 0; border: var(--w-rule) solid var(--ink); }
.play__cap { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: var(--w-hair) solid var(--rule);
  font-family: var(--f-mono); font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
.pg { padding: 12px; }
.pg__brief { margin: 0 0 12px; color: var(--ink-2); }
.pg__panes { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; align-items: start; }
.pg__tree svg { width: 100%; height: auto; }
.pg__bar, .pg__switches, .pg__hazards { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 12px; }
.pg button { font-family: var(--f-mono); font-size: 12px; padding: 6px 10px; background: var(--paper); color: var(--ink);
  border: var(--w-rule) solid var(--ink); border-radius: 0; cursor: pointer; }
.pg button:hover { background: var(--paper-sunk); }
.pg .pg__var.on { background: var(--ink); color: var(--paper); }
.pg__rate, .pg__mode { font-family: var(--f-mono); font-size: 12px; color: var(--ink-2); display: inline-flex; gap: 6px; align-items: center; }
.pg__rate input { width: 90px; accent-color: var(--accent); }
.pg__tick, .pg__count { font-family: var(--f-mono); font-size: 12px; color: var(--ink-2); margin-left: auto; }
.pg__tick i { font-style: normal; color: var(--ink); }
.pg__goal { margin-top: 12px; padding: 8px 10px; border: var(--w-rule) solid var(--s-ok); font-size: 14px; }
.pg__board { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.pg__bb, .pg__log { font-family: var(--f-mono); font-size: 11px; border-collapse: collapse; width: 100%; }
.pg__bb th, .pg__log th { text-align: left; color: var(--ink-3); font-weight: 500; padding: 2px 6px 2px 0; }
.pg__bb td, .pg__log td { padding: 2px 6px 2px 0; border-top: var(--w-hair) solid var(--rule-soft); }
.pg__edit textarea { width: 100%; font-family: var(--f-mono); font-size: 13px; padding: 8px; margin-top: 12px;
  background: var(--paper-sunk); color: var(--ink); border: var(--w-hair) solid var(--rule); resize: vertical; }
.pg__err { color: var(--s-fail); font-family: var(--f-mono); font-size: 12px; }
.tree-live .node.err rect, .tree-live .node.err ellipse { stroke-dasharray: 3 2; }
.fact { border-left: var(--w-line) solid var(--ink); padding-left: 12px; color: var(--ink-2); }
@media (max-width: 1020px) {
  .pg__panes, .pg__board { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .pg__tree svg * { transition: none; } }
```

- [ ] **Step 5: Wire a temporary main.js and look at it**

Replace `src/main.js` with:

```js
import "./styles/app.css";
import { LESSONS } from "./data/lessons.js";
import { renderLesson } from "./ui/lesson.js";
document.getElementById("boot")?.classList.add("gone");
renderLesson(document.getElementById("app"), location.hash.slice(1) || LESSONS[0].id);
addEventListener("hashchange", () => renderLesson(document.getElementById("app"), location.hash.slice(1) || LESSONS[0].id));
```

Start the dev server with the browser tool (`preview_start` with name `dev`) and open `#the-tick`, `#reactivity`, `#memory`, `#design`. Check, and fix before moving on:
- Step advances the tick counter by one and repaints node fills.
- Play moves the drone; the arrow glyph turns toward A.
- On `#reactivity`, pressing the battery hazard mid flight makes the delivery nodes go idle and ReturnHome go amber within one tick.
- On `#memory`, the root mode select rewrites the tree text and the drone dies in memory mode after the hazard.
- On `#design`, editing the textarea to an invalid tree shows the line numbered error and the old tree keeps running.
- Phone width (375px): panes stack, no horizontal scroll.
- Console has no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(play): the inline playground, and the chapter page that mounts it"
```

---

### Task 12: The app shell: index, cards, dialects, sources

**Files:**
- Create: `src/main.js` (final), `src/ui/home.js`, `src/ui/dialects.js`, `src/ui/credits.js`, `NOTICE`
- Create from copy: `src/ui/cards.js`

**Interfaces:**
- Consumes: `indexTree` from `diagrams.js`; `LESSONS, PARTS, COURSE, lessonsIn` from `lessons.js`; `chapterDone, doneCount, stepsFor` from `steps.js`; `catalogueStrip` from `cards.js`; `checkrideStrip` from `checkride.js` (Task 13; until then export a stub `checkrideStrip = () => el("span")` in a temporary `src/ui/checkride.js`); `dialectsStrip` from `dialects.js`; `creditsStrip` from `credits.js`.
- Routes: `#` index, `#<lesson id>` chapter, `#cards`, `#checkride`, `#dialects`, `#credits`.

- [ ] **Step 1: Copy cards.js**

```bash
cp ../flight-dynamics/src/ui/cards.js src/ui/cards.js
```
Change `fd.deck` (the localStorage key inside it; find with grep) to `bt.deck`. No other change: it derives from `buildDeck()`.

- [ ] **Step 2: The index**

`src/ui/home.js`:

```js
/* The index is the drawing: the course as a tree, one chapter per leaf,
   authored in diagrams.js from LESSONS so a renamed chapter cannot leave a
   stale label. Beneath it, the parts table with progress. */
import { LESSONS, PARTS, lessonsIn, COURSE } from "../data/lessons.js";
import { indexTree } from "../data/diagrams.js";
import { el } from "./util.js";
import { chapterDone, doneCount, stepsFor } from "./steps.js";
import { catalogueStrip } from "./cards.js";
import { checkrideStrip } from "./checkride.js";
import { dialectsStrip } from "./dialects.js";
import { creditsStrip } from "./credits.js";

const chapterNo = (les) => LESSONS.indexOf(les) + 1;

export function renderHome(root) {
  root.innerHTML = "";
  PARTS.forEach((part) => {
    const lessons = lessonsIn(part.n);
    if (!lessons.length) return;
    const lede = el("div", "home__lede");
    const h = el(part.n === 1 ? "h1" : "h2", "t-display");
    h.textContent = `${part.title}, taken apart`;
    const p = el("p"); p.textContent = part.lede;
    lede.append(h, p);
    const plate = el("div", "home__plate");
    plate.innerHTML = indexTree(lessons);
    /* Done chapters are filled Success on the index tree: the one place the
       course lets a status colour mean "you did this". */
    lessons.forEach((les) => { if (chapterDone(les.id)) plate.querySelector(`a[href="#${les.id}"] g`)?.classList.add("st-ok"); });
    root.append(lede, plate);

    const table = el("table", "index");
    table.innerHTML = "<thead><tr><th>Item</th><th>Lesson</th><th>Remarks</th><th></th></tr></thead>";
    const tb = el("tbody");
    lessons.forEach((les) => {
      const complete = chapterDone(les.id);
      const n = doneCount(les.id), of = stepsFor(les.id).length;
      const tr = el("tr", complete ? "done" : "");
      tr.innerHTML =
        `<td class="c-item">${String(chapterNo(les)).padStart(2, "0")}</td>` +
        `<td><a href="#${les.id}">${les.title}</a></td>` +
        `<td class="c-rem">${les.oneLiner}</td>` +
        `<td class="c-st">${complete ? "complete" : n ? `${n} of ${of}` : ""}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    root.append(table);
  });
  root.append(catalogueStrip(), checkrideStrip(), dialectsStrip(), creditsStrip());
  document.title = COURSE;
}
```

CSS: `.home__plate { margin: 24px 0; } .home__plate svg { width: 100%; height: auto; } .home__plate a { cursor: pointer; } .home__plate a:hover rect { stroke-width: 2.5; }`.

- [ ] **Step 3: The dialect table**

`src/ui/dialects.js`:

```js
/* The lookup appendix: one concept per row, one dialect per column, every
   column sourced. Not a lesson, not numbered, never fed to the deck. */
import DIAL from "../../content/dialects.json";
import SRC from "../../content/sources.json";
import { COURSE } from "../data/lessons.js";
import { el, mark } from "./util.js";

export function renderDialects(root) {
  root.innerHTML = "";
  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  head.innerHTML = `<h1 class="t-display">Dialects</h1><p class="cards__lede">The same six ideas in five vocabularies. ` +
    `Every column names the document it was read from. Where a tool changes the meaning and not just the word, the cell says so.</p>`;
  wrap.appendChild(head);
  const t = el("table", "index dialects");
  t.innerHTML = `<thead><tr><th>Concept</th>${DIAL.columns.map((c) =>
    `<th>${c.title}<br><a class="dial__src" href="${SRC.sources[c.src].url}" target="_blank" rel="noopener">${SRC.sources[c.src].grade}</a></th>`).join("")}</tr></thead>`;
  const tb = el("tbody");
  DIAL.rows.forEach((r) => {
    const tr = el("tr");
    tr.innerHTML = `<td class="c-rem">${r.concept}</td>${DIAL.columns.map((c) => `<td>${r[c.id]}</td>`).join("")}`;
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  wrap.appendChild(t);
  const back = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`); back.href = "#";
  wrap.appendChild(back);
  root.appendChild(wrap);
  document.title = `Dialects · ${COURSE}`;
}

export function dialectsStrip() {
  const a = el("a", "catalogue",
    `<span class="catalogue__t">Dialects</span><span class="catalogue__n">${DIAL.rows.length} concepts · ${DIAL.columns.length} vocabularies</span>` + mark());
  a.href = "#dialects";
  return a;
}
```

CSS: `.dialects td { font-size: 13px; vertical-align: top; } .dial__src { font-family: var(--f-mono); font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--ink-3); }`.

- [ ] **Step 4: The sources page**

Write `src/ui/credits.js` by copying the flight one and replacing its `SOURCES` array. Keep the derived channel list and the `creditsStrip` export. The new `SOURCES` has one entry per group, each with `name, who, lic, url, what`:

1. `Colledanchise and Ogren, Behavior Trees in Robotics and AI` (CRC Press 2018; arXiv 1709.00084). `who`: Michele Colledanchise and Petter Ogren. `lic`: open access on arXiv. `what`: the node definitions, algorithms 1 to 3, the memory node caution, the BT versus FSM argument and the design chapter that chapters 1 to 12 teach from; the interpreter is asserted against algorithms 1 to 3 in `scripts/check-bt.mjs`.
2. `BehaviorTree.CPP` (MIT; docs at behaviortree.dev). `who`: Davide Faconti and contributors. `what`: the Sequence and Fallback comparison tables, which define the memory and keep modes, the condition rule, the halt rule and the blackboard; no code is used.
3. `ROS 2 Nav2` (Apache 2.0). `who`: Steve Macenski and the Nav2 contributors. `what`: `content/nav2.xml` is copied verbatim from the repository and drawn, not executed, in chapter 12; the walkthrough and node reference are cited beside it.
4. `Klockner, Behavior Trees for UAV Mission Management` (DLR e-library). `what`: the placement of the tree above the autopilot, and the waypoint success condition case in chapter 7.
5. `Aerostack2 and drone_trees`. `what`: two more real drone projects that place the tree above PX4, ArduPilot or MAVLink; cited in chapter 12.
6. `PX4 and ArduPilot documentation`. `what`: the evidence that neither autopilot is a behavior tree.
7. `Ghzouli et al., SLE 2020 and IEEE TSE 2023`. `what`: the node share and the state machine versus tree counts.
8. `Game AI Pro, chapters by Champandard and Dunstan, and by Francis` (free from gameaipro.com). `what`: the games lineage vocabulary and the three pitfalls.
9. `Isla, Handling Complexity in the Halo 2 AI`. `what`: where the idea came from.
10. `Anguelov, and the AI Arborist GDC 2017 talk`. `what`: the practitioner critique quoted in chapter 11.
11. `Archivo, Archivo Narrow, JetBrains Mono` (SIL OFL 1.1) as in the flight course.

Add a closing section to the page, before the channels, titled "Could not be reached", listing verbatim section 6 of `RESEARCH.md`. It is content, so it lives in `content/unreachable.json` as `[{ what, why }]` and the page renders it; the check in Task 7 does not need to know about it.

- [ ] **Step 5: NOTICE**

Write `NOTICE` in the flight course's format with entries for: the textbook (cited, not copied), BehaviorTree.CPP (no code used; its documentation is cited), Nav2 (`content/nav2.xml` copied verbatim under Apache 2.0, with the licence text reference), the fonts, and the curated video paragraph. State that no generated imagery is used in this course.

- [ ] **Step 6: main.js, final**

```js
import "./styles/app.css";
import { LESSONS, PARTS, partOf, COURSE } from "./data/lessons.js";
import { renderHome } from "./ui/home.js";
import { renderLesson, stopLesson } from "./ui/lesson.js";
import { renderCards } from "./ui/cards.js";
import { renderCheckride, stopCheckride } from "./ui/checkride.js";
import { renderDialects } from "./ui/dialects.js";
import { renderCredits } from "./ui/credits.js";
import { el, applyPlate, currentPlate, cyclePlate } from "./ui/util.js";
import { logoSvg, faviconDataUri } from "./ui/logo.js";
```
Then copy the body of the flight `main.js` (zone rails, header, route, boot cover handling) and change: the `#glossary` route to `#dialects` calling `renderDialects`; the checkride route to only `#checkride` (one ride); `meta.textContent` values to match. Read the flight file end to end before copying so the boot cover floor and the font ready wait come across intact.

- [ ] **Step 7: Build, browse, commit**

Run: `npm run build` then open the dev server at `#`, `#cards`, `#dialects`, `#credits`, and two chapters. Check the index tree links open chapters, a completed chapter fills green on the index, the light/dark plate toggle keeps every status colour readable, and phone width has no horizontal scroll.

```bash
git add -A
git commit -m "feat(shell): index tree, dialect table, sources page and routes"
```

---

### Task 13: The checkride

**Files:**
- Create: `src/data/exam.js`, `src/ui/checkride.js` (replacing the stub), `scripts/check-checkride.mjs`

**Interfaces:**
- Consumes: `run` from `run.js`; `mountPlayground` from `playground.js`; `chapterDone` from `steps.js`.
- Produces: `EXAM = [{ n, name, ch, brief, scenario, script, ticks, starter, pass(state, history) -> boolean, reference, wrong }]`; `judge(item, treeText) -> { passed, reason }`; `renderCheckride(root)`, `stopCheckride()`, `checkrideStrip()`.

- [ ] **Step 1: The items and the judge**

`src/data/exam.js`:

```js
/* The checkride. Five items, each a claim the course made that you now have to
   produce as a tree. The interpreter judges. Each carries a reference tree that
   passes and a misconception tree that fails, and check-checkride.mjs runs both,
   because an exam item nobody can pass is worse than no item. */
import { run } from "../bt/run.js";
import { WORLDS } from "./plays.js";

const near = (s, p, r = 3) => Math.hypot(s.x - p.x, s.y - p.y) <= r;
const home = (s) => near(s, s.home);

export const EXAM = [
  {
    n: 1, name: "Deliver to A, then come home and land", ch: 3,
    brief: "No hazards. Fly to A, drop the parcel, fly home, land. Warm up the editor.",
    scenario: "delivery", script: [], ticks: 1200,
    starter: "-> mission {memory}\n  FlyTo A\n",
    pass: (s) => s.delivered && s.landed && home(s),
    reference: "-> mission {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
    wrong: "-> mission {memory}\n  FlyTo A\n  ReturnHome\n  Land",
  },
  {
    n: 2, name: "Survive a battery drop", ch: 6,
    brief: "At tick 80 the battery drops to 12 percent. Be home and landed before it is empty. Deliver if you can.",
    scenario: "delivery", script: [{ at: 80, hazard: "battery12" }], ticks: 1500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    pass: (s) => !s.dead && s.landed && home(s),
    reference: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
    wrong: "? root {memory}\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  },
  {
    n: 3, name: "Get out of a no fly zone within thirty ticks", ch: 6,
    brief: "At tick 60 a no fly zone appears on your path and a gust pushes you into it. Be out within thirty ticks of entering, then finish the delivery.",
    scenario: "delivery", script: [{ at: 60, hazard: "nofly" }, { at: 60, hazard: "gust" }], ticks: 2500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    pass: (s, h) => {
      let inside = 0;
      for (const x of h) {
        const inZ = s.noFly.some((r) => x.x >= r.x && x.x <= r.x + r.w && x.y >= r.y && x.y <= r.y + r.h);
        inside = inZ ? inside + 1 : 0;
        if (inside > 30) return false;
      }
      return s.delivered;
    },
    reference: "? root\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
    wrong: "? root {memory}\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  },
  {
    n: 4, name: "Reach a goal that moves", ch: 10,
    brief: "At tick 60 the goal moves to B. Deliver to wherever the goal is, then come home.",
    scenario: "delivery", script: [{ at: 60, hazard: "goalB" }], ticks: 2000,
    starter: "-> deliver {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land\n",
    pass: (s) => s.delivered && s.goal === "B" && home(s),
    reference: "-> deliver {memory}\n  FlyTo Goal\n  Drop\n  ReturnHome\n  Land",
    wrong: "-> deliver {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
  },
  {
    n: 5, name: "Patrol A then B in a wind, and never go back to A", ch: 7,
    brief: "A steady gust from tick 1. Visit A, then B, then land at B. Once you have reached A you may not target it again.",
    scenario: "delivery", script: [{ at: 1, hazard: "gust" }], ticks: 2500,
    starter: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land\n",
    pass: (s, h) => {
      const A = s.waypoints.A;
      let reachedAt = -1;
      h.forEach((x, i) => { if (reachedAt < 0 && near(x, A)) reachedAt = i; });
      if (reachedAt < 0) return false;
      const wentBack = h.slice(reachedAt + 20).some((x) => x.target && x.target.x === A.x && x.target.y === A.y);
      return !wentBack && s.landed && near(s, s.waypoints.B);
    },
    reference: "-> patrol {memory}\n  FlyTo A\n  FlyTo B\n  Land",
    wrong: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land",
  },
];

export function judge(item, treeText) {
  try {
    const r = run({ world: WORLDS.drone, scenario: item.scenario, tree: treeText, script: item.script, ticks: item.ticks,
      until: (s, h) => item.pass(s, h) });
    if (r.passed) return { passed: true, reason: "met" };
    return { passed: false, reason: r.state.dead ? "the battery ran out" : "the goal was not met before the clock ran out" };
  } catch (e) {
    return { passed: false, reason: e.message };
  }
}
```

Item 3's `pass` runs inside `until` every tick, so it must be cheap: the loop over `h` is O(ticks) per tick, which at 2500 ticks is 3 million rect tests, acceptable in Node and in the browser. If it is not, keep a running `inside` counter on the history entry instead.

- [ ] **Step 2: The check**

`scripts/check-checkride.mjs`:

```js
#!/usr/bin/env node
/* Every exam item passes with its reference tree and fails with its
   misconception tree. Run with `npm run check`. */
import { EXAM, judge } from "../src/data/exam.js";
let failed = 0;
for (const item of EXAM) {
  const ok = judge(item, item.reference), bad = judge(item, item.wrong);
  const good = ok.passed && !bad.passed;
  if (!good) failed++;
  console.log(`  ${good ? "pass" : "FAIL"}  item ${item.n}: reference ${ok.passed ? "passes" : "FAILS (" + ok.reason + ")"}, misconception ${bad.passed ? "PASSES" : "fails (" + bad.reason + ")"}`);
}
console.log(failed ? `\n${failed} checkride item(s) FAILED` : "\ncheckride: every item is reachable, and closed to its misconception");
process.exit(failed ? 1 : 0);
```

Run: `node scripts/check-checkride.mjs`
Expected: five `pass` lines. If item 3's wrong tree passes, the gust is not strong enough to push the drone into the zone; the drone's path from home to A passes through the rect at x 80 to 130, y 40 to 80 (the straight line from (20,120) to (160,30) crosses it), so the wrong tree should already enter it without wind; check that the reference tree exits within 30 ticks (ExitNoFly's nearest exit is at most 25 m away at 10 m/s, so under 30 ticks). If item 3's reference tree never delivers, it is bouncing on the zone's south edge: it exits south, the delivery re-enters, and only the eastward wind carries it past the zone's east side, about 110 ticks of bouncing. Either raise `ticks` for the item or move the zone rect so its nearest exit is the east edge; do not weaken the 30 tick rule. If item 5's reference fails, `ReturnHome`/`FlyTo` may be re-targeting on the same coordinates; the `wentBack` test skips 20 ticks after first reaching A for that reason.

- [ ] **Step 3: The checkride page**

`src/ui/checkride.js`, replacing the stub. Structure copied from the flight course's `checkride.js` with these differences: one ride, key `bt.checkride`; the brief table is the same; `fly()` becomes `sit()`, which renders the items one at a time, each as a playground with the editor open (`mountPlayground(host, { world: "drone", scenario: item.scenario, tree: item.starter, editor: true, hazards: [], brief: item.brief, goal: { test: item.pass, done: "Item met." } }, { onDone })`), plus a "Judge this tree" button that calls `judge(item, textarea value)` and shows the reason, a "Next item" button, and a running score; `report()` names what was produced: "You cut a delivery for a battery, got out of a zone in thirty ticks, followed a goal that moved, and knew when memory was right." `checkrideStrip()` reads the best score from `bt.checkride`. The scripted hazards are applied by the judge, not by the reader, so the playground for each item receives `script: item.script` and `playground.js` must honour it: in `oneTick`, look up `cfg.script?.find((e) => e.at === sim.t + 1)` and pass the matching hazard to `advance`. Add that one line to `playground.js`.

- [ ] **Step 4: Run every check, browse, commit**

Run: `npm run check`
Expected: all five scripts pass.

Open `#checkride`, sit item 2, paste the reference tree, judge it, see "met"; paste the wrong tree, judge it, see "the battery ran out".

```bash
git add -A
git commit -m "feat(checkride): five typed items judged by the interpreter"
```

---

### Task 14: Videos, docs, and the final check

**Files:**
- Create: `content/concepts.json`, `content/videos.json`, `README.md`, `PRODUCT.md`
- Create from copy: `scripts/yt.mjs`

- [ ] **Step 1: The concept spine for curation**

`content/concepts.json` with one entry per chapter id and two `videoQueries` each, for example:

```json
{ "concepts": [
  { "id": "the-tick", "videoQueries": ["behavior tree tick explained", "what is a behavior tree game ai"] },
  { "id": "three-answers", "videoQueries": ["behavior tree success failure running", "behavior tree running state explained"] },
  { "id": "sequence", "videoQueries": ["behavior tree sequence node", "behavior tree sequence vs selector"] },
  { "id": "fallback", "videoQueries": ["behavior tree selector fallback node", "behavior tree priority selector"] },
  { "id": "conditions", "videoQueries": ["behavior tree condition node", "behavior tree conditions decorators unreal"] },
  { "id": "reactivity", "videoQueries": ["behavior tree reactive preemption", "behavior tree interrupt running action"] },
  { "id": "memory", "videoQueries": ["behavior tree memory nodes", "why memory nodes is a bad idea behavior tree"] },
  { "id": "decorators", "videoQueries": ["behavior tree decorator node", "behavior tree inverter retry timeout"] },
  { "id": "parallel", "videoQueries": ["behavior tree parallel node", "behavior tree parallel node race"] },
  { "id": "blackboard", "videoQueries": ["behavior tree blackboard", "behaviortree.cpp blackboard ports"] },
  { "id": "tree-or-machine", "videoQueries": ["behavior tree vs state machine", "behavior trees breaking the cycle of misuse"] },
  { "id": "design", "videoQueries": ["nav2 behavior tree explained", "behavior tree drone mission"] }
] }
```

Copy `scripts/yt.mjs` unchanged. If `GOOGLE_API_KEY` is set in `.env`, run `npm run curate`, pick two to three clips per chapter in `content/videos.json` with a written `note` each (prefer, from `RESEARCH.md` section 4: AI and Games on Halo 2 and on behavior trees, Petter Ogren's KTH lectures, Isla's GDC 2005 recording, Epic's official talk), then `npm run videos` and `npm run verify:videos`. If the key is not set, leave `content/videos.json` as `{}` and `src/data/videos.js` empty; the content check reports the chapters without clips as a note, not a failure. Say which happened in the commit message.

- [ ] **Step 2: README and PRODUCT**

`README.md` in the flight course's shape: what it is, why it exists (the gap: no explorable explanation of behavior trees exists, from `RESEARCH.md` section 2.9), highlights (twelve chapters, thirteen plates, twelve playgrounds, a typed checkride, an interpreter of about 150 lines asserted against the textbook), the interpreter section with the mode table from the spec, the tech stack table (no Three.js), getting started, project structure, verification (the five check scripts and what each asserts), design (colour is an answer), roadmap (the spec's section 16 as unchecked items), contributing rules (no playground for semantics the interpreter does not implement; every claim carries a source id), credits, licence. One sentence per line is not required in a README, but no em dashes.

`PRODUCT.md`: copy the flight one and change the stack line (no Three.js, no build change), the "Confirmed scope" paragraph to this course's version one scope, and the evidence list to this course's files. Audiences and principles are unchanged and say so.

- [ ] **Step 3: The whole check and a clean checkout build**

```bash
npm run check
git stash -u && npm ci && npm run build && git stash pop
```
Expected: every check passes and the build succeeds from tracked files only (the content check's tracked asset rule covers imports; this covers the rest).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(course): README, product doc, concept spine and video candidates"
```

---

## Self review against the spec

- Section 4 architecture: every file in the map has a task. `content/unreachable.json` (Task 12) is an addition the spec did not list; it carries the could not reach list to the sources page, which spec section 3 of the research asked for.
- Section 5 interpreter: Tasks 2 and 3 cover statuses, node kinds, the three modes, four decorators, halting, trace, blackboard log, condition purity, error capture.
- Section 6 text form: Task 3, including every error case listed.
- Section 7 world: Task 5, every leaf, every hazard, heading and turn rate, the `Goal` name, `draw`, `view`.
- Section 8 playground: Task 11, both panes, step, play, rate, variants, modes, hazards, editor, goal marking the `play` step, inline mounting.
- Section 9 figures: Task 6 primitives and CSS, Task 10 plates and the visual grammar file in Task 7.
- Section 10 spine and sources rule: Task 7, including the forum post restriction and the dialect table check.
- Section 11 chapters: Tasks 8 and 9, twelve chapters with the myths and sources the spec names; the appendix is the dialects page (Task 12), and Anguelov's paragraph lives in chapter 11 rather than a separate appendix text, which is a small deviation noted here.
- Section 12 checkride: Task 13, five items, reference and misconception trees, the check.
- Section 13 checks: Tasks 2, 5, 6, 7, 13. The Pac-Man walk through named in the spec is not in Task 2; the pick and place walk through is. Add Pac-Man as a follow up if a second book example is wanted; it is not load bearing for any chapter.
- Section 14 error handling: parser errors with line numbers (Task 3, 11), unknown leaf at parse time (Task 3), bounded ticks (Task 2), leaf throw captured (Task 2), pause on route change (Task 11 teardown).
- Section 16 future work: named in the README roadmap (Task 14).

Deviations to carry into the tracker: no Pac-Man walk through; Anguelov's critique inside chapter 11; `content/unreachable.json` added.

## Execution

Plan complete. Two execution options:

1. Subagent driven (recommended): a fresh subagent per task, review between tasks.
2. Inline: execute the tasks in this session with checkpoints.
