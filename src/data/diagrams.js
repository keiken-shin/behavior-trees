/* Every authored figure in the project. Each builder returns a complete SVG.
   Colour is never named here, only an answer, so the colour rule holds by
   construction. Trees are written in the text form and laid out by layout.js,
   so a plate and the playground can never disagree about a tree's shape. */
import { figure, tree, chip, note, line } from "./svg.js";
import { parse } from "../bt/parse.js";
import { DRONE } from "../world/drone.js";
import { nav2ToSpec } from "../bt/nav2.js";
import { layout } from "../bt/layout.js";

const NAV2 = globalThis.__NAV2 ?? (await import("../../content/nav2.xml?raw")).default;

const D = {};
/* The drone's real leaves are enough for the three plates left: none of them
   need a leaf invented just for a figure. */
const FIG_LEAVES = DRONE.leaves;
const T = (text) => parse(text, FIG_LEAVES);

D["design/backchain"] = () => {
  /* n0 ? delivered | n1 AtWaypoint Goal | n2 -> | n3 ? there | n4 AtWaypoint Goal | n5 FlyTo Goal | n6 Drop */
  const s1 = T("? parcel at goal\n  Delivered");
  const s2 = T("? parcel at goal\n  Delivered\n  -> \n    AtWaypoint Goal\n    Drop");
  const goal = T("? parcel at goal\n  Delivered\n  -> \n    ? at the goal\n      AtWaypoint Goal\n      FlyTo Goal\n    Drop");
  /* 136: "AtWaypoint Goal" in an ellipse, and "? parcel at goal" in a rect. Four
     leaf slots at that width still leave a wide margin inside 800. */
  const at = { x: 96, y: 60, nodeW: 136 };
  /* Every state redraws a differently shaped tree from the same origin, and a
     cumulative state never hides an earlier one (only .s2/.s3/.s4 fade IN), so
     without help state 4 would show all three trees stacked - "? parcel at
     goal" three times over, "AtWaypoint Goal" sitting on "? at the goal". A
     bare paper rect (no chip-g wrapper: the check's own mask idiom, see
     blackboard/ports) covers exactly the box the previous tree's nodes occupy
     before the next, larger tree is drawn over it. State 4 adds no tree of its
     own, so it needs no mask - it keeps state 3's and only adds the note. */
  const maskS1 = `<rect class="chip" x="96" y="60" width="152" height="130"/>`;
  const maskS2 = `<rect class="chip" x="96" y="60" width="456" height="210"/>`;
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
      tree(s1, at),
      maskS1 + tree(s2, at),
      maskS2 + tree(goal, at),
      /* Below the goal tree's deepest row (bottom edge at y 342), not in the
         46px gap above it - that gap sits inside the row's own label band and
         the note printed straight through "AtWaypoint Goal" and "FlyTo Goal". */
      note(400, 390, "implicit sequence: condition left, action right"),
    ],
  });
};

D["nav2/tree"] = () => {
  const spec = nav2ToSpec(NAV2);
  /* Not squeezed into 800 any more. The squeeze was what made this plate
     unreadable: 74px boxes holding labels up to 204px. Here every node is wide
     enough for its own name, on two lines where one will not do, and the frame
     is as wide as the tree really is. An SVG scales to whatever column it is
     given, so the old fit scale only ever bought a smaller drawing of the same
     collision. */
  const small = { nodeW: 120, nodeH: 22, hGap: 4, vGap: 34, labelClass: "node-t--xs", twoLine: true };
  const L = layout(spec, small);
  /* 20 of margin each side, and enough below the deepest row for the note to
     clear both the last row of boxes and the caption band. */
  const W = Math.round(L.w) + 40, H = Math.round(L.h) + 110;
  return figure({
    title: "The default Nav2 navigation tree, drawn from its own XML file",
    desc: "The ROS 2 Nav2 navigate to pose tree with replanning and recovery, every node drawn from the project's XML. Its custom control nodes are double ruled boxes because this course does not run them.",
    captions: [
      "A production tree, node for node, from content/nav2.xml. The labels are small on purpose: this plate is about the shape. The file is on the sources page.",
      "Double ruled boxes are Nav2's own control nodes: RecoveryNode, PipelineSequence, RoundRobin. Their rules are in the Nav2 documentation, not in this course's interpreter.",
    ],
    states: [
      tree(spec, { x: 20, y: 20, ...small }),
      note(W / 2, H - 80, "drawn, not executed"),
    ],
    vb: `0 0 ${W} ${H}`,
    /* 2904px wide scaled into a 693px column puts a 9px label on screen at
       about 2px. This plate is the one that actually needs its real size, so
       it is the only one that scrolls sideways instead of shrinking. */
    wide: true,
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
      { kind: "Sequence", name: "the tick", id: "a", children: lessons.slice(0, 2).map((l) => ({ kind: "Action", leaf: l.short ?? l.title.split(",")[0], id: l.id, children: [] })) },
      { kind: "Sequence", name: "control", id: "b", children: lessons.slice(2, 6).map((l) => ({ kind: "Action", leaf: l.short ?? l.title.split(",")[0], id: l.id, children: [] })) },
      { kind: "Sequence", name: "power", id: "c", children: lessons.slice(6, 10).map((l) => ({ kind: "Action", leaf: l.short ?? l.title.split(",")[0], id: l.id, children: [] })) },
      { kind: "Sequence", name: "the world", id: "d", children: lessons.slice(10, 12).map((l) => ({ kind: "Action", leaf: l.short ?? l.title.split(",")[0], id: l.id, children: [] })) },
    ],
  };
  const hrefs = Object.fromEntries(lessons.map((l) => [l.id, `#${l.id}`]));
  const L = layout(spec, { nodeW: 118, nodeH: 40, hGap: 10, vGap: 60 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.w} ${L.h}" class="figure figure--index" role="img" aria-label="The course drawn as a tree; every leaf is a chapter">` +
    tree(spec, { hrefs, nodeW: 118, nodeH: 40, hGap: 10, vGap: 60 }) + `</svg>`;
}

export default D;
