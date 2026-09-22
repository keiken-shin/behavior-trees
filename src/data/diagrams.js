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
