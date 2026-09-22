/* The card catalogue: revision and examination, from one derived deck.
 *
 * Two modes, deliberately not two features. STUDY is spaced retrieval - you
 * grade yourself, and the Leitner boxes decide when a card comes back. EXAM is
 * the same material scored, with no self-grading and no peeking. Building a
 * separate question bank for the second would have doubled what has to stay in
 * step with the lessons, for no learning that spacing does not already give.
 */

import { LESSONS, COURSE } from "../data/lessons.js";
import { buildDeck, deckState, due, grade, endSession, summary, INTERVALS } from "../data/deck.js";
import { el, mark } from "./util.js";

const shuffle = (a) => {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export function renderCards(root) {
  root.innerHTML = "";
  document.title = `Card Catalogue · ${COURSE}`;
  const deck = buildDeck();

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "Card catalogue";
  const p = el("p", "cards__lede");
  p.textContent =
    "Every card here is cut from a chapter - the claim it kills, the rule it " +
    "states, the question it asks. Reading a thing once teaches you that you have " +
    "read it. Being asked it a week later is what makes you know it.";
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");
  wrap.appendChild(body);
  root.appendChild(wrap);

  menu();

  /* ── the front desk ── */
  function menu() {
    const s = summary(deck, deckState());
    body.innerHTML = "";

    const stat = el("div", "readout cards__stat");
    stat.innerHTML =
      `<div><span>Cards</span><b>${s.total}</b></div>` +
      `<div class="v-drag"><span>Due now</span><b>${s.due}</b></div>` +
      `<div><span>Seen</span><b>${s.seen}</b></div>` +
      `<div class="v-thrust"><span>Mastered</span><b>${s.mastered}</b></div>`;
    body.appendChild(stat);

    const acts = el("div", "cards__acts");
    const study = el("button", "cards__go",
      `<span>${s.due ? `Study ${s.due} due card${s.due === 1 ? "" : "s"}` : "Study - nothing due"}</span>${mark()}`);
    study.type = "button";
    study.disabled = !s.due;
    study.onclick = () => runStudy(shuffle(due(deck, deckState())));

    const all = el("button", "cards__go2", `<span>Study the whole deck</span>${mark()}`);
    all.type = "button";
    all.onclick = () => runStudy(shuffle(deck));
    acts.append(study, all);
    body.appendChild(acts);

    // Exam: whole course, or one chapter.
    body.appendChild(el("h2", "t-h2 cards__h2", "Examination"));
    const note = el("p", "cards__note",
      "Scored, no self-grading, and the answer is not shown until you have committed to one.");
    body.appendChild(note);

    const exam = el("div", "cards__exam");
    const whole = el("button", "cards__go2", `<span>Whole course · 12 questions</span>${mark()}`);
    whole.type = "button";
    whole.onclick = () => runExam(shuffle(deck.filter((c) => c.kind === "recall")), "Whole course");
    exam.appendChild(whole);

    const pick = el("select", "cards__pick");
    pick.innerHTML = `<option value="">Examine one chapter…</option>` +
      LESSONS.map((l, i) =>
        `<option value="${l.id}">${String(i + 1).padStart(2, "0")} · ${l.title}</option>`).join("");
    pick.onchange = () => {
      if (!pick.value) return;
      const set = deck.filter((c) => c.lesson === pick.value);
      runExam(shuffle(set.filter((c) => c.kind === "recall")).concat(
        set.filter((c) => c.kind !== "recall")), LESSONS.find((l) => l.id === pick.value).title);
    };
    exam.appendChild(pick);
    body.appendChild(exam);
  }

  function frame(label, right) {
    body.innerHTML = "";
    const bar = el("div", "cards__bar");
    bar.innerHTML = `<span>${label}</span><span class="cards__count">${right}</span>`;
    const back = el("button", "cards__x", `${mark("left")}<span>Catalogue</span>`);
    back.type = "button";
    back.onclick = menu;
    bar.appendChild(back);
    body.appendChild(bar);
    return bar;
  }

  /* ── study: show, recall, reveal, grade yourself ── */
  function runStudy(queue) {
    let i = 0, got = 0;
    const step = () => {
      if (i >= queue.length) {
        endSession();
        return done(`${got} of ${queue.length} recalled`,
          "Cards you missed come back next session. Cards you knew go to the back of the queue.");
      }
      const c = queue[i];
      frame("Study", `${i + 1} / ${queue.length}`);

      const card = el("div", "card");
      card.innerHTML =
        `<div class="card__cap"><span>Ch ${String(c.chapter).padStart(2, "0")}</span>` +
        `<span>${c.kind}</span></div>` +
        (c.promptLead ? `<p class="card__lead">${c.promptLead}</p>` : "") +
        `<div class="card__q">${c.prompt}</div>`;
      body.appendChild(card);

      const reveal = el("button", "cards__go", `<span>Show the answer</span>${mark()}`);
      reveal.type = "button";
      reveal.onclick = () => {
        reveal.remove();
        card.appendChild(el("div", "card__a", c.answer));
        const g = el("div", "card__grade");
        const miss = el("button", "", "I did not have it");
        const hit = el("button", "right", "I had it");
        miss.type = hit.type = "button";
        miss.onclick = () => { grade(c.id, false); i++; step(); };
        hit.onclick = () => { grade(c.id, true); got++; i++; step(); };
        g.append(miss, hit);
        body.appendChild(g);
      };
      body.appendChild(reveal);
    };
    step();
  }

  /* ── exam: commit first, then see ── */
  function runExam(queue, label) {
    let i = 0, score = 0;
    const wrong = [];
    const step = () => {
      if (i >= queue.length) {
        const pct = Math.round((score / queue.length) * 100);
        return done(`${score} of ${queue.length} - ${pct}%`,
          wrong.length
            ? "Worth another look: " + wrong.map((c) => `ch ${c.chapter}, ${c.chapterTitle}`).join("; ")
            : "Every one. Nothing in this course is still surprising you.");
      }
      const c = queue[i];
      frame(`Examination · ${label}`, `${i + 1} / ${queue.length}`);

      const card = el("div", "card");
      card.innerHTML =
        `<div class="card__cap"><span>Ch ${String(c.chapter).padStart(2, "0")}</span><span>${c.kind}</span></div>` +
        `<div class="card__q">${c.prompt}</div>`;
      body.appendChild(card);

      if (c.options) {
        const btns = [];
        c.options.forEach((opt, oi) => {
          const b = el("button", "card__opt",
            `<span class="check__k">${String.fromCharCode(65 + oi)}</span><span class="check__o">${opt}</span>`);
          b.type = "button";
          b.onclick = () => {
            btns.forEach((x, j) => {
              x.disabled = true;
              if (j === c.correct) x.classList.add("right");
              else if (j === oi) x.classList.add("wrong");
            });
            if (oi === c.correct) { score++; grade(c.id, true); }
            else { wrong.push(c); grade(c.id, false); }
            const why = el("p", "card__why", c.answer);
            body.appendChild(why);
            const next = el("button", "cards__go", `<span>Next</span>${mark()}`);
            next.type = "button";
            next.onclick = () => { i++; step(); };
            body.appendChild(next);
          };
          btns.push(b);
          card.appendChild(b);
        });
      } else {
        // Non-MCQ cards in a chapter exam are self-scored, but only after commitment.
        const reveal = el("button", "cards__go", `<span>Show the answer</span>${mark()}`);
        reveal.type = "button";
        reveal.onclick = () => {
          reveal.remove();
          card.appendChild(el("div", "card__a", c.answer));
          const g = el("div", "card__grade");
          const miss = el("button", "", "I did not have it");
          const hit = el("button", "right", "I had it");
          miss.type = hit.type = "button";
          miss.onclick = () => { wrong.push(c); grade(c.id, false); i++; step(); };
          hit.onclick = () => { score++; grade(c.id, true); i++; step(); };
          g.append(miss, hit);
          body.appendChild(g);
        };
        body.appendChild(reveal);
      }
    };
    step();
  }

  function done(headline, sub) {
    body.innerHTML = "";
    const d = el("div", "card card--done");
    d.innerHTML = `<div class="card__cap"><span>Result</span></div>` +
      `<div class="card__q">${headline}</div><div class="card__a">${sub}</div>`;
    body.appendChild(d);
    const back = el("button", "cards__go", `<span>Back to the catalogue</span>${mark()}`);
    back.type = "button";
    back.onclick = menu;
    body.appendChild(back);
  }
}

/* Shown on the index so the deck is reachable without re-entering a chapter -
   spaced repetition that you have to go hunting for does not get used. */
export function catalogueStrip() {
  const s = summary(buildDeck(), deckState());
  const a = el("a", "catalogue",
    `<span class="catalogue__t">Card catalogue</span>` +
    `<span class="catalogue__n">${s.total} cards · ${s.due} due · ${s.mastered} mastered</span>` +
    mark());
  a.href = "#cards";
  return a;
}
