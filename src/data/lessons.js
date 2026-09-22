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
];
