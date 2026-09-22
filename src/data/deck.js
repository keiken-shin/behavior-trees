/* The revision deck, DERIVED from the lessons rather than authored beside them.
 *
 * A hand-written deck drifts. Six months after someone corrects a lesson, the
 * card still teaches the old thing, and nobody notices because the two live in
 * different files. So there is no card content in here at all - only rules for
 * turning what a chapter already says into something you can be asked.
 *
 * Two sources, and each earns its place:
 *   MISCONCEPTION  the twelve claims the course exists to kill. The best cards
 *                  in the deck, and the reason to have a deck at all.
 *   RECALL         the stage-check questions, which are already written to
 *                  target the misconception rather than the prose.
 */

import { LESSONS } from "./lessons.js";

const strip = (s) => String(s).replace(/<[^>]+>/g, "");

export function buildDeck() {
  const cards = [];
  LESSONS.forEach((les, i) => {
    const ch = i + 1;
    const meta = { lesson: les.id, chapter: ch, chapterTitle: les.title };

    les.flow.forEach((b, n) => {
      if (b.t === "myth") {
        cards.push({
          ...meta, id: `${les.id}:myth`, kind: "misconception",
          prompt: b.claim,
          promptLead: "What is wrong with this?",
          answer: b.truth,
        });
      }
      if (b.t === "check") {
        cards.push({
          ...meta, id: `${les.id}:q`, kind: "recall",
          prompt: b.q,
          promptLead: "",
          answer: `${b.options[b.answer]} - ${strip(b.why)}`,
          options: b.options,
          correct: b.answer,
        });
      }
    });
  });
  return cards;
}

/* ── Leitner boxes ────────────────────────────────────────────────────────
 * Five boxes, reviewed every 1, 2, 4, 8 and 16 sessions. Chosen over SM-2 on
 * purpose: it needs one integer per card, a learner can see why a card came
 * back, and the extra precision of a half-life model buys nothing at 32 cards.
 */
export const INTERVALS = [1, 2, 4, 8, 16];
const KEY = "fd.deck";

export function deckState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s.session === "number" && s.cards) return s;
  } catch { /* fall through to a fresh deck */ }
  return { session: 0, cards: {} };
}

const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

/* A card is due if it has never been seen, or its due session has arrived. */
export function due(cards, state = deckState()) {
  return cards.filter((c) => {
    const e = state.cards[c.id];
    return !e || e.due <= state.session;
  });
}

export function grade(cardId, got, state = deckState()) {
  const e = state.cards[cardId] || { box: 0 };
  // Right: up a box. Wrong: all the way back to the first - the point of the
  // system is that a card you missed is not nearly-learned.
  const box = got ? Math.min(INTERVALS.length - 1, e.box + 1) : 0;
  state.cards[cardId] = { box, due: state.session + INTERVALS[box] };
  save(state);
  return state;
}

export function endSession(state = deckState()) {
  state.session += 1;
  save(state);
  return state;
}

export function summary(cards, state = deckState()) {
  const seen = cards.filter((c) => state.cards[c.id]);
  const mastered = seen.filter((c) => state.cards[c.id].box >= INTERVALS.length - 1);
  return {
    total: cards.length,
    due: due(cards, state).length,
    seen: seen.length,
    mastered: mastered.length,
    session: state.session,
  };
}
