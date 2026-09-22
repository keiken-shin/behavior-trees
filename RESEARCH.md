# Behavior Trees - Research and Course Ideas

Status: research only. Nothing built. Written 2026-09-22.
Sibling of `../flight-dynamics`, which is the format this course copies.

Every claim below names its source in the same sentence.
Sources are graded in words, not codes: "the book itself", "peer reviewed", "the vendor's own docs", "a forum post".
A forum post is evidence that a confusion exists, never evidence for a fact.
Section 6 lists what could not be opened, so a missing source is never silent.

---

## 1. The answer in one paragraph

A behavior tree (BT) is a tree that is re-read from the root many times a second.
Each read is called a tick.
Every node answers one of three things: Success, Failure, or Running.
That is the whole idea, and it is the idea beginners miss.
The canonical textbook, Colledanchise and Ogren, "Behavior Trees in Robotics and AI" (arXiv 1709.00084, section 1.3), states it directly: the root "generates signals that allow the execution of a node called ticks with a given frequency", and a node "is executed if and only if it receives ticks".
The same book, section 2.6.1, says this is what makes a BT reactive: "the continual generation of ticks and their tree traversal result in a closed loop execution".
Nobody on the web has built an interactive explanation of this.
That is the gap this course fills.

---

## 2. What the sources actually say

### 2.1 The classical definition (the book, read in full)

Source: Colledanchise and Ogren, arXiv 1709.00084v6, chapters 1 to 3, read from the extracted PDF text.

- A BT is "a directed rooted tree where the internal nodes are called control flow nodes and leaf nodes are called execution nodes" (section 1.3, page 6).
- Four control flow node kinds: Sequence, Fallback, Parallel, Decorator. Two leaf kinds: Action, Condition (section 1.3, table 1.1).
- Footnote 2, page 6: "Fallback nodes are sometimes also called selector or priority selector nodes."
- Sequence ticks children left to right "until it finds a child that returns either Failure or Running", and returns Success only if all children succeed. Symbol: a box with an arrow.
- Fallback is the mirror image. It returns Failure only if all children fail. Symbol: a box with a question mark.
- Parallel ticks all children and succeeds when M of N succeed (algorithm 3, page 8).
- A Condition "never returns a status of Running" (page 9).
- An Action returns Running "while the action is ongoing" (page 8).
- Pseudocode for Sequence (algorithm 1, page 7):

```
for i = 1 to N:
  status = Tick(child i)
  if status == Running: return Running
  if status == Failure: return Failure
return Success
```

- Nodes with memory (Sequence*, Fallback*) remember which children already succeeded so they are not re-run (section 1.3.2, page 10). The book calls them "syntactic sugar" and says any memory tree can be rewritten without memory using extra conditions (figure 1.8).
- Remark 1.1, page 10: a BT without Running is "non-reactive" and "of limited use".
- Design caution, section 3.6, page 51: memory nodes are "advised exclusively for those cases where there is no unexpected event that will undo the execution of the subtree".
- BT versus FSM argument, section 1.2, page 5: FSM transitions are "one-way control transfers", compared to Dijkstra's GOTO; BTs use "two-way control transfers". Section 2.6.2 lists the honest disadvantages: the engine is complex, checking all conditions each tick can be expensive, tools are less mature.
- The peer reviewed survey (Iovino et al., arXiv 2005.05842, section 2) gives the n squared transitions argument, and the Annual Review paper (Ogren and Sprague, arXiv 2203.13083, section 2) states BTs and FSMs are equally expressive, citing Biggar, Zamani and Shames 2021.
- Worked examples in the book: pick and place a ball (figure 1.1), Pac-Man (section 1.4, figures 1.10 to 1.12), a door that may be locked (section 3.2, figure 3.3, built as an "implicit sequence").

### 2.2 Where BTs came from (peer reviewed survey, read in full)

- The survey, section 1.1: BTs "were first conceived by programmers of computer games", with milestones by Mateas and Stern (2002) and Damian Isla (Halo 2, GDC 2005). The move into robotics came in 2012 with Ogren's UAV paper and Bagnell et al.
- Isla's own GDC 2005 text, read in full on gamedeveloper.com, calls the Halo 2 system "a hierarchical finite state machine (HFSM) or a behavior tree, or even more specifically, a behavior DAG". His composites are "prioritized list", "sequential", "sequential looping", "probabilistic" and "one off". There is no Selector or Sequence vocabulary yet.
- Isla's Halo 3 slides (WPI course copy, read as slide text) say the Halo 2 encounter tool had "explicit transitions" that gave "n2 complexity", and Halo 3 replaced it with a "tree of prioritized tasks".
- Running status plus recurrent ticks plus the Parallel node were described by Champandard and Dunstan in the Game AI Pro "Behavior Tree Starter Kit" chapter (2013), read in full from gameaipro.com.

### 2.3 Who actually uses BTs, and how (peer reviewed, read in full)

Source: Ghzouli et al., "Behavior Trees in Action" (SLE 2020) and "Behavior Trees and State Machines in Robotics Applications" (IEEE TSE 2023, arXiv 2208.04211).

- In 75 real open source trees, node share was: Sequence 56 percent, Selector 21 percent, Decorator 16 percent, Parallel 7 percent (SLE 2020, table 5).
- The two libraries in real use are BehaviorTree.CPP and py_trees.
- State machines are still far more common by count: SMACH had 2065 models across 560 projects, all BT libraries together 658 models across 169 projects (TSE 2023, table 5).
- BT usage "is increasing rapidly" (TSE 2023 abstract). The paper does not say BTs replace state machines. Both live in the ecosystem.
- Parallel is dangerous: Colledanchise and Natale, "Handling Concurrency in Behavior Trees" (arXiv 2110.11813), say the Parallel node "still entails concurrency issues (e.g., race conditions, starvation, deadlocks)".

### 2.4 The real library semantics (BehaviorTree.CPP docs, the vendor's own docs, read)

The one table every beginner needs, from behaviortree.dev, nodes library, Sequence and Fallback pages:

| Node | child returns Failure | child returns Running |
|---|---|---|
| Sequence | restart from first child | tick the same child again |
| ReactiveSequence | restart | restart (re-check earlier conditions every tick) |
| SequenceWithMemory | tick again, do not re-run succeeded children | tick again |
| Fallback | try next child | tick the same child again |
| ReactiveFallback | try next child | restart |

- Four node types: ControlNode, DecoratorNode, ConditionNode ("Shall not return RUNNING"), ActionNode.
- An async action must "be aborted as fast as possible, if the halt() method is called" (guides, asynchronous nodes).
- The engine is single threaded: "All the tick() methods are executed sequentially."
- The Blackboard is "a key/value storage shared by all the Nodes of a Tree". Ports are typed connections to it.
- Trees are written in XML. The tutorial example is CheckBattery, OpenGripper, ApproachObject, CloseGripper under one Sequence.

py_trees docs (the library's own docs, read): only Selector, Sequence and Parallel exist, each with a `memory` flag. The docs say "You should never need to subclass or create new composites", because more composite kinds make trees "confoundingly difficult to design, introspect and debug".

### 2.5 The dialects (the engines' own docs, read)

The games lineage and the robotics lineage disagree on words and on semantics.

- Unreal Engine's official overview says its BTs are "event-driven to avoid doing unnecessary work every frame". It says conditions should be Decorators, not leaves. It replaces Parallel with "Simple Parallel", "Services" and "Observer Aborts" (None, Self, Lower Priority, Both).
- Unity Behavior calls them "behavior graphs" because "branches can merge back". Its selector is called "Try In Order".
- Godot LimboAI's default Sequence "will remember the last child task that returned RUNNING". Its reactive variant is called DynamicSelector.
- A practitioner critique, Bobby Anguelov's "Behavior Trees: Breaking the Cycle of Misuse" (2020, read in full): event-driven BTs mean "behavioral switches will not occur until the currently selected branch completes or fails". His thesis is "a fundamental logical disconnect in using an acyclic directed graph (BT) to model a cyclic problem".
- At GDC 2017 ("AI Arborist", slides read) Anguelov said BTs are "inherently bad at two things: Transitions/Interruptions, Behavior Prioritization".

Vocabulary map:

| Classical | BehaviorTree.CPP | Unreal | Unity Behavior | LimboAI |
|---|---|---|---|---|
| Fallback | Fallback | Selector | Try In Order | BTSelector |
| Sequence | Sequence / ReactiveSequence / SequenceWithMemory | Sequence | Sequence | BTSequence (memory by default) |
| Parallel | Parallel | Simple Parallel + Services | Run In Parallel + Join | BTParallel |
| Condition (leaf) | ConditionNode | Decorator (not a leaf) | Conditional Guard | BTCondition |
| Action | ActionNode | Task | Action | BTAction |

### 2.6 The flight link (this is the bridge to the previous course)

- Ogren's first robotics BT paper is about UAVs: "Increasing Modularity of UAV Control Systems using Computer Game Behavior Trees", AIAA GNC 2012. Only the abstract was reachable. It argues "many common UAV control constructs are quite naturally formulated as BTs".
- Klockner (DLR), "Behavior Trees for UAV Mission Management", 2013, read pages 1 to 6 from the DLR e-library. Figure 2 places mission management outside the loop of Guidance, Autopilot, UAV. The simplest mission task is "to engage a specific autopilot mode, e.g. flight level change".
- PX4's own docs say "The commander module contains the state machine for mode switching and failsafe behavior". No behavior tree anywhere. ArduPilot's docs describe 25 flight modes, no BT.
- Aerostack2 (UPM, arXiv 2303.18237, read pages 1 to 6, plus its docs) uses BehaviorTree.CPP as an optional mission layer above its own behaviors, which sit above PX4 or ArduPilot. Its docs warn: "Do not mix up aerostack2 behaviors with behavior trees".
- drone_trees (Bristol Flight Lab, repo read) runs py_trees above a MAVLink autopilot. Its example: return home "if the battery drops below 30% or the EKF goes unhealthy".
- NASA's documented executive is PLEXIL, not BTs. A JPL research paper on a Mars helicopter (arXiv 2509.01980) uses an FSM for mission phases with a BT inside each state.

So the verified sentence for the course is: the autopilot is a state machine that holds a number; the behavior tree sits above it and decides which number to ask for.
That is the same shape as chapter 12 of the flight course, where the autopilot "holds one number".

### 2.7 The real production tree (Nav2, the project's own XML, read in full)

ROS 2 Nav2's `navigate_to_pose_w_replanning_and_recovery.xml` is the best known production BT.
Outline:

```
RecoveryNode (6 retries)
  PipelineSequence "NavigateWithReplanning"
    RateController (1 Hz)
      RecoveryNode (1 retry)
        Fallback
          ReactiveSequence "CheckIfNewPathNeeded"
          ComputePathToPose
        Sequence: WouldAPlannerRecoveryHelp, ClearGlobalCostmap
    RecoveryNode (1 retry)
      FollowPath
      Sequence: WouldAControllerRecoveryHelp, ClearLocalCostmap
  Sequence "recovery"
    ReactiveFallback
      GoalUpdated
      RoundRobin: ClearCostmaps, Spin, Wait, BackUp
```

Nav2 had to write its own control nodes (PipelineSequence, RecoveryNode, RoundRobin) because stock Sequence cannot keep FollowPath running while ComputePathToPose is re-ticked.
Their C++ headers were read from the repo.

### 2.8 Beginner confusions (forum posts, evidence of confusion only)

Stack Exchange questions read in the browser, votes in brackets:

- "Decision tree vs behavior tree" (74): a BT is not a decision tree.
- "Preempting Behavior Trees" (27): how does a higher priority branch interrupt a running node.
- "Actions That Take Longer Than One Tick" (19): when to return Running.
- "Canceling running events": how to stop a Running child when the tree re-evaluates.
- "Behavior Tree versus State machine".
- "Behavior Tree Iteration Rate": do you tick the whole tree every frame.
- "Ternary conditional in behaviour trees": trying to write if/else with Sequence and Selector.
- BehaviorTree.CPP pull request 329: SequenceStar restarting from child 0 after halt re-ran completed actions. The "why does my sequence restart" bug, in a mature library.

A vendor page (behaviortrees.com, "Debugging Behavior Trees: The 6 Classic Mistakes") lists: sequence restarts, tree will not switch to higher priority, condition with side effects, decorator on the wrong node, actions that succeed instantly, oscillation at a threshold.
Vendor page, so it is a list of what they see, not evidence.

Ogren's own KTH lecture list includes "Why Memory Nodes is a bad idea" and "4 common bugs in Backward Chained Behavior Trees".

### 2.9 What already exists on the web (each site opened)

| Tool | Runs the tree live? | Has a world? | Teaches? |
|---|---|---|---|
| Mistreevous visualiser | yes, nodes change state | no, hand written JS agent | no prose |
| 0xABAD behavior_tree demo | yes, you toggle outcomes | no | educational, no prose |
| behaviortrees.com editor | no run button found | no | 12 text articles beside it |
| Behavior3 editor | no | no | authoring only |
| Groot2 | monitors your own program | no | debugging |
| py_trees_js | monitors your own program | no | debugging |
| Unreal / Unity editors | in engine | the engine | authoring |

No explorable explanation of BTs exists. The searches "behavior tree explorable", "interactive explanation", "visual introduction" returned nothing.
No tool lets you flip Sequence, ReactiveSequence and SequenceWithMemory on the same scene and watch the difference.
No beginner resource reconciles the games vocabulary with the robotics vocabulary.

---

## 3. What this means for the course

### 3.1 The format travels

The flight course's rules map one to one:

| Flight dynamics | Behavior trees |
|---|---|
| A real 6 axis flight model, shown to the reader | A real tick interpreter, about 150 lines, shown to the reader |
| No sandbox for physics the model cannot compute | No playground for semantics the interpreter does not implement |
| `npm run check` asserts the modes against theory | `npm run check` asserts the interpreter against the book's algorithms 1 to 3 and the BehaviorTree.CPP table |
| Misconception first | Misconception first, and there are more of them here |
| A flown checkride | A built checkride: make a tree that survives injected failures |
| Generated imagery never carries facts | Same |

### 3.2 The different route: the playground is the tree

In the flight course the sandbox is a world you fly.
Here the reader does not fly the agent.
The reader edits the agent's mind and watches the world respond.
Every chapter's playground is the same two pane widget:

- Left: the tree. Nodes light up as the tick runs through them. A tick counter. A speed slider from one tick per click to sixty per second.
- Right: a small world with one agent, a battery, a goal, and injectable trouble.

The reader can pause on a tick and step it. That is the thing no existing tool does with a world beside it.

### 3.3 The world: a drone above an autopilot

Recommended: a drone as a dot on a top down map, with a battery, a home pad, waypoints, a no fly zone, and a wind toggle.
The drone is kinematic. It is not the Cessna. The lesson is the mind, not the airframe, and saying so keeps the honesty rule.
Why a drone:

- The first robotics BT paper is a UAV paper.
- DLR, Aerostack2 and drone_trees give three verified real world shapes of "BT above autopilot".
- PX4 and ArduPilot not using BTs is a verifiable misconception with a primary source.
- It links back to the flight course's chapter 12 without needing its physics.

Alternative: a home robot with a dock, which maps onto Nav2 and the Robohub example. Also verified, less connected to the previous course.

### 3.4 Chapter draft, one node kind per chapter

Each chapter: concrete anchor, then the figure, then the playground, then the myth, then a check.

1. The tick. Myth: a BT runs once from top to bottom like a program. Playground: one Action "fly to A" returning Running, watch the tick counter.
2. Three answers. Success, Failure, Running. Myth: every action finishes in one tick.
3. Sequence, the to do list. Myth: a plain Sequence remembers where it was. Show the restart on Failure.
4. Fallback, plan B. Myth: Fallback is an if/else. Show it re-tries plan A on every tick.
5. Conditions. Leaves that never Run. Myth: a condition can do things. Show the side effect bug.
6. Reactivity, the whole point. Left siblings are re-ticked, so "battery low, return home" preempts the delivery mid flight. Myth: a running action cannot be interrupted.
7. Memory. Flip Sequence, ReactiveSequence, SequenceWithMemory on the same scene. Myth: memory is free. Honest counter case: Klockner's waypoint that stops being "reached" once you leave it.
8. Decorators. Inverter, Retry, Timeout. Myth: a decorator is just an inverter.
9. Parallel. Myth: parallel means threads. Show a race on the blackboard. Only 7 percent of real trees use it.
10. The blackboard. Myth: it is a bag of globals. Show ports and why py_trees makes access explicit.
11. BT versus state machine. One way versus two way transfer. Equal power. Where the FSM still wins, with the SMACH numbers and the PX4 commander. Myth: BTs replaced state machines.
12. Design and the real thing. Explicit success conditions, implicit sequences, backchaining from the book's chapter 3. Read the real Nav2 tree. The drone: the BT sits above the autopilot. Myth: the autopilot is a behavior tree.

Checkride: five injected failures (battery drop, wind, no fly zone appears, new goal mid flight, waypoint reached then lost). The reader builds a tree. The interpreter judges it.

Appendix, not a chapter: the dialect table. Unreal's event driven model and why Anguelov says it loses reactivity.

### 3.5 Rendering

2D only for version one.
A tree is a 2D drawing and the map is top down.
The tooling research for the flight course already concluded 3D should be spent only where the thing is truly 3D.
A 3D drone view can be added later with the Three.js chunk already in the flight repo.

### 3.6 Where it lives

Recommended: a new folder `behavior-trees/` beside `flight-dynamics/`, copying the shell (lesson spine, plates, cards, checkride, check scripts).
Not a shared package yet. Copy first, extract when the second copy shows what is really shared.
Not a Part III of the flight repo. The masthead would read "Flight Dynamics & Air Combat & Behavior Trees", and the flight product doc says the structure should travel, not that one course should hold every subject.

One tempting later link: the air combat bandit's "law" in `flight-dynamics/src/sim/tasks.js` is a hand coded controller. It could become a BT. That is a Part II idea for this course, not version one.

---

## 4. Video candidates (titles verified by oEmbed, counts from a third party, approximate)

- AI and Games, "Behaviour Trees: The Cornerstone of Modern Game AI", about 200k views.
- AI and Games, "The Behaviour Tree AI of Halo 2", about 120k.
- Petter Ogren, "What is a Behavior Tree and how do they work", about 44k, and his 17 lecture KTH list including "Why Memory Nodes is a bad idea".
- Bungie Halo Archive, Isla's GDC 2005 talk recording, about 5k.
- Epic, "Unreal Engine AI with Behavior Trees" (Paulo Souza).

Curation and embed permission checks come later, with the same `yt.mjs` flow as the flight course.

---

## 5. Open decisions

1. Folder: new sibling `behavior-trees/`, or Part III inside the flight repo. Recommendation: sibling.
2. World: drone above an autopilot, or home robot with a dock. Recommendation: drone.
3. Rendering: 2D only in version one, or 3D drone from the start. Recommendation: 2D.

---

## 6. Could not reach

- Ogren 2012 AIAA UAV paper: full text closed (HTTP 403 at AIAA, no open copy). Abstract only. The UAV example tree is unverified.
- Marzinotto et al. ICRA 2014 "unified framework": KTH DiVA timed out on every attempt. Abstract only. That it fixed the four plus two node set is plausible, not verified.
- Champandard's 2007 GDC Lyon slides: aigamedev.com is dead, archive copies are registration teasers. His node set is taken from his 2013 Game AI Pro chapter instead.
- Reddit r/gamedev and r/robotics: blocked. Confusions come from Stack Exchange only.
- ICUAS 2024 drone inspection BT paper: PDF 403, existence only.
- Beehave (Godot) plain Sequence restart rule: the fetched summary was ambiguous. Re-read before quoting.
- GDC Vault videos: listing pages only, no transcripts.
- Any ESA use of BTs: none found. Reported as absence, not as proof of absence.

---

## 7. Source links

- Colledanchise and Ogren, book: https://arxiv.org/abs/1709.00084
- Iovino et al., survey: https://arxiv.org/abs/2005.05842
- Ogren and Sprague, Annual Review: https://arxiv.org/abs/2203.13083
- Colledanchise and Natale, concurrency: https://arxiv.org/abs/2110.11813
- Ghzouli et al., SLE 2020: https://www.cse.chalmers.se/~bergert/paper/2020-sle-behaviortrees.pdf
- Ghzouli et al., TSE 2023: https://arxiv.org/abs/2208.04211
- Ogren 2012, AIAA (abstract via OpenAlex): https://api.openalex.org/works/doi:10.2514/6.2012-4458
- Klockner 2013, DLR: https://elib.dlr.de/91679/1/kloeckner2013behavior.pdf
- Aerostack2: https://arxiv.org/pdf/2303.18237 and https://github.com/aerostack2/aerostack2/tree/main/as2_behavior_tree
- drone_trees: https://github.com/BristolFlightLab/drone_trees
- PX4 commander: https://docs.px4.io/main/en/modules/modules_system.html
- ArduPilot flight modes: https://ardupilot.org/copter/docs/flight-modes.html
- PLEXIL: https://plexil-group.github.io/plexil_docs/
- JPL Mars helicopter hybrid: https://arxiv.org/html/2509.01980v1
- BehaviorTree.CPP basics: https://www.behaviortree.dev/docs/learn-the-basics/BT_basics
- BehaviorTree.CPP Sequence table: https://www.behaviortree.dev/docs/nodes-library/SequenceNode
- BehaviorTree.CPP Fallback table: https://www.behaviortree.dev/docs/nodes-library/FallbackNode
- BehaviorTree.CPP async and halt: https://www.behaviortree.dev/docs/guides/asynchronous_nodes
- py_trees composites: https://py-trees.readthedocs.io/en/devel/composites.html
- py_trees behaviours: https://py-trees.readthedocs.io/en/devel/behaviours.html
- Nav2 tree XML: https://raw.githubusercontent.com/ros-navigation/navigation2/main/nav2_bt_navigator/behavior_trees/navigate_to_pose_w_replanning_and_recovery.xml
- Nav2 walkthrough: https://docs.nav2.org/rolling/getting_started/nav2_behavior_trees/detailed_behavior_tree_walkthrough/detailed_behavior_tree_walkthrough/
- Isla, Halo 2, GDC 2005: https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai
- Isla, Halo 3 slides: https://web.cs.wpi.edu/~rich/courses/imgd4000-d09/lectures/halo3.pdf
- Champandard and Dunstan, Starter Kit: https://www.gameaipro.com/GameAIPro/GameAIPro_Chapter06_The_Behavior_Tree_Starter_Kit.pdf
- Francis, pitfalls: https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter09_Overcoming_Pitfalls_in_Behavior_Tree_Design.pdf
- Simpson 2014: https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work
- Anguelov 2020: https://takinginitiative.net/2020/01/07/behavior-trees-breaking-the-cycle-of-misuse/
- AI Arborist GDC 2017 slides: https://media.gdcvault.com/gdc2017/Presentations/Vehkala_AI%20Arborist.pdf
- Unreal overview: https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview
- Unreal decorators: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-behavior-tree-node-reference-decorators
- Unity Behavior: https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/index.html
- LimboAI: https://limboai.readthedocs.io/en/latest/behavior-trees/introduction.html
- Robohub intro: https://robohub.org/introduction-to-behavior-trees/
- KTH course: https://www.kth.se/student/kurser/kurs/FDD3025
- Ogren lecture list: https://www.kth.se/profile/petter/page/video-lectures-on-behavior-trees
- Mistreevous visualiser: https://github.com/nikkorn/mistreevous-visualiser
- 0xABAD demo: https://github.com/0xABAD/behavior_tree
- BehaVerify: https://arxiv.org/abs/2208.05360
- Stack Exchange: https://gamedev.stackexchange.com/questions/51693/ , /61495/ , /51738/ , /53144/ , /154476/ , https://stackoverflow.com/questions/51798122/ , /6694519/
