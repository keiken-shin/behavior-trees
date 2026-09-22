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
