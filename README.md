# Behavior Trees

**Learn what a behavior tree actually is by editing one and watching a drone respond, ten times a second.**

[![Vite 7](https://img.shields.io/badge/Vite-7-646CFF)](https://vite.dev)
[![No framework](https://img.shields.io/badge/framework-none-555555)](#tech-stack)
[![No Three.js](https://img.shields.io/badge/3D-none-555555)](#tech-stack)
[![Interpreter asserted](https://img.shields.io/badge/interpreter-asserted%20in%20check-2f9e44)](#the-interpreter)
[![MIT](https://img.shields.io/badge/license-MIT-8a8f98)](LICENSE)

## Why this exists

A search for an explorable explanation of behavior trees, before this course was built, found none.
Editors that let you build a tree do not run it against a world.
Visualisers that run a tree do not teach.
The forum threads and the slide decks that do teach do not let you touch anything.
This sits in the gap: twelve chapters, each with a real interpreter ticking a real drone under your hand, and a myth named and killed before the tree proves it wrong.

## Highlights

- **Twelve chapters** - the tick, three answers, Sequence, Fallback, conditions, reactivity, memory, decorators, Parallel, the blackboard, tree or state machine, and design
- **Thirteen live scenes**, defined in `src/data/scenes.js`: one in each chapter, and a second in the Parallel chapter.
  Each is the interpreter ticking the drone on a live graph of the tree.
  Twelve tell their story first, 33 steps in all, each step run until the moment its caption names.
  Then the controls unlock: step, play, rate and the scene's hazards, plus tree variants, a mode switch or the editor where the chapter needs them.
  A scrubber replays the stored ticks.
  The design chapter's scene hands over the whole mission at once, with the editor open.
- **Three authored SVG drawings**, all in the design chapter, where no run can show the point: backward chaining, the real Nav2 tree drawn from its own XML, and where the tree sits above the autopilot.
  They are drawn by `src/data/diagrams.js` on the same layout engine the scenes use, as is the course tree on the index page
- **A typed checkride** - five items, each judged by the same interpreter the lessons run, with a reference tree that passes and a misconception tree that the judge is asserted to fail
- **An interpreter of about 150 lines**, `src/bt/tree.js`, asserted tick for tick against the textbook's algorithms by `scripts/check-bt.mjs`
- **No framework, no backend, no accounts, no 3D.**
  The tree is an SVG drawing and the map is a top-down 2D scene

## The interpreter

`src/bt/tree.js` implements the textbook's semantics (Colledanchise and Ogren, *Behavior Trees in Robotics and AI*, chapter 1) plus two extra composite modes documented on BehaviorTree.CPP's own Sequence and Fallback pages.
Every rule below is asserted by `scripts/check-bt.mjs`, not just written down.

| Mode | Where it comes from | Child returns Running | Child returns Failure (Sequence) or Success (Fallback) |
|---|---|---|---|
| `reactive` (default) | the textbook's Sequence and Fallback; BehaviorTree.CPP ReactiveSequence and ReactiveFallback | next tick starts again from the first child | return it, next tick starts again from the first child |
| `memory` | the textbook's Sequence* and Fallback*; BehaviorTree.CPP plain Sequence and Fallback | next tick starts from the running child, earlier children are not re-ticked | return it and clear the memory, next tick starts from the first child |
| `keep` | BehaviorTree.CPP SequenceWithMemory (no Fallback counterpart exists there) | as `memory` | return it but keep the memory, next tick re-ticks the child that answered, skipping the ones that already succeeded |

The same file also carries Sequence, Fallback, Parallel M, four decorators (Inverter, Retry, Timeout, Repeat), halting on a tick a Running node is not visited by, a per-tick trace that also marks a node halted inside the tick (a Timeout giving up), a blackboard write log, and a mutation counter that catches a Condition doing work it should not.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite 7 | One dependency, sub-second rebuilds |
| UI | Vanilla ES modules | Twelve pages of prose and thirteen scenes did not need a framework |
| Rendering | Inline SVG | The tree and the map are SVG drawings; no 3D layer, no Three.js |
| Figures | Hand-authored SVG on `src/data/svg.js` primitives | Generated imagery never carries facts - see [NOTICE](NOTICE) |
| Type | Archivo / Archivo Narrow / JetBrains Mono | Self-hosted via Fontsource, no font CDN |
| Interpreter | Written from scratch | The learner is shown this exact file in chapter 1 |

## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL (pinned to port `63601`).
No key is needed to read the course or run the scenes.

| Script | Does |
|---|---|
| `npm run dev` | Dev server on port 63601 |
| `npm run check` | Runs all six check scripts; see Verification below |
| `npm run build` | Production build |
| `npm run curate` | Refreshes video candidates from queries in `content/concepts.json` (needs a `GOOGLE_API_KEY` in `.env`) |
| `npm run videos` | Emits `src/data/videos.js` from the picked set in `content/videos.json` |
| `npm run verify:videos` | Re-checks every saved clip for link rot and embedding permission |

Only `curate` needs a credential.
Copy `.env.example` to `.env` if you want it.

## Project structure

```
src/
  bt/       tree.js (the interpreter) · parse.js (the text form) · layout.js · run.js
  world/    drone.js: kinematics, leaves, hazards, draw
  play/     playground.js (a scene: the story, then the controls) · graph-view.js (the live tree, painted from the trace)
  data/     lessons, scenes, diagrams (the three drawings and the index tree), exam (the checkride), videos, svg primitives, the deck
  ui/       home · lesson · cards · checkride · dialects · credits · player · steps · logo
  styles/   tokens.css (semantic colour) · app.css
content/    curriculum spine, sources, visual grammar, dialect table, video candidates, the real Nav2 tree, the could-not-reach list
scripts/    the six check scripts and the video curation script
```

## Verification

`npm run check` runs six scripts and fails on any of them.

- **`check-bt.mjs`** ticks the interpreter through the textbook's three algorithms, all three composite modes, all four decorators, halting, the trace, the blackboard log, and condition purity.
- **`check-world.mjs`** runs the drone world headless: kinematics, every leaf, every hazard, and the two facts the checkride depends on - a reactive tree returns home on a battery drop, a memory tree does not.
- **`check-figures.mjs`** re-lays out the three drawings and the index tree at every one of their states and fails if a mark lands on another mark or off the page, or a label does not fit its node.
- **`check-content.mjs`** audits what the course *says*: every chapter carries its spine (a concrete opening, a scene or a drawing, a myth and a check) and no old playground block, every myth and fact cites a real source and none rests on a forum post, every source carries a title and URL and a grade in words, the dialect table is fully sourced, cross-references resolve, every drawing and every scene block a chapter names actually exists, and every asset a chapter imports is tracked so a clean checkout builds.
- **`check-checkride.mjs`** judges all five checkride items with their reference tree and their misconception tree, fails if a reference does not pass or a misconception does, fails if two items give the same reason, and probes two items to catch a judge that claims more than the run actually proves.
- **`check-scenes.mjs`** runs every scene headless: every scene block names a scene that exists and every scene is placed in a chapter, every tree and variant parses, every hazard id is real, every step reaches its moment within its cap with `{t}` filled in, and every unlocked goal can be met.
  It notes a caption that hard codes a tick number instead of `{t}`.

## Design

The organising rule, from `content/visual-grammar.md`: **colour is an answer**.
A node is coloured only by what it returned this tick - Success, Failure, or Running - and idle is paper.
Shape carries kind instead of colour, straight from the textbook's own notation: Sequence a box with an arrow, Fallback a box with a question mark, Parallel a box with a double arrow, Decorator a rhombus, Action a rounded box, Condition an ellipse.
A greyscale print still reads correctly, because kind never depends on colour.
A chapter is one reading column: the text keeps its reading width, and a scene or a drawing sits inline where the text names its moment, a little wider than the text.
On a laptop a scene's story fits in 480 px of height so it never fills the screen; on a phone its graph and its map stack.

## Roadmap

- [ ] The home robot world (`src/world/robot.js`), same five fields, with the Nav2-shaped scenario
- [ ] Executing the Nav2 tree, which needs PipelineSequence, RecoveryNode, RoundRobin and RateController from Nav2's own headers
- [ ] Drag and drop editing over the same parser output
- [ ] A Three.js drone view
- [ ] The air combat bandit in the flight course driven by a tree, as a link between the two courses
- [ ] Generated hero images under the flight course's rule that they carry no facts

## Contributing

Issues and pull requests welcome.
Two house rules, both load-bearing:

1. **No playground for a semantics the interpreter does not implement.**
   If `src/bt/tree.js` cannot tick it, the chapter draws it and cites the source instead of miming it in a scene.
2. **Every claim carries a source.**
   Every myth and every fact in `src/data/lessons.js` names a `src` id in `content/sources.json`, and `check-content.mjs` fails the build on one that does not, or on one that rests on a forum post.

If a chapter's claim turns out to be wrong, that is the most valuable issue you can open.

## Credits

Built on other people's work.
**Colledanchise and Ogren** for the textbook this course teaches from, **BehaviorTree.CPP** and **Davide Faconti** for the library semantics cited throughout, **ROS 2 Nav2** and its contributors for the real tree drawn in chapter 12, **Archivo**, **Archivo Narrow** and **JetBrains Mono** for the faces, and the YouTube channels credited on the in-app Sources page for the curated clips.
Full attribution in [NOTICE](NOTICE) and on the in-app Sources page.

## License

[MIT](LICENSE).
See [NOTICE](NOTICE) for third-party material.
