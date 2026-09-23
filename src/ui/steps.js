/* What a chapter asks of you before it counts as complete, and how much of it
 * you have done.
 *
 * It lives in one place because three surfaces need the same answer and must
 * not drift: the chapter shows the list, the index counts it, and the checkride
 * warns on it. It is derived from the content rather than declared - a chapter
 * with no clip does not ask you to watch one - so adding a chapter cannot
 * forget to state its requirements.
 *
 * The requirements are deliberately visible in the chapter itself. A progress
 * bar that fills for reasons the reader cannot see is a slot machine; if
 * finishing a chapter takes three specific things, the page has to say so.
 */

import { LESSONS } from "../data/lessons.js";
import { VIDEOS } from "../data/videos.js";
import { SCENES } from "../data/scenes.js";
import { progress, saveProgress } from "./util.js";

/* Labels state the rule exactly, including the strict part. "Watch a clip"
   would leave a reader who skipped the last thirty seconds wondering why the
   box is still empty. */
const STEPS = {
  video: { label: "Watch a clip to the end", hint: "any one of them" },
  check: { label: "Answer the stage check correctly", hint: "wrong answers do not count" },
  scene: { label: "Run a scene to the end and meet its goal", hint: "the goal latches once met" },
};

export function stepsFor(id) {
  const les = LESSONS.find((l) => l.id === id);
  const keys = [];
  if ((VIDEOS[id] || []).length) keys.push("video");
  if (les?.flow.some((b) => b.t === "check")) keys.push("check");
  if (les?.flow.some((b) => b.t === "scene" && SCENES[b.id])) keys.push("scene");
  return keys.map((key) => ({ key, ...STEPS[key] }));
}

/* `true` is the old entry shape - one flag written the moment any stage-check
   option was clicked, right or wrong. It is read as "all of it" so that nobody
   who finished chapters under the old rule watches them empty out. */
export function doneSteps(id) {
  let e = progress()[id];
  if (e === true) return Object.fromEntries(stepsFor(id).map((s) => [s.key, true]));
  // Version one's key was `play`; map it to `scene` so a goal met under the
  // old name still shows done rather than emptying out under the new one.
  if (e && e.play && !e.scene) e = { ...e, scene: true };
  return e || {};
}

export function markStep(id, key) {
  const p = progress();
  if (p[id] === true) return;                   // already complete under the old shape
  if (p[id]?.[key]) return;                     // idempotent: no event for a repeat
  p[id] = { ...(p[id] || {}), [key]: true };
  saveProgress(p);
  /* Three different places mark steps - the player on ENDED, the stage check on
     a correct answer, the playground when its goal latches - and two of them are
     inside a modal covering the page. Rather than each one knowing who to tell,
     the store announces and whoever is showing the list repaints. */
  document.dispatchEvent(new CustomEvent("bt:progress", { detail: { id, key } }));
}

export function chapterDone(id) {
  const steps = stepsFor(id);
  const done = doneSteps(id);
  return steps.length > 0 && steps.every((s) => done[s.key]);
}

export function doneCount(id) {
  const done = doneSteps(id);
  return stepsFor(id).filter((s) => done[s.key]).length;
}
