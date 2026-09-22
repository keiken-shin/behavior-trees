/* The drone world. A dot with a heading on a top down map, a battery, a home
 * pad, three waypoints, an optional no fly zone and wind.
 *
 * This is NOT the Cessna from the flight course and it is not trying to be. It
 * is kinematic: it turns at a fixed rate and flies at a fixed speed, and the
 * numbers below are chosen for the lesson, not measured from an aircraft. The
 * lesson is the mind, not the airframe. What has to be honest is the tick: the
 * tree really is asked every DT seconds, and the leaves really do only what
 * they say.
 *
 * Every world exports the same five things: init, step, leaves, hazards, draw,
 * plus view. A second world (a home robot with a dock) is a second file with
 * the same shape; nothing outside this file may know it is a drone.
 */
import { S } from "../bt/tree.js";
import { craft } from "../data/svg.js";

export const DT = 0.1;             // seconds per tick
export const SPEED = 10;           // m/s, chosen for the lesson
export const TURN_RATE = 120;      // deg/s, chosen for the lesson
export const DRAIN = 0.8;          // percent per second airborne: 125 s of flight.
                                   // Derived from the checkride: a drop to 12 percent at tick 80 (about
                                   // 70 m out) must be survivable by turning back (7 s, 5.6 percent) and
                                   // fatal if the delivery goes on (about 26 s more, 20.6 percent).
export const CHARGE_RATE = 5;      // percent per second on the pad
export const ARRIVE = 3;           // m, "there"
export const MAP_W = 200, MAP_H = 140;   // m

/* heading: degrees clockwise from north, north is up the screen. */
const toRad = (d) => (d * Math.PI) / 180;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/* Every change to the world goes through here so a Condition that changes
   anything is caught by the interpreter's mutation counter. */
const mut = (s) => { s.mutations++; };

const SCENARIOS = {
  delivery: {
    home: { x: 20, y: 120 },
    waypoints: { A: { x: 160, y: 30 }, B: { x: 170, y: 110 }, C: { x: 60, y: 30 } },
    goal: "A",
  },
};

export function init(scenarioId = "delivery") {
  const sc = SCENARIOS[scenarioId] ?? SCENARIOS.delivery;
  return {
    x: sc.home.x, y: sc.home.y, heading: 0, flying: false, target: null, targetBy: null,
    battery: 100, dead: false, home: { ...sc.home },
    waypoints: Object.fromEntries(Object.entries(sc.waypoints).map(([k, v]) => [k, { ...v }])),
    goal: sc.goal, noFly: [], wind: { x: 0, y: 0 }, landed: true, charging: false,
    delivered: false, track: [], mutations: 0, t: 0, goalMoves: 0,
  };
}

export function step(s, dt = DT) {
  s.t += dt;
  if (s.dead) return;
  if (!s.landed) {
    if (s.target) {
      const want = (Math.atan2(s.target.x - s.x, -(s.target.y - s.y)) * 180) / Math.PI;   // 0 = north
      let d = ((want - s.heading + 540) % 360) - 180;
      const maxTurn = TURN_RATE * dt;
      d = Math.max(-maxTurn, Math.min(maxTurn, d));
      s.heading = (s.heading + d + 360) % 360;
      if (dist(s, s.target) > ARRIVE) {
        s.x += Math.sin(toRad(s.heading)) * SPEED * dt;
        s.y -= Math.cos(toRad(s.heading)) * SPEED * dt;
      }
    }
    s.x += s.wind.x * dt;
    s.y += s.wind.y * dt;
    s.battery = Math.max(0, s.battery - DRAIN * dt);
    if (s.battery <= 0) { s.dead = true; s.target = null; s.targetBy = null; }
    if (s.track.length === 0 || dist(s.track[s.track.length - 1], s) > 1) s.track.push({ x: s.x, y: s.y });
  } else if (s.charging) {
    s.battery = Math.min(100, s.battery + CHARGE_RATE * dt);
  }
}

const resolve = (s, name) => {
  if (name === "Goal") name = s.goal;
  if (name === "Home") return s.home;
  const w = s.waypoints[name];
  if (!w) throw new Error(`no waypoint "${name}"`);
  return w;
};
/* Every leaf that flies somewhere shares state.target, so a halted leaf must
   only clear the target it set itself: otherwise the post-tick halt sweep can
   null out what a leaf ticked earlier in the same pass just wrote (a reactive
   branch switch: the new leaf sets the target, then the old leaf's halt fires
   and clobbers it). targetBy records the id of the node that owns the current
   target; it stays out of the target object itself so target keeps its plain
   {x,y} shape. */
const flyTo = (s, p, node) => {
  if (s.dead) return S.FAILURE;
  if (s.landed) { s.landed = false; s.charging = false; mut(s); }
  if (!s.target || s.target.x !== p.x || s.target.y !== p.y) { s.target = { ...p }; s.targetBy = node ? node.id : null; mut(s); }
  return dist(s, p) <= ARRIVE ? S.SUCCESS : S.RUNNING;
};
const clearTarget = (s, node) => {
  if (s.target && (!node || s.targetBy == null || s.targetBy === node.id)) { s.target = null; s.targetBy = null; mut(s); }
};
const cond = (doc, f) => ({ kind: "condition", doc, tick: (s, bb, args) => (f(s, args) ? S.SUCCESS : S.FAILURE) });

export const leaves = {
  BatteryBelow: cond("battery below N percent", (s, [n]) => s.battery < Number(n)),
  BatteryAbove: cond("battery above N percent", (s, [n]) => s.battery > Number(n)),
  AtWaypoint: cond("within 3 m of waypoint NAME", (s, [n]) => dist(s, resolve(s, n)) <= ARRIVE),
  AtHome: cond("within 3 m of the home pad", (s) => dist(s, s.home) <= ARRIVE),
  InNoFly: cond("inside a no fly zone", (s) => s.noFly.some((r) => inRect(s, r))),
  GoalIs: cond("the goal is waypoint NAME", (s, [n]) => s.goal === n),
  WindAbove: cond("wind speed above N m/s", (s, [n]) => Math.hypot(s.wind.x, s.wind.y) > Number(n)),
  Landed: cond("on the ground", (s) => s.landed),

  FlyTo: { kind: "action", doc: "fly to waypoint NAME (or Goal); Running until there",
    tick: (s, bb, [n], node) => flyTo(s, resolve(s, n), node), halt: clearTarget },
  ReturnHome: { kind: "action", doc: "fly to the home pad; Running until there",
    tick: (s, bb, args, node) => flyTo(s, s.home, node), halt: clearTarget },
  Land: { kind: "action", doc: "land where you are; Success at once",
    tick: (s) => { if (s.dead) return S.FAILURE; if (!s.landed) { s.landed = true; s.target = null; s.targetBy = null; mut(s); } return S.SUCCESS; } },
  TakeOff: { kind: "action", doc: "leave the ground; Success at once",
    tick: (s) => { if (s.dead) return S.FAILURE; if (s.landed) { s.landed = false; s.charging = false; mut(s); } return S.SUCCESS; } },
  Charge: { kind: "action", doc: "charge on the pad; Failure away from home, Running until full",
    tick: (s) => {
      if (dist(s, s.home) > ARRIVE) return S.FAILURE;
      if (s.battery >= 100) { if (s.charging) { s.charging = false; mut(s); } return S.SUCCESS; }
      if (!s.landed || !s.charging) { s.landed = true; s.charging = true; s.target = null; s.targetBy = null; mut(s); }
      return S.RUNNING;
    },
    halt: (s) => { if (s.charging) { s.charging = false; mut(s); } } },
  Hover: { kind: "action", doc: "hold position; always Running",
    tick: (s) => { if (s.dead) return S.FAILURE; if (s.landed) { s.landed = false; mut(s); } clearTarget(s); return S.RUNNING; } },
  ExitNoFly: { kind: "action", doc: "fly to the nearest edge of the zone you are in; Running until out",
    tick: (s, bb, args, node) => {
      const r = s.noFly.find((z) => inRect(s, z));
      if (!r) { clearTarget(s); return S.SUCCESS; }
      const exits = [{ x: r.x - 6, y: s.y }, { x: r.x + r.w + 6, y: s.y }, { x: s.x, y: r.y - 6 }, { x: s.x, y: r.y + r.h + 6 }];
      const p = exits.reduce((a, b) => (dist(s, a) < dist(s, b) ? a : b));
      flyTo(s, p, node);
      return S.RUNNING;
    }, halt: clearTarget },
  Drop: { kind: "action", doc: "drop the parcel; Success only at the goal",
    tick: (s) => {
      if (dist(s, resolve(s, "Goal")) > ARRIVE) return S.FAILURE;
      if (!s.delivered) { s.delivered = true; mut(s); }
      return S.SUCCESS;
    } },
};

export const hazards = [
  { id: "battery12", label: "Battery drops to 12 percent", apply: (s) => { s.battery = Math.min(s.battery, 12); mut(s); } },
  { id: "gust", label: "Gust: 4 m/s wind from the west", apply: (s) => { s.wind = { x: 4, y: 0 }; mut(s); } },
  { id: "calm", label: "Wind stops", apply: (s) => { s.wind = { x: 0, y: 0 }; mut(s); } },
  { id: "nofly", label: "A no fly zone appears on the path", apply: (s) => { s.noFly = [{ x: 80, y: 40, w: 50, h: 40 }]; mut(s); } },
  { id: "goalB", label: "The goal moves to B", apply: (s) => { s.goal = s.goal === "B" ? "C" : "B"; s.goalMoves++; mut(s); } },
];

/* What the blackboard table shows. Plain values only. */
export const view = (s) => ({
  battery: `${s.battery.toFixed(0)} %`, goal: s.goal, landed: s.landed, charging: s.charging,
  target: s.target ? `${s.target.x.toFixed(0)}, ${s.target.y.toFixed(0)}` : "none",
  wind: `${Math.hypot(s.wind.x, s.wind.y).toFixed(1)} m/s`, noFly: s.noFly.length, delivered: s.delivered,
});

/* The map. Colour here is chrome, not an answer: the craft, the pad and the
   zones are ink and grey. Only the battery bar borrows the status tokens,
   because a low battery IS a Failure waiting to happen. */
export function draw(s) {
  const wp = Object.entries(s.waypoints).map(([k, p]) =>
    `<circle class="wp${s.goal === k ? " wp--goal" : ""}" cx="${p.x}" cy="${p.y}" r="3"/>` +
    `<text class="wp-t" x="${p.x + 5}" y="${p.y + 3}">${k}</text>`).join("");
  const nf = s.noFly.map((r) => `<rect class="nofly" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`).join("");
  const tr = s.track.length > 1 ? `<polyline class="track" points="${s.track.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}"/>` : "";
  const wind = Math.hypot(s.wind.x, s.wind.y) > 0
    ? `<g class="wind" transform="translate(12 12) rotate(${(Math.atan2(s.wind.x, -s.wind.y) * 180) / Math.PI})"><path d="M0 6 L0 -6 M-3 -3 L0 -6 L3 -3"/></g>` : "";
  const bat = `<rect class="bat" x="150" y="6" width="40" height="5"/>` +
    `<rect class="bat-f${s.battery < 30 ? " low" : ""}" x="150" y="6" width="${(40 * s.battery) / 100}" height="5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" class="map" role="img" aria-label="Top down map of the drone">` +
    `<defs><pattern id="hatch-map" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
    `<rect class="pad" x="${s.home.x - 5}" y="${s.home.y - 5}" width="10" height="10"/>` +
    nf + tr + wp + wind + bat +
    (s.dead ? `<path class="dead" d="M${s.x - 4} ${s.y - 4} L${s.x + 4} ${s.y + 4} M${s.x + 4} ${s.y - 4} L${s.x - 4} ${s.y + 4}"/>`
      : craft(s.x, s.y, s.heading, { landed: s.landed })) +
    `</svg>`;
}

export const DRONE = { name: "drone", scenarios: Object.keys(SCENARIOS), init, step, leaves, hazards, draw, view };
