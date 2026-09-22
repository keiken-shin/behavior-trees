/* Generated from content/videos.json - the picked set only.
   Regenerate with `npm run videos`; do not hand-edit. */
export const VIDEOS = {
  "the-tick": [
    {
      "id": "6VBCXvfNlCM",
      "url": "https://www.youtube.com/watch?v=6VBCXvfNlCM",
      "title": "Behaviour Trees: The Cornerstone of Modern Game AI | AI 101",
      "channel": "AI and Games",
      "duration": "9:50",
      "note": "A broad, well produced tour of behavior trees in game AI: what a tick is, how the tree is walked, and why the format took over from scripted state machines in games."
    },
    {
      "id": "KeShMInMjro",
      "url": "https://www.youtube.com/watch?v=KeShMInMjro",
      "title": "5 minute Behavior Tree tutorial",
      "channel": "Petter Ögren",
      "duration": "5:16",
      "note": "A fast whiteboard sketch of a tree being ticked from the root down to a leaf, drawn by one of the textbook's authors."
    }
  ],
  "three-answers": [
    {
      "id": "iY1jnFvHgbE",
      "url": "https://www.youtube.com/watch?v=iY1jnFvHgbE",
      "title": "Unreal Engine AI with Behavior Trees | Unreal Engine",
      "channel": "Unreal Engine",
      "duration": "26:38",
      "note": "Epic's own walkthrough of building a tree in the Unreal editor, showing tasks reporting Succeeded, Failed and In Progress as the tree runs."
    },
    {
      "id": "KeShMInMjro",
      "url": "https://www.youtube.com/watch?v=KeShMInMjro",
      "title": "5 minute Behavior Tree tutorial",
      "channel": "Petter Ögren",
      "duration": "5:16",
      "note": "The same five minute sketch, watched this time for where each node's success, failure or still running answer gets read."
    }
  ],
  "sequence": [
    {
      "id": "UINw_7wHNSc",
      "url": "https://www.youtube.com/watch?v=UINw_7wHNSc",
      "title": "Control Flow Nodes in Unity Behavior | Unity Tutorial",
      "channel": "LlamAcademy",
      "duration": "12:21",
      "note": "Covers the control flow nodes in Unity's Behavior package, including the Sequence, and how it ticks its children in order."
    },
    {
      "id": "T4084tO2WgU",
      "url": "https://www.youtube.com/watch?v=T4084tO2WgU",
      "title": "003. Behaviour Trees - Coding the Sequence class",
      "channel": "Christian Richards",
      "duration": "19:31",
      "note": "Live coding of a Sequence node's tick method from scratch, line by line, useful for seeing the same loop this course's interpreter implements."
    }
  ],
  "fallback": [
    {
      "id": "-t3PbGRazKg",
      "url": "https://www.youtube.com/watch?v=-t3PbGRazKg",
      "title": "Smart Enemy AI | (Part 1: Behavior Trees) | Tutorial in Unreal Engine 5 (UE5)",
      "channel": "Ali Elzoheiry",
      "duration": "45:31",
      "note": "A long, popular UE5 walkthrough of a Selector choosing between plans for an enemy AI, in the order they are placed on the branch."
    },
    {
      "id": "NypZNVNskx4",
      "url": "https://www.youtube.com/watch?v=NypZNVNskx4",
      "title": "007. Behavior Trees - Priority Selector",
      "channel": "Christian Richards",
      "duration": "25:11",
      "note": "Live coding of a priority Selector, the same node this course calls Fallback, including the left to right stop on success rule."
    }
  ],
  "conditions": [
    {
      "id": "KeShMInMjro",
      "url": "https://www.youtube.com/watch?v=KeShMInMjro",
      "title": "5 minute Behavior Tree tutorial",
      "channel": "Petter Ögren",
      "duration": "5:16",
      "note": "Points out where a condition sits among the node types in the sketch, and that it answers at once."
    },
    {
      "id": "TxXu1P9clEQ",
      "url": "https://www.youtube.com/watch?v=TxXu1P9clEQ",
      "title": "How to Program AI Conditions with Behavior Tree Decorators - Unreal 5 Tutorial",
      "channel": "Tony Munoz | Game Creator Accelerator",
      "duration": "14:24",
      "note": "Shows Unreal's own approach of attaching a condition check as a Decorator on a branch, rather than as a leaf."
    }
  ],
  "reactivity": [
    {
      "id": "-hXFCSxAYEI",
      "url": "https://www.youtube.com/watch?v=-hXFCSxAYEI",
      "title": "Understanding AI and Behavior Trees - The Ultimate Guide [UE5]",
      "channel": "Darklore Creations",
      "duration": "42:20",
      "note": "A long form UE5 guide that includes a section on a tree reacting to a changed condition mid run and cutting a running branch."
    },
    {
      "id": "jPYQwJ0dPms",
      "url": "https://www.youtube.com/watch?v=jPYQwJ0dPms",
      "title": "🔴 Interrupt Node • Behavior Trees • RPG (Role Playing Game) • API Core • (Pt. 64)",
      "channel": "Code Master",
      "duration": "1:03:53",
      "note": "Building an interrupt style node from scratch, useful for seeing what has to happen for a higher priority branch to cut a running one."
    }
  ],
  "memory": [
    {
      "id": "sETuC2Mr6D8",
      "url": "https://www.youtube.com/watch?v=sETuC2Mr6D8",
      "title": "4 Common Bugs in Backward Chained Behavior Trees (BT intro part 6)",
      "channel": "Petter Ögren",
      "duration": "20:21",
      "note": "Walks through bugs that show up when a tree's memory of what already succeeded goes stale."
    },
    {
      "id": "W7p34qhBux8",
      "url": "https://www.youtube.com/watch?v=W7p34qhBux8",
      "title": "Why Memory Nodes is a Bad Idea in Behavior Trees (intro to BTs part 5B)",
      "channel": "Petter Ögren",
      "duration": "21:30",
      "note": "The textbook co-author's own lecture arguing memory nodes trade away reactivity, the exact caution this chapter's myth section quotes him on."
    }
  ],
  "decorators": [
    {
      "id": "KJVv4nQlH1s",
      "url": "https://www.youtube.com/watch?v=KJVv4nQlH1s",
      "title": "Unreal Engine 5 Tutorial - AI Part 4: Decorators",
      "channel": "Ryan Laley",
      "duration": "10:31",
      "note": "A focused walkthrough of adding Decorators to branches in Unreal's behavior tree editor: inverters, cooldowns, blackboard based conditions."
    },
    {
      "id": "FzAWSDiepMQ",
      "url": "https://www.youtube.com/watch?v=FzAWSDiepMQ",
      "title": "Ask a Dev | Behavior Tree Decorators & Services | Unreal Engine Tutorial",
      "channel": "Ask A Dev",
      "duration": "42:17",
      "note": "Covers Decorators and Services side by side in Unreal, and where a decorator's rule differs from a leaf's job."
    }
  ],
  "parallel": [
    {
      "id": "Uj1pm2T-z8w",
      "url": "https://www.youtube.com/watch?v=Uj1pm2T-z8w",
      "title": "Behavior Tree Basics: What is a Parallel Task?",
      "channel": "opsive",
      "duration": "3:59",
      "note": "A short, focused explanation of a Parallel node ticking every child every tick and deciding success by a count."
    },
    {
      "id": "idejwkR4Vcc",
      "url": "https://www.youtube.com/watch?v=idejwkR4Vcc",
      "title": "WTF Is? AI: Simple Parallel Node in Unreal Engine 4 ( UE4 )",
      "channel": "Mathew Wadstein Tutorials",
      "duration": "5:34",
      "note": "Builds a Simple Parallel node in Unreal and shows its two child, one main task shape."
    }
  ],
  "blackboard": [
    {
      "id": "iY1jnFvHgbE",
      "url": "https://www.youtube.com/watch?v=iY1jnFvHgbE",
      "title": "Unreal Engine AI with Behavior Trees | Unreal Engine",
      "channel": "Unreal Engine",
      "duration": "26:38",
      "note": "Epic's own tutorial uses the Blackboard as the shared store a tree's tasks and decorators read and write."
    },
    {
      "id": "HNGJ8KOqdYQ",
      "url": "https://www.youtube.com/watch?v=HNGJ8KOqdYQ",
      "title": "How to Implement Blackboard Architecture in Unity C#",
      "channel": "git-amend",
      "duration": "28:57",
      "note": "Builds a blackboard as a shared key/value store from scratch in Unity, the same idea this course's interpreter logs every write to."
    },
    {
      "id": "DBLq7N7orQQ",
      "url": "https://www.youtube.com/watch?v=DBLq7N7orQQ",
      "title": "Step04 - Blackboard and Behavior Tree",
      "channel": "Artem Mavrin",
      "duration": "7:51",
      "note": "A short walkthrough connecting a blackboard to a running behavior tree."
    }
  ],
  "tree-or-machine": [
    {
      "id": "6VBCXvfNlCM",
      "url": "https://www.youtube.com/watch?v=6VBCXvfNlCM",
      "title": "Behaviour Trees: The Cornerstone of Modern Game AI | AI 101",
      "channel": "AI and Games",
      "duration": "9:50",
      "note": "Includes the historical case for behavior trees over the finite state machines they replaced in game AI."
    },
    {
      "id": "CZvfuNfdc1M",
      "url": "https://www.youtube.com/watch?v=CZvfuNfdc1M",
      "title": "Which AI Behavior Framework Should You Use? | AI Series 46",
      "channel": "LlamAcademy",
      "duration": "17:26",
      "note": "Compares state machines, behavior trees and utility AI side by side for game use, with the trade-offs named plainly."
    },
    {
      "id": "gXrKGTPwfO8",
      "url": "https://www.youtube.com/watch?v=gXrKGTPwfO8",
      "title": "Behavior Trees vs Finite State Machines (BT intro part 4)",
      "channel": "Petter Ögren",
      "duration": "9:14",
      "note": "The textbook co-author's own lecture comparing behavior trees and finite state machines directly, transition by transition."
    }
  ],
  "design": [
    {
      "id": "sVUKeHMBtpQ",
      "url": "https://www.youtube.com/watch?v=sVUKeHMBtpQ",
      "title": "Navigation2 in ROS2 | Autonomous Mobile Robot | Nav2 | Behavior Trees | Odrive| Diff drive Robot",
      "channel": "Robotics and ROS Learning",
      "duration": "38:30",
      "note": "A walkthrough of Nav2's own behavior tree running on a real mobile robot, the production tree this chapter's figure is drawn from."
    },
    {
      "id": "kRp3eA09JkM",
      "url": "https://www.youtube.com/watch?v=kRp3eA09JkM",
      "title": "Behavior Trees in Robotics (Part 1 - Concept)",
      "channel": "Hummingbird",
      "duration": "14:26",
      "note": "An introduction to why robotics adopted behavior trees, as background for the chapter's move from games to production robots."
    },
    {
      "id": "4rkc_9foxzo",
      "url": "https://www.youtube.com/watch?v=4rkc_9foxzo",
      "title": "Drone Pick-and-Place missions using a Back-chained Behavior Tree design",
      "channel": "Petter Ögren",
      "duration": "28:35",
      "note": "The textbook co-author designing a drone mission tree by chaining backward from the goal, the exact method this chapter describes."
    }
  ]
};
