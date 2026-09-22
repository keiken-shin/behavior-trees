/* What each chapter's playground shows. Pure data: which world, which scenario,
   the starting tree in the text form, the variants and switches offered, the
   hazards shown, whether the editor is open, and the goal that marks the
   chapter's "make it happen" step. Filled in by the chapter tasks. */
import { DRONE } from "../world/drone.js";
export const WORLDS = { drone: DRONE };
export const PLAYS = {};
export const hasPlay = (id) => Object.hasOwn(PLAYS, id);
