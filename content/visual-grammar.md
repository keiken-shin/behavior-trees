# Visual Grammar - Behavior Trees

The contract every figure obeys.
Written before figure one so consistency is structural.

## 1. Colour means an answer

| Meaning | Token | Use |
|---|---|---|
| Success | `--s-ok` | fill and stroke of a node that answered Success this tick |
| Failure | `--s-fail` | fill and stroke of a node that answered Failure this tick |
| Running | `--s-run` | fill and stroke of a node that answered Running this tick |
| The tick | `--s-tick` | an edge drawn in the tick colour, in walk order (live graph only) |
| Idle | paper | a node not visited this tick |

Nothing else on a plate is coloured.
The map's battery bar is the one exception, and it borrows Success and Failure because an empty battery is a Failure waiting to happen.

## 2. Shape means a kind

From the textbook's own notation (Colledanchise and Ogren, table 1.1): Sequence is a box labelled with an arrow, Fallback a box with a question mark, Parallel a box with a double arrow, Decorator a rhombus, Action a rounded box, Condition an ellipse.
A real world node the course draws but does not run (Nav2's own control nodes) is a double ruled box.
A greyscale print must still read, which it does, because kind never depends on colour.

## 3. One tree, one drawing

Every tree on a plate is written in the text form and laid out by `src/bt/layout.js`, the same code the scenes use.
A plate can therefore never show a shape a scene would draw differently.
Each node is as wide as its own label needs, between a floor and a ceiling, so a short label never pays for the longest one.

## 4. Progressive states

Two to four states per plate.
Each state keeps everything before it and adds one thing.
The caption names what was added.

## 5. Line weights

Three, as in the flight course: hairline, rule, line.
Edges are rule weight.
Node outlines are line weight.

## 6. Scenes

A scene is the interpreter running: `src/bt/tree.js` ticking the drone world, not a drawing of it.
Node colour is the answer this tick, and a node not asked this tick is paper.
An edge in the tick colour is the walk: every edge the tick crossed stays drawn until the next tick, so a run shows its path live.
With time to watch (a Step, or a run at two ticks a second or slower) each walked edge also draws itself in, in the order the tick walked it.
A flash on a node is the halt: a heavy ink outline that fades, on a node that was Running and was not asked, or that the trace marks halted inside the tick.
The flash is ink, not a status colour, because a halt is not an answer.
A hatched ellipse is a condition that changed the world while answering.
The node card reads only from the trace and the built tree.
The scrubber replays stored ticks and never re-simulates.
Captions may name a tick only through `{t}`, which the run fills in; `scripts/check-scenes.mjs` notes a caption that names any other number, in digits or in words, so each one is checked by hand.
The graph never starts smaller than reading size: when the whole tree would put a label under about 9 px, the view opens on the root at that size and the reader pans.
A side where the tree goes on past the pane fades out instead of cutting a label.
When a tick changes a node that is out of view, or halts one, the view pans to it without zooming.
A story moment can also name the nodes its caption is about, and when it lands the view pans to those instead.
The fit button shows the whole tree, at whatever size that takes.
With reduced motion on, nothing draws in and nothing flashes; the colours still answer and the walk is still drawn.
