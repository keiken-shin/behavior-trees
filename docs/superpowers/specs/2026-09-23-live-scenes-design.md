# Live scenes: one column, the tree runs where the text names it

Date: 2026-09-23.
Status: approved in conversation, written for review.
Supersedes: sections 8 and 9 of `2026-09-22-behavior-trees-course-design.md` where they conflict.
Everything not named here stays as the first spec says.

## 1. Why

The flight course explains with drawn plates on the right and a reading column on the left.
That worked for flight, where a plate can hold a force diagram.
A behavior tree is not a diagram, it is a run.
The lesson is the moment the tick changes its mind, and a drawing can only claim that moment; a run shows it.
The final review of version one found a plate that painted statuses its tree could never produce.
That class of error cannot happen when the thing on screen is the interpreter itself.

So the course changes shape.
One column.
Where a paragraph names a moment, a live scene follows it and shows that moment happening, on the real interpreter and the real drone world.

## 2. Layout

- One reading column, no bench, no right panel.
  The `.lesson` grid, the `bench`, `bench-wrap`, `fig-host` sticky logic and `mountFigure` in `src/ui/lesson.js` go.
- Text keeps its reading width and sits centred on the page, so the empty space of a wide monitor splits evenly to both sides.
  A scene breaks out to the page's full width (the split screen of graph and map uses everything between the margins) and is capped at 480 px tall, so it never fills the screen.
  Amended 2026-09-24 from a flush-left column with scenes capped at 880 px: the reader found the right side of a wide screen empty.
  On a narrow screen the two halves stack: graph above, world below, each capped at 300 px.
- A `fig` block that survives (section 6) renders inline at the same width as a scene, with its step strip under it, where the flow places it.
- Home, cards, dialects, sources and checkride pages change only to the one column width.

## 3. The scene block

A chapter's `flow` gains the block `{ t: "scene", id }`.
The author places it right after the paragraph that sets it up, and a chapter may carry more than one.
The `play` block type goes away: a scene's unlocked stage is the old playground.
The `fig` block stays only for the three drawings in section 6.

`src/data/scenes.js` exports `SCENES`, a map from id to:

```js
{
  world: "drone", scenario: "delivery",
  tree: "...",                     // text form, the same as a play
  extraLeaves: {},                 // optional, as plays had
  start: (state) => {},            // optional, runs once after init, as plays had
  steps: [
    { say: "...", to: 1 },                                        // run to tick 1
    { say: "... {t} ...", hazard: "battery12", to: (s, h) => s.battery < 30 },
    { say: "...", to: (s, h) => h.at(-1).status === "Success", cap: 900 },
  ],
  then: { hazards: [...], variants: [...], editor: false, counter: false, goal: { test, done }, brief: "..." },
}
```

- `to` is a tick number or a predicate on `(state, history)`.
  A step runs from where the last one stopped until `to` is met.
  `cap` (default 600) bounds a predicate step; hitting the cap is a failure, in the check and on screen ("this did not happen").
- `hazard` names a world hazard applied on the first tick of the step, through `advance()`, never by a direct call.
- `say` is the caption shown when the step stops.
  `{t}` in a caption is replaced by the tick the step stopped at, so a caption never hard codes a number the run may not produce.
- `then` is the play configuration the playground already understands (`hazards, variants, editor, counter, goal, brief`), used after the last step.
  It is optional; a scene with no `then` only tells its story.

## 4. The scene component

`src/play/scene.js` exports `mountScene(host, scene, { onGoal }) -> stop()`.

Layout inside the host:

- Left: the graph (section 5).
- Right: the world map from `world.draw(state)` and the readout from `world.view(state)`, as the playground draws them today.
- Under both: the step strip (numbered buttons, one per step, plus "next"), the caption line, and a tick counter.
- After the last step: the playground controls appear in the same host (Step, Play, rate, Reset, hazards, variants, editor, goal, counter) and behave as today.
  "Reset" starts the current tree again at tick 0, with the variant, mode or edit the reader chose, and stays unlocked.
  The step 1 button is the way to tell the story again, on the scene's own tree.
  (Amended in the fix wave: "Reset returns to step 1" threw away the choice a brief had just asked for.)

Running a step animates the ticks at 20 per second so the reader sees the walk, with a "skip" that jumps to the step's stop.
The sim is the same `start()` / `advance()` from `src/bt/run.js` the playground uses; nothing in the scene simulates on its own.
`stop()` clears every timer and listener; the chapter page calls it on route change, as it does for the playground today.

`mountPlayground` stays and is what `mountScene` shows after the last step; the checkride keeps calling `mountPlayground` directly with no steps.

## 5. The graph

`src/play/tree-view.js` grows into `src/play/graph-view.js`, exporting `graphView(host) -> { render(spec), paint(entry), replay(history, i), fit(), destroy() }`.

- Nodes and edges come from `layout()` and `node()`/`edge()` as today, so ids stay pre-order and match the trace.
- Pan by drag, zoom by wheel and by two buttons, and a fit button.
  Implemented on the svg `viewBox`, no library.
- `paint(entry)` takes one history entry `{ trace, status, t }`.
  Every node takes the class for its status in the trace, or idle when absent.
  A dirty condition is hatched.
  A node that was Running in the previous entry and is absent now flashes once (the halt).
  Edges pulse in walk order: the visited nodes sorted by the number in their id are the order the tick walked, because ids are pre-order and the tick is a depth first walk.
- Click a node: a small card with its kind, name and arguments, its answer this tick, and for a composite its mode and memory mark.
  The card reads from the trace entry and the built tree, nothing else.
- `replay(history, i)` paints entry `i` from the stored history, for the scrubber.
  The scrubber is a range input under the graph; dragging it never re-simulates.
- Under `prefers-reduced-motion`, pulses and flashes are off and only the colours change.

## 6. What the thirteen plates become

| plate | becomes | steps, in short |
|---|---|---|
| tick/root-to-leaf | scene in chapter 1 | tick 1 walks root to the first leaf; tick 2 asks again; the leaf answers Success and the walk moves on |
| answers/three | scene in chapter 2 | Success at once; Failure at once; Running, and the same node asked again next tick |
| sequence/todo | scene in chapter 3 | first child Success, second Running, the Sequence Running; a child fails, the Sequence fails at that child |
| fallback/plan-b | scene in chapter 4 | first child fails, the Fallback moves right; a child succeeds, the Fallback stops there |
| condition/pure | scene in chapter 5 | a condition answers without touching the world; the dirty one is hatched |
| reactive/preempt | scene in chapter 6 | delivery running; battery drops; the root asks again and the safety branch wins; the delivery branch is halted |
| memory/modes | scene in chapter 7 | reactive root re-asks the check; memory root skips it; keep root, the same on this tick; the memory tree dies |
| decorators/kinds | scene in chapter 8 | retry around Charge; timeout around the flight home; gust; the timeout fires |
| parallel/m-of-n | scene in chapter 9 | all three ticked; Land done at once; Charge done; two of three met |
| fsm/transitions | scene in chapter 11 | the chapter 6 tree with the switch counter; battery drops; count the switches |
| blackboard/ports | scene in chapter 10 | two writers race on one key; the log shows who wrote last; the goal moves and the reading tree turns |
| nav2/tree | stays a drawing | drawn from the XML, not run |
| design/stack | stays a drawing | the autopilot, the tree, the mission; not a run |
| design/backchain | stays a drawing | shows building, not running; an editor scene is future work |
| index/tree | stays | the home page |

Every step's caption comes from the plate's captions, reworded where the run shows something the drawing only claimed.
The plays in `src/data/plays.js` move into the `then` field of the scene that replaces them, unchanged in content, and `plays.js` goes.

## 7. Checks

`scripts/check-scenes.mjs`, added to `npm run check`:

- every `scene` block id in `lessons.js` exists in `SCENES`, and every scene is used by a chapter;
- every scene's tree parses with its world's leaves plus `extraLeaves`, and every variant parses;
- every step, run headlessly in order with `run()` semantics, meets `to` before `cap`;
- a caption that names a number other than `{t}` is flagged as a note, so hard coded ticks stand out;
- `then.goal.test` is reachable: the scene's own steps, or a listed hazard applied at the last step's tick and 2500 more ticks, make it true, so no scene asks for a goal that cannot be met.

`scripts/check-content.mjs` changes its spine rule: each chapter carries at least one `scene` or `fig` block, and a `play` block is an error.
`scripts/check-figures.mjs` keeps guarding the three drawings and the index tree.
The interpreter, world and checkride checks do not change.

## 8. Progress

The steps strip in `src/ui/steps.js` replaces the `play` key with `scene`: "Run a scene to the end and meet its goal".
A chapter's scene step is done when any of its scenes reaches its goal, or, for a scene with no `then`, when its last step has been shown.

## 9. Error handling

- A step that hits its cap shows "this did not happen within N ticks" in the caption line and enables next, so a reader is never stuck; the check makes this a build failure, so it should never ship.
- A leaf that throws is captured by the interpreter as Failure with an error, as today; the graph shows the error on the node card.
- The editor's parse errors show the line number, as today.
- Route change stops the scene; a scene never runs offscreen.

## 10. Out of scope

React, react-flow, dragging nodes to build a tree, a pinned or scroll driven scene, any change to the flight course, the home robot world.

## 11. Rules carried over

The series rules bind this change as before: every myth and fact carries a source; nothing on screen is mimed; colour is an answer and shape is a kind; no em or en dash; commit format `<type>(<scope>): <subject>` with no attribution lines; the checks pass before every commit.
