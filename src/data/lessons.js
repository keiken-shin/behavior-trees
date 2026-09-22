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
