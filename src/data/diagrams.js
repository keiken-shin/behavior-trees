/* Every authored figure in the project. Each builder returns a complete SVG.
   Colour is never named here, only an answer, so the colour rule holds by
   construction. Trees are written in the text form and laid out by layout.js,
   so a plate and the playground can never disagree about a tree's shape. */
import { figure, tree, chip, note, line, dashed } from "./svg.js";
import { parse } from "../bt/parse.js";
import { DRONE } from "../world/drone.js";
import { nav2ToSpec } from "../bt/nav2.js";
import { layout } from "../bt/layout.js";

const NAV2 = globalThis.__NAV2 ?? (await import("../../content/nav2.xml?raw")).default;

const D = {};
/* Leaves are classified so the plate draws an ellipse for a condition. The
   drone's real leaves plus the few invented for a figure. */
const FIG_LEAVES = { ...DRONE.leaves,
  NudgedNorth: { kind: "condition" }, SetMode: { kind: "action" } };
const T = (text) => parse(text, FIG_LEAVES);

D["tick/root-to-leaf"] = () => {
  const spec = T("? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n  -> deliver\n    FlyTo A\n    Drop");
  /* 132 wide because "BatteryBelow 30" is 108px of 12px mono and an ellipse only
     offers 0.82 of its box; four leaves then need hGap 6 to stay inside 800. */
  const at = { x: 119, y: 40, nodeW: 132, hGap: 6 };
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

/* Chapter 6's tree. Pre-order ids:
   n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 Charge
   n5 -> deliver | n6 FlyTo A | n7 Drop | n8 ReturnHome | n9 Land */
const PREEMPT = "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land";
/* The chapter 6 tree has seven leaves on one row, and the widest of them,
   "BatteryBelow 30", sits in an ellipse, which offers 0.82 of its box. At the
   10px label class that needs a 110 box, and seven of those only fit an 800
   frame with the gaps and the padding cut to the bone: 2 + 7 x 110 + 6 x 4 + 2
   = 798. Twelve pixel labels would need 132 a node, which does not fit at all. */
const WIDE = { nodeW: 110, hGap: 4, vGap: 44, pad: 2, labelClass: "node-t--sm" };

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
  /* Six leaves cannot all be 132 wide inside 800, so this plate drops to the
     10px label class and 110, which is what "BatteryAbove 30" needs in an
     ellipse at that size. */
  const at = { x: 47, y: 80, nodeW: 110, hGap: 6, vGap: 44, labelClass: "node-t--sm" };
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
  /* 104, not 96: "NudgedNorth" fills an ellipse of 96 to the last hundredth of
     a pixel, which is a fit only on paper. */
  const at = { x: 280, y: 100, nodeW: 104 };
  return figure({
    title: "A condition is an ellipse because it only asks; a dirty one is hatched",
    desc: "A Sequence with a condition and an action. The condition is drawn as an ellipse and the action as a rounded box; in the last state the condition is hatched to show it changed the world while answering.",
    captions: [
      "An ellipse asks. A rounded box does.",
      "The ellipse answers Success. The rounded box is still flying, so it answers Running.",
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
  const s = T(PREEMPT), at = { x: 1, y: 60, ...WIDE };
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
      tree(s, { ...at, status: { n2: "ok", n3: "run", n1: "run", n0: "run" } }) + note(560, 286, "idle: halted, target cleared"),
    ],
    vb: "0 0 800 360",
  });
};

D["memory/modes"] = () => {
  const s = T(PREEMPT), at = { x: 1, y: 60, ...WIDE };
  const battery = { n2: "ok", n3: "run", n1: "run", n0: "run" };
  const skipped = { n6: "run", n5: "run", n0: "run" };
  return figure({
    title: "The tick after the battery drops, in three modes",
    desc: "The chapter 6 tree, the tick after the battery drops. With the root reactive the battery check passes and ReturnHome runs. With the root in memory or keep mode the check is skipped and the flight keeps running.",
    captions: [
      "Same tree. The mode on the root is what changes below.",
      "Root reactive: the left branch is asked first, every tick. The check catches the drop.",
      "Root memory: the root's finger is on the delivery. The check is not asked. The drone flies on.",
      "Root keep: the same here. It holds its memory across a Failure on a Sequence and a Success on a Fallback.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: battery }) + note(400, 286, "root {reactive}"),
      tree(s, { ...at, status: skipped }) + note(400, 306, "root {memory}: the check on the left is never asked"),
      note(400, 326, "root {keep}: identical on this tick"),
    ],
    /* 400 rather than 360: three stacked notes need the room, and no note may
       come within 24px of the caption band. */
    vb: "0 0 800 400",
  });
};

D["decorators/kinds"] = () => {
  /* n0 ? root | n1 -> low battery | n2 BatteryBelow | n3 ReturnHome | n4 retry 3 | n5 Charge
     n6 -> deliver | n7 FlyTo A | n8 Drop | n9 timeout 200 | n10 ReturnHome | n11 Land
     Retargeted from the brief: the play now wraps timeout 200 around the return
     leg, not the outbound flight, so the timeout's child is ReturnHome (n10). */
  const s = T("? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    retry 3\n      Charge\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    timeout 200\n      ReturnHome\n    Land");
  /* The same seven leaf row as the chapter 6 plate, plus a rhombus: "timeout 200"
     in a rhombus may use 0.6 of the box, which at 10px is another 110. */
  const at = { x: 1, y: 40, ...WIDE, vGap: 40 };
  return figure({
    title: "Decorators sit between a parent and one child and rule on its answer",
    desc: "The chapter 6 tree with a retry rhombus above Charge and a timeout rhombus above ReturnHome. In the last state the timeout answers Failure while its child was Running.",
    captions: [
      "Two rhombuses. Each has exactly one child.",
      "retry 3: Charge fails once, the rhombus answers Running and will try again.",
      "timeout 200: the flight home has been Running for 201 ticks. The rhombus halts it and answers Failure.",
    ],
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n5: "fail", n4: "run" } }),
      tree(s, { ...at, status: { n10: "run", n9: "fail", n6: "fail" } }) + note(400, 400, "the child was Running; the rhombus turned that into Failure"),
    ],
    vb: "0 0 800 480",
  });
};

D["parallel/m-of-n"] = () => {
  /* n0 => 2 both | n1 Hover | n2 Charge | n3 Land */
  const s = T("=> 2 both\n  Hover\n  Charge\n  Land");
  const at = { x: 220, y: 100 };
  return figure({
    title: "A Parallel ticks every child and answers by count",
    desc: "A Parallel with threshold 2 over three actions. Every child is ticked every tick. Land is Success at once and Hover is Running for ever, so the Parallel waits on Charge and answers Success the tick Charge finishes.",
    captions: [
      "Three children, threshold two.",
      "All three are ticked. Land is done at once, Hover never finishes, Charge is still filling. One Success of two.",
      "Charge finishes. Two Successes reach the threshold, so the Parallel answers Success. Hover is halted.",
    ],
    /* Run on a drone sitting at home with a flat battery, these are the only two
       answers this tree ever has: Hover Running for ever, Land Success at once,
       and Charge turning from Running to Success the tick the battery fills. */
    states: [
      tree(s, at),
      tree(s, { ...at, status: { n1: "run", n2: "run", n3: "ok", n0: "run" } }),
      tree(s, { ...at, status: { n1: "run", n2: "ok", n3: "ok", n0: "ok" } }) + note(400, 300, "M = 2 of N = 3"),
    ],
  });
};

D["blackboard/ports"] = () => {
  /* n0 -> deliver | n1 FlyTo Goal | n2 Drop */
  const s = T("-> deliver\n  FlyTo Goal\n  Drop");
  const at = { x: 60, y: 100 };
  /* The static half of the board is drawn once, in state 1: a progressive
     build only adds marks, and a chip redrawn unchanged in a later state
     would sit exactly on top of itself, which the figure check (rightly)
     reads as one chip covering another. Only the goal value changes, so a
     bare unlabelled rect (no chip-g wrapper: the check's own mask idiom)
     covers the old "A" before "B" is drawn in its place. */
  const board =
    `<rect class="stroke k-ref" x="470" y="110" width="270" height="120" fill="none"/>` +
    note(605, 100, "blackboard") +
    chip(540, 150, "goal", "ink") +
    chip(540, 195, "battery", "ink") + chip(660, 195, "74 %", "ink");
  const goalChip = (goal, hi) => chip(660, 150, goal, hi ? "run" : "ink");
  const goalMask = `<rect class="chip" x="635" y="137" width="50" height="26" rx="4"/>`;
  return figure({
    title: "Nodes do not talk to each other; they read and write a shared store",
    desc: "A two node Sequence beside a box labelled blackboard holding a goal key and a battery key. A dashed line from FlyTo Goal to the goal key shows it reads the value; in the last state the value has changed and FlyTo reads the new one.",
    captions: [
      "The tree on the left. The store on the right.",
      "FlyTo Goal reads the goal key every tick. It does not hold a copy.",
      "The goal changes to B. Next tick FlyTo reads B. Nothing in the tree had to change.",
    ],
    states: [
      tree(s, at) + board + goalChip("A"),
      tree(s, at) + dashed(150, 200, 620, 160),
      goalMask + goalChip("B", true),
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
  /* 136: "AtWaypoint Goal" in an ellipse, and "? parcel at goal" in a rect. Four
     leaf slots at that width still leave a wide margin inside 800. */
  const at = { x: 96, y: 60, nodeW: 136 };
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
