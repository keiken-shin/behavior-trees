/* The checkride. Five items, each a claim the course made that you now have to
   produce as a tree. The interpreter judges. Each carries a reference tree that
   passes and a misconception tree that fails, and check-checkride.mjs runs both,
   because an exam item nobody can pass is worse than no item. */
import { run } from "../bt/run.js";
import { WORLDS } from "./plays.js";

const near = (s, p, r = 3) => Math.hypot(s.x - p.x, s.y - p.y) <= r;
const home = (s) => near(s, s.home);

export const EXAM = [
  {
    n: 1, name: "Deliver to A, then come home and land", ch: 3,
    brief: "No hazards. Fly to A, drop the parcel, fly home, land. Warm up the editor.",
    scenario: "delivery", script: [], ticks: 1200,
    starter: "-> mission {memory}\n  FlyTo A\n",
    pass: (s) => s.delivered && s.landed && home(s),
    reference: "-> mission {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
    wrong: "-> mission {memory}\n  FlyTo A\n  ReturnHome\n  Land",
  },
  {
    n: 2, name: "Survive a battery drop", ch: 6,
    brief: "At tick 80 the battery drops to 12 percent. Be home and landed before it is empty. Deliver if you can.",
    scenario: "delivery", script: [{ at: 80, hazard: "battery12" }], ticks: 1500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    pass: (s) => !s.dead && s.landed && home(s),
    reference: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
    wrong: "? root {memory}\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  },
  {
    n: 3, name: "Get out of a no fly zone within thirty ticks", ch: 6,
    brief: "At tick 60 a no fly zone appears on your path and a gust pushes you into it. Be out within thirty ticks of entering, then finish the delivery.",
    scenario: "delivery", script: [{ at: 60, hazard: "nofly" }, { at: 60, hazard: "gust" }], ticks: 2500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    pass: (s, h) => {
      let inside = 0;
      for (const x of h) {
        const inZ = s.noFly.some((r) => x.x >= r.x && x.x <= r.x + r.w && x.y >= r.y && x.y <= r.y + r.h);
        inside = inZ ? inside + 1 : 0;
        if (inside > 30) return false;
      }
      return s.delivered;
    },
    reference: "? root\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
    wrong: "? root {memory}\n  -> no fly\n    InNoFly\n    ExitNoFly\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  },
  {
    n: 4, name: "Reach a goal that moves", ch: 10,
    brief: "At tick 60 the goal moves to B. Deliver to wherever the goal is, then come home.",
    scenario: "delivery", script: [{ at: 60, hazard: "goalB" }], ticks: 2000,
    starter: "-> deliver {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land\n",
    pass: (s) => s.delivered && s.goal === "B" && home(s),
    reference: "-> deliver {memory}\n  FlyTo Goal\n  Drop\n  ReturnHome\n  Land",
    wrong: "-> deliver {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
  },
  {
    n: 5, name: "Patrol A then B in a wind, and never go back to A", ch: 7,
    brief: "A steady gust from tick 1. Visit A, then B, then land at B. Once you have reached A you may not target it again.",
    scenario: "delivery", script: [{ at: 1, hazard: "gust" }], ticks: 2500,
    starter: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land\n",
    pass: (s, h) => {
      const A = s.waypoints.A;
      let reachedAt = -1;
      h.forEach((x, i) => { if (reachedAt < 0 && near(x, A)) reachedAt = i; });
      if (reachedAt < 0) return false;
      const wentBack = h.slice(reachedAt + 20).some((x) => x.target && x.target.x === A.x && x.target.y === A.y);
      return !wentBack && s.landed && near(s, s.waypoints.B);
    },
    reference: "-> patrol {memory}\n  FlyTo A\n  FlyTo B\n  Land",
    wrong: "-> patrol\n  FlyTo A\n  FlyTo B\n  Land",
  },
];

export function judge(item, treeText) {
  try {
    const r = run({ world: WORLDS.drone, scenario: item.scenario, tree: treeText, script: item.script, ticks: item.ticks,
      until: (s, h) => item.pass(s, h) });
    if (r.passed) return { passed: true, reason: "met" };
    return { passed: false, reason: r.state.dead ? "the battery ran out" : "the goal was not met before the clock ran out" };
  } catch (e) {
    return { passed: false, reason: e.message };
  }
}
