/* The checkride. Five items, each a claim the course made that you now have to
   produce as a tree. The interpreter judges. Each carries a reference tree that
   passes and a misconception tree that fails, and check-checkride.mjs runs both,
   because an exam item nobody can pass is worse than no item. */
import { run } from "../bt/run.js";
import { WORLDS } from "./plays.js";

const near = (s, p, r = 3) => Math.hypot(s.x - p.x, s.y - p.y) <= r;
const home = (s) => near(s, s.home);
/* Shared by any item whose explain() falls through to "it never even delivered" -
   items 1, 2 and 4 all have a delivery step, and this is the same sentence
   every time: where the run's history stopped, and what the root was doing. */
/* The longest unbroken run of ticks spent inside the no fly zone, counted only
   from the tick the zone appears. */
const ZONE_AT = 60;
const longestInZone = (s, h) => {
  let inside = 0, streak = 0;
  for (const x of h) {
    if (x.t < ZONE_AT) continue;
    const inZ = s.noFly.some((r) => x.x >= r.x && x.x <= r.x + r.w && x.y >= r.y && x.y <= r.y + r.h);
    inside = inZ ? inside + 1 : 0;
    streak = Math.max(streak, inside);
  }
  return streak;
};
const neverDelivered = (h) => {
  const last = h[h.length - 1];
  return `Never delivered; the tick stopped at ${last.t} with status ${last.status}.`;
};

export const EXAM = [
  {
    n: 1, name: "Deliver to A, then come home and land", ch: 3,
    brief: "No hazards. Fly to A, drop the parcel, fly home, land. Warm up the editor.",
    scenario: "delivery", script: [], ticks: 1200,
    starter: "-> mission {memory}\n  FlyTo A\n",
    pass: (s) => s.delivered && s.landed && home(s),
    explain: (s, h) => {
      if (!s.delivered) return neverDelivered(h);
      const last = h[h.length - 1];
      if (!s.landed) return `Delivered, but never landed; still ${last.status} at tick ${last.t}.`;
      return "Delivered and landed, but not back at the home pad.";
    },
    reference: "-> mission {memory}\n  FlyTo A\n  Drop\n  ReturnHome\n  Land",
    wrong: "-> mission {memory}\n  FlyTo A\n  ReturnHome\n  Land",
  },
  {
    n: 2, name: "Survive a battery drop", ch: 6,
    brief: "At tick 80 the battery drops to 12 percent. Be home and landed before it is empty. Deliver if you can.",
    scenario: "delivery", script: [{ at: 80, hazard: "battery12" }], ticks: 1500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    pass: (s) => !s.dead && s.landed && home(s),
    /* dropAt matches the "at" of this item's own script entry above: the tick
       the battery hazard lands. Naming a mechanism ("memory ate the branch")
       is a guess about the tree; checking whether the tree ever actually
       targeted home after the drop is not - it reads straight off history. */
    explain: (s, h) => {
      const dropAt = 80;                 // history[i] is tick i + 1, so the drop tick is at dropAt - 1
      if (s.dead) {
        const diedAt = h.find((x) => x.battery <= 0)?.t ?? h[h.length - 1].t;
        const turned = h.slice(dropAt - 1).find((x) => x.target && x.target.x === s.home.x && x.target.y === s.home.y);
        return turned
          ? `The battery hit zero at tick ${diedAt} even though the tree turned for home at tick ${turned.t}.`
          : `The battery hit zero at tick ${diedAt}; after the drop at tick ${dropAt} the tree never turned for home.`;
      }
      if (!s.delivered) return neverDelivered(h);
      const last = h[h.length - 1];
      if (!s.landed) return `Delivered, but never landed; still ${last.status} at tick ${last.t}.`;
      return "Delivered and landed, but not at the home pad.";
    },
    reference: "? root\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
    wrong: "? root {memory}\n  -> low battery\n    BatteryBelow 30\n    ReturnHome\n    Land\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land",
  },
  {
    n: 3, name: "Get out of a no fly zone within thirty ticks", ch: 6,
    brief: "At tick 60 a no fly zone appears on your path and a gust pushes you into it. Be out within thirty ticks of entering, then finish the delivery.",
    scenario: "delivery", script: [{ at: 60, hazard: "nofly" }, { at: 60, hazard: "gust" }], ticks: 2500,
    starter: "? root\n  -> deliver {memory}\n    FlyTo A\n    Drop\n    ReturnHome\n    Land\n",
    /* ZONE_AT matches the "at" of this item's own script entry above. The zone does
       not exist before it, so the ticks before it must not be judged against the
       rect that appears later: today the drone is north of it at tick 60 and the
       answer is the same either way, which is exactly the kind of accident that
       stops being true when a path or a hazard tick moves. */
    pass: (s, h) => longestInZone(s, h) <= 30 && s.delivered,
    explain: (s, h) => {
      const streak = longestInZone(s, h);
      if (streak > 30) return `You were inside the zone for ${streak} ticks; the limit is thirty.`;
      return "You left the zone in time, but never finished the delivery.";
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
    /* goalMovesAt matches the "at" of this item's own script entry above. Whether
       the tree kept targeting A is read off history's target field, not guessed
       from which tree text is being judged - a tree that reads Goal correctly
       but forgot Drop must not be told it targeted a fixed waypoint. */
    explain: (s, h) => {
      const goalMovesAt = 60;            // same off-by-one: the move lands on history[goalMovesAt - 1]
      const A = s.waypoints.A;
      const stillA = h.slice(goalMovesAt - 1).find((x) => x.target && x.target.x === A.x && x.target.y === A.y);
      if (stillA) return `After the goal moved to B at tick ${goalMovesAt}, the tree still targeted A at tick ${stillA.t}.`;
      if (s.dead) {
        const diedAt = h.find((x) => x.battery <= 0)?.t ?? h[h.length - 1].t;
        return `The battery hit zero at tick ${diedAt}.`;
      }
      if (!s.delivered) return neverDelivered(h);
      if (s.goal !== "B") return `Delivered, but the goal never moved to B (it is ${s.goal}).`;
      return "Delivered to the moved goal, but never made it home.";
    },
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
      // +20: two seconds for the tick that arrives at A to finish and the next leg to take the target over.
      const wentBack = h.slice(reachedAt + 20).some((x) => x.target && x.target.x === A.x && x.target.y === A.y);
      return !wentBack && s.landed && near(s, s.waypoints.B);
    },
    explain: (s, h) => {
      const A = s.waypoints.A;
      let reachedAt = -1;
      h.forEach((x, i) => { if (reachedAt < 0 && near(x, A)) reachedAt = i; });
      if (reachedAt < 0) return "You never reached A.";
      // Same two second grace as pass(), so the sentence and the verdict cannot disagree.
      const back = h.slice(reachedAt + 20).find((x) => x.target && x.target.x === A.x && x.target.y === A.y);
      if (back) return `A was targeted again at tick ${back.t}, after you had already reached it.`;
      if (!s.landed) return "You never landed.";
      return "You landed, but not at B.";
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
    const reason = item.explain
      ? item.explain(r.state, r.history)
      : r.state.dead ? "the battery ran out" : "the goal was not met before the clock ran out";
    return { passed: false, reason };
  } catch (e) {
    return { passed: false, reason: e.message };
  }
}
