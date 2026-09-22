# Behavior Trees - Course Design

Spec. 2026-09-22. Approved in conversation, not yet built.
Research behind every claim: `../../../RESEARCH.md`.
Format copied from: `../../../../flight-dynamics`.

## 1. The decision

A second course in the school series, on behavior trees, as a new folder `behavior-trees/` beside `flight-dynamics/`.
It copies the flight course's shell and rules.
It replaces the flight model with a tick interpreter and the 3D sandbox with a 2D playground.
The reader does not fly anything.
The reader edits an agent's mind and watches a small world respond.

Three decisions taken with the user:

1. Sibling folder, not a Part III of the flight repo. Copy the shell, do not extract a shared package yet.
2. The world is a drone above an autopilot. A home robot with a dock stays open as a second world, not built now.
3. 2D only. The tree is an SVG drawing and the map is top down. The drone is drawn as an arrow with a real heading, not a dot.

## 2. Goals and non goals

Goals:

- A complete beginner understands what a tick is, and why re-reading the tree from the root every tick is the whole idea.
- Every technical claim in a lesson carries a source that was opened, and the build fails if it does not.
- The playground runs the exact interpreter the reader is shown, and never mimes a behaviour it does not compute.
- The format proves it travels: the flight course's shell serves a second subject with content changes only.

Non goals for version one, each named so it cannot vanish:

- Drag and drop tree editing. Text editing only.
- Executing the ROS 2 Nav2 tree. It is drawn from its real XML as a plate, not run.
- 3D. A Three.js drone view can come later.
- The home robot world.
- Driving the air combat bandit in the flight course with a tree.
- Generated hero images. The flight course has them; this one ships without until the plates exist.

## 3. Audiences and product rules

Same four audiences as `flight-dynamics/PRODUCT.md`: the author upskilling, friends sent a link, new joiners, portfolio viewers.
Same product principles: voluntary attention is the only currency, the misconception is the lesson, facts are authored and atmosphere is generated, applying beats answering, the artifact is the proof.
Same accessibility floor: reduced motion honoured, title and desc on every figure, selectable text in SVG, light and dark plates.

## 4. Architecture

```
behavior-trees/
  index.html  vite.config.js  package.json  .claude/launch.json
  content/
    sources.json        every source the lessons cite: id, title, url, grade in words, what was read
    visual-grammar.md   the figure contract for this subject
    videos.json         candidates and picks, same shape as the flight course
    nav2.xml            the real Nav2 tree, copied verbatim from its repo, Apache 2.0, credited in NOTICE
  src/
    main.js             routes: index, chapter, cards, checkride, glossary, credits
    styles/             tokens.css and app.css, copied, kinds renamed
    ui/                 home, lesson, cards, checkride, glossary, credits, player, steps, util, logo: copied
    data/
      lessons.js        the twelve chapters, the appendix, the checkride text
      diagrams.js       the authored plates
      svg.js            primitives, copied, BT kinds and node shapes added
      deck.js           copied, derives revision cards from myths and checks
      videos.js         emitted by scripts/yt.mjs
    bt/
      tree.js           the interpreter, about 150 lines, shown to the reader in chapter 1
      parse.js          the indented text form to a tree, about 40 lines
    world/
      drone.js          the drone world: init, step, leaves, draw, hazards
    play/
      playground.js     two panes, controls, wiring between world and tree
      tree-view.js      lays out and draws a tree as SVG, colours nodes by their last answer
  scripts/
    check-bt.mjs        interpreter against the textbook algorithms and the library table
    check-checkride.mjs every exam item passes with the right tree and fails with the wrong one
    check-figures.mjs   copied
    check-content.mjs   copied, plus the sources rule
    yt.mjs              copied
  docs/superpowers/specs/
  RESEARCH.md  README.md  PRODUCT.md  NOTICE  LICENSE
```

Runtime dependencies: the three font packages only. Dev dependency: Vite.
No Three.js.

Data flow, one tick:

1. The playground asks the world for its blackboard view (position, battery, goal, hazards).
2. The playground ticks the tree root with that view. The interpreter returns a status and a trace.
3. Leaves that are actions have already asked the world to do things during the tick (set a target, land, charge).
4. The playground steps the world by one tick's worth of time.
5. The tree view repaints from the trace. The map repaints from the world.

The playground never imports `drone.js` by name.
It receives a world object at mount time.
A second world is a second file with the same five fields.

## 5. The interpreter

File: `src/bt/tree.js`.
Textbook semantics from Colledanchise and Ogren, chapter 1, with two extra modes from BehaviorTree.CPP.
Everything below is asserted by `scripts/check-bt.mjs`.

Statuses: `Success`, `Failure`, `Running`.
A node that has never been ticked, or has been halted, holds `Idle`, which is never returned to a parent.

Node kinds:

| Kind | Children | Symbol in figures | Rule |
|---|---|---|---|
| Sequence | 1 or more | box with an arrow | tick children left to right; first Running or Failure is returned; all Success returns Success |
| Fallback | 1 or more | box with a question mark | tick children left to right; first Running or Success is returned; all Failure returns Failure |
| Parallel M | 1 or more | box with a double arrow | tick every child every tick; Success when at least M succeed; Failure when more than N minus M fail; else Running |
| Decorator | exactly 1 | rhombus | see the table below |
| Action | none | rounded box | a world leaf; may return Running |
| Condition | none | ellipse | a world leaf; returns Success or Failure only, never Running |

Modes on Sequence and Fallback, as a `mode` field:

| Mode | Where it comes from | Child returns Running | Child returns Failure (Sequence) or Success (Fallback) |
|---|---|---|---|
| `reactive` (default) | the textbook's Sequence and Fallback; BehaviorTree.CPP ReactiveSequence and ReactiveFallback | next tick starts again from the first child | return it, next tick starts again from the first child |
| `memory` | the textbook's Sequence* and Fallback*; BehaviorTree.CPP plain Sequence and Fallback | next tick starts from the running child, earlier children are not re-ticked | return it and clear the memory, next tick starts from the first child |
| `keep` | BehaviorTree.CPP SequenceWithMemory (no Fallback counterpart exists there) | as `memory` | return it but keep the memory, next tick re-ticks the child that answered, skipping the ones that already succeeded |

Verified 2026-09-22 against the library's Sequence and Fallback pages: plain Sequence restarts on FAILURE and ticks the same child again on RUNNING; ReactiveSequence restarts on both; SequenceWithMemory ticks again on both, and its patrol example says a failed GoTo(B) does not cause GoTo(A) to be ticked again.
The textbook, section 1.3.2, clears a memory node "when the parent node returns either Success or Failure", which is the plain library node, so the two lineages agree on `memory` and the library adds `keep`.

Decorators:

| Name | Rule |
|---|---|
| Inverter | swaps Success and Failure, passes Running through |
| Retry N | on child Failure, returns Running and counts; after N failures returns Failure; count resets on Success or halt |
| Timeout T | ticks the child; if the child has been Running for more than T ticks, halts it and returns Failure |
| Repeat N | on child Success, returns Running and counts; after N successes returns Success; Failure passes through |

Every decorator ticks its child at most once per tick, so one root tick always ends.

Halting:
after each root tick, every node whose previous status was Running and that was not visited in this tick is halted.
Halting sets the node to Idle, clears its memory and counters, and calls the leaf's `halt` so the world cancels the action.
This is the textbook's preemption and BehaviorTree.CPP's `halt()`.

Trace:
`tick(root, bb)` returns `{ status, trace }` where `trace` is the ordered list of `{ id, status }` for every node visited.
The tree view paints from the trace and nothing else.

Blackboard:
a plain object the world provides, plus `set(key, value, byNodeId)` which appends `{ tick, node, key, from, to }` to a per tick write log.
The Parallel chapter and the blackboard chapter show that log.

Condition purity:
the world exposes a mutation counter.
The interpreter records the counter before and after each Condition leaf.
A Condition that changed the world is reported on the trace as `dirty`, and the tree view marks it.
The side effect chapter uses one deliberately dirty leaf.

## 6. The text form

File: `src/bt/parse.js`.
Used by the checkride editor and by the lesson data, so every tree in the course is written in one form.

```
? root
  -> low battery {memory}
    BatteryBelow 30
    ReturnHome
  -> deliver
    FlyTo A
    Land
```

Rules:

- Two spaces per level of indentation.
- `->` is a Sequence, `?` is a Fallback, `=> M` is a Parallel with threshold M.
- A word after the symbol is the node's display name.
- `{reactive}`, `{memory}` or `{keep}` at the end of a composite line sets its mode.
- `!` is an Inverter. `retry N`, `timeout T`, `repeat N` are the other decorators. A decorator line has exactly one child.
- Any other first word is a leaf name resolved against the world's leaf library. Following words are its arguments.
- The parser reports an error with a line number for: unknown leaf, wrong indentation, a decorator with no child or two children, a composite with no child.
- Blank lines and lines starting with `#` are ignored.

## 7. The world

File: `src/world/drone.js`.
Exports one object with five fields.

`init(scenario)` returns state:

```
{ x, y, heading, speed, target, battery, home: {x, y}, waypoints: {A: {x,y}, ...},
  goal, noFly: [rects], wind: {x, y}, landed, charging, track: [[x,y], ...], mutations, t }
```

`step(state, dt)`:

- If `target` is set and not landed: turn toward the bearing to `target` at no more than the turn rate, then move at cruise speed along `heading`, plus the wind vector. Append to `track`.
- Battery drains at a fixed rate per second while airborne. Charging at home refills it.
- Reaching a target means within the arrival radius.
- Entering a no fly rect is allowed. Detecting it is the tree's job.

Constants live at the top of the file with a comment naming the source of each, or saying it is chosen for the lesson.
The drone is kinematic.
It is not the Cessna, and the file header says so, because the lesson is the mind and not the airframe.

`leaves`: a map from name to `{ kind: "condition" | "action", args, tick(state, bb, args), halt(state) }`.

Conditions: `BatteryBelow p`, `BatteryAbove p`, `AtWaypoint name`, `AtHome`, `InNoFly`, `GoalIs name`, `WindAbove v`, `Landed`.
Actions: `FlyTo name`, `ReturnHome`, `Land`, `TakeOff`, `Charge`, `Hover`, `ExitNoFly`, `Drop`.
`FlyTo` sets the target and returns Running until arrival, then Success.
The waypoint name `Goal` resolves to whatever the world's `goal` field names at that tick, so a tree can read the goal instead of typing it.
`Charge` returns Running until the battery is full, Failure if not at home.
`halt` on any movement action clears the target.

`draw(state, svgHost)`: top down map, home pad, waypoints, no fly rects, wind arrow in the corner, the track, and the drone as an arrow glyph rotated to `heading`.
The glyph is authored in `svg.js` as `craft()`.

`hazards`: a list of `{ label, apply(state) }` the playground shows as buttons: drop battery to 20, gust (set wind), add a no fly rect on the current path, move the goal.

## 8. The playground

Files: `src/play/playground.js`, `src/play/tree-view.js`.
Mounted inline in the reading column at a `{ t: "play", id }` block.
Not a dialog.
There is no engine to download, so it can sit where the prose refers to it.

Two panes side by side on wide screens, stacked on narrow ones.

Left pane, the tree:

- Auto layout. Children share their parent's width equally; a parent sits centred over its children. Trees in this course are small, so the simple layout is enough.
- Node shape by kind, from section 5. Fill by last answer: Success, Failure, Running, Idle. A `dirty` condition gets a hatched fill.
- A tick counter and the root's answer.
- Controls: step one tick, play, pause, speed from one tick per second to sixty.
- One tick is one tenth of a second of world time. Play at ten ticks per second is real time. The chapter says so.

Right pane, the map, from the world's `draw`.
Below it, the hazard buttons and the blackboard as a small key value table.

Per chapter switches, declared in the lesson data:

- `variants`: named pre built trees the reader can flip between.
- `modes`: whether the mode toggle on composites is shown.
- `hazards`: which hazard buttons are shown.
- `editor`: whether the text editor is shown. Off in chapters, on in the checkride.

Goal:
a chapter's play block may carry `goal: { test(state, history), done }` like the flight tasks.
Meeting it marks the chapter's "make it happen" step.

## 9. Figures and the colour rule

`content/visual-grammar.md` is rewritten for this subject.
The one rule: colour means an answer, never a kind.

| Meaning | Token | Use |
|---|---|---|
| Success | `--s-ok` | fill of a node that answered Success |
| Failure | `--s-fail` | fill of a node that answered Failure |
| Running | `--s-run` | fill of a node that answered Running |
| The tick | `--s-tick` | the pulse travelling down an edge in a figure |
| Idle | paper | a node not visited this tick |

Node kind is shape only, from the textbook's notation, so a greyscale print still reads.
Interface controls spend no colour, as before.
Plates are authored in `diagrams.js` with `svg.js`, stepped in two to four states, with a title, a desc and a caption per state, and measured by the copied figure check.

New primitives in `svg.js`: `node(kind, x, y, label, status)`, `edge(x1, y1, x2, y2, { pulse })`, `craft(x, y, heading)`, and `tree(spec, x, y)` which lays out a small tree the same way `tree-view.js` does, so a figure and the playground never draw one tree two ways.

## 10. Content spine and the sources rule

Every chapter's `flow` carries, in order: `concrete`, `fig`, `play`, `myth`, `check`, `videos`, `aside`.
`check-content.mjs` fails a chapter missing `concrete`, `fig`, `myth` or `check`, as it does in the flight course, and now also `play`.

Two blocks gain a `src` field: `myth` and a new `fact` block for any sentence that states a number, a quote or a design rule.
`src` is an id in `content/sources.json`.
Each source entry: `{ id, title, url, grade, read }` where `grade` is a sentence in words ("the textbook itself", "peer reviewed", "the library's own docs", "a forum post") and `read` says what was opened.
The check fails on a `myth` or `fact` with no `src`, on a `src` that is not in the file, and on a source with an empty `grade` or `read`.
A forum post may be cited only from a `myth`'s "who believes this" line, never from a `fact`.

The glossary (`taxonomy.json` in the flight course) becomes the dialect table: one row per concept with its name in the textbook, BehaviorTree.CPP, Unreal, Unity Behavior and LimboAI, each cell sourced.

## 11. The chapters

Each line: title. Myth. Playground. Source of the truth.

1. The tick. Myth: a tree runs once, top to bottom, like a program. Play: one action `FlyTo A` under the root; watch the tick counter climb while it answers Running. Truth: the textbook section 1.3.
2. Three answers. Myth: every action finishes in one tick. Play: `FlyTo A` then `Land` under a Sequence; step it tick by tick. Truth: textbook page 8, remark 1.1.
3. Sequence, the to do list. Myth: a plain Sequence remembers where it was. Play: BatteryAbove 30, TakeOff, FlyTo A, Drop, ReturnHome; inject a battery drop so the first condition fails mid list; watch the whole list restart from it. Truth: textbook algorithm 1, BehaviorTree.CPP Sequence table.
4. Fallback, plan B. Myth: Fallback is an if/else. Play: `? : Charge | ReturnHome`; watch plan A retried every tick. Truth: textbook algorithm 2.
5. Conditions. Myth: a condition can do things. Play: a deliberately dirty condition that nudges the drone; the trace marks it. Truth: textbook page 9, BehaviorTree.CPP ConditionNode rule.
6. Reactivity, the whole point. Myth: a running action cannot be interrupted. Play: `? : (-> BatteryBelow 30, ReturnHome) | (-> FlyTo A, Drop)`; drop the battery mid flight; watch the delivery halt and the return take over. Truth: textbook section 2.6.1, preemption in section 1.3.1.
7. Memory. Myth: memory is free. Play: the chapter 6 tree with the mode toggle on the root Fallback; in `memory` the battery check is skipped while the delivery is Running and the drone dies; `keep` shows the library's third variant on a patrol. Then the honest counter case: a waypoint reached and then drifted off by wind, where `reactive` loops back and `memory` is right. Truth: textbook section 1.3.2 and 3.6, Klockner 2013, Ogren's lecture "Why Memory Nodes is a bad idea".
8. Decorators. Myth: a decorator is just an inverter. Play: `retry 3` on `Charge`, `timeout 50` on `FlyTo A` into a headwind. Truth: textbook page 9, BehaviorTree.CPP decorator list.
9. Parallel. Myth: parallel means threads. Play: `=> 2 : Hover | Charge`, then two children writing the same blackboard key; the write log shows the race. Truth: textbook algorithm 3, Colledanchise and Natale on concurrency, the 7 percent usage figure.
10. The blackboard. Myth: it is a bag of globals. Play: the write log as a table; a key nobody reads. Truth: BehaviorTree.CPP ports, py_trees blackboard access rules, Francis pitfall three.
11. Tree or state machine. Myth: behavior trees replaced state machines. Figure: the chapter 6 tree drawn as a state machine with its transitions counted. Play: the chapter 6 tree again, with a counter of how many times control moved between branches, which is the number a state machine would need a transition for. Truth: textbook section 1.2 and 2.6.2, the SMACH and BT counts from Ghzouli, Anguelov at GDC 2017, the PX4 commander.
12. Design, and the real thing. Myth: the autopilot is a behavior tree. Figure: the Nav2 tree drawn from its real XML; Klockner's figure 2 redrawn. Play: the full delivery mission with all hazards. Truth: textbook chapter 3, Nav2 walkthrough, Klockner 2013, Aerostack2 docs, PX4 and ArduPilot docs.

Appendix, not a chapter: the dialect table, and one paragraph on why Unreal's event driven trees lose reactivity, with Anguelov's words.

## 12. The checkride

Five items.
The reader types a tree.
The interpreter runs it against a scripted scenario and judges it.
Each item carries a reference tree that passes and a misconception tree that fails, and `check-checkride.mjs` runs both.

1. Deliver to A, then come home and land. Closed to nobody. Warms up the editor.
2. Battery drops to 20 percent mid flight. The drone must be home before the battery is empty. Closed to anybody who still thinks a tree runs once, or that memory is free.
3. A gust pushes the drone into a no fly zone. It must be out within thirty ticks. Closed to anybody who thinks a running action cannot be interrupted.
4. The goal moves mid flight. The drone must reach the new goal. Closed to anybody who typed the waypoint into the tree instead of reading it from the blackboard.
5. Waypoint A is reached and the wind drifts the drone off it. The drone must go on to B and never return to A. Closed to anybody who now thinks memory is always wrong.

## 13. Checks

`npm run check` runs all four and fails on any.

`check-bt.mjs`:

- Sequence, Fallback and Parallel over every combination of child answers, against the textbook's algorithms 1 to 3.
- The three modes against the table in section 5.
- Memory cleared when the parent returns.
- Halt called on a Running node that is not visited.
- Every decorator against its rule.
- The textbook's pick and place walk through, figures 1.6 and 1.7, as a scripted sequence of blackboard changes with the expected trace per tick.
- The textbook's Pac-Man tree, section 1.4, with scripted ghost states.
- The parser: the sample tree round trips, and each error case reports the right line.

`check-checkride.mjs`: for each item, the reference tree passes and the misconception tree fails.

`check-figures.mjs` and `check-content.mjs`: copied, with the sources rule added.

No test framework. Node scripts with assertions, as in the flight repo.

## 14. Error handling

- Parser errors are shown under the editor with the line number. The last good tree keeps running.
- An unknown leaf is a parse error, not a runtime error.
- A root tick always terminates: the tree is finite and every decorator ticks its child at most once per tick.
- A leaf that throws is caught by the interpreter, reported as Failure on the trace with the message, and shown in the tree view. The world keeps stepping.
- Play is paused when the chapter is left, as the flight sandbox is stopped on route change.

## 15. Open questions

None at the time of writing.
The three decisions in section 1 were taken with the user.

## 16. Future work, named

- The home robot world (`src/world/robot.js`), same five fields, with the Nav2 shaped scenario.
- Executing the Nav2 tree, which needs PipelineSequence, RecoveryNode, RoundRobin and RateController from Nav2's own headers.
- Drag and drop editing over the same parser output.
- A Three.js drone view.
- The air combat bandit in the flight course driven by a tree, as a link between the two courses.
- Generated hero images under the flight course's rule that they carry no facts.
