/* The checkride: the end of the course, flown rather than answered.
 *
 * Five items, each a claim a chapter made that you now have to produce on
 * demand. The interpreter judges every one - the same run() the checks use -
 * so there is nothing to argue with, and each item carries a reference tree
 * that passes and a misconception tree that fails, checked by
 * scripts/check-checkride.mjs so an item nobody can pass never ships.
 *
 * One ride, sat one item at a time: each item is its own playground, editor
 * open, starting from the tree the chapter left you with. "Judge this tree"
 * runs the real judge() against whatever is in the textarea right now and
 * reports why, in the interpreter's own terms - it does not require you to
 * step the playground to the end. The scripted hazards (a battery drop, a no
 * fly zone, a moving goal, a gust) land on schedule while you play the item
 * too, so what you watch happen is what judge() will find.
 */
import { el, mark } from "./util.js";
import { chapterDone } from "./steps.js";
import { LESSONS, COURSE } from "../data/lessons.js";
import { EXAM, judge } from "../data/exam.js";
import { mountPlayground } from "../play/playground.js";

const KEY = "bt.checkride";
/* Your best sitting, not your last - a second attempt that goes worse should
   not erase a score you already earned. */
const best = () => { try { return Number(localStorage.getItem(KEY)) || 0; } catch { return 0; } };
const bank = (n) => { try { if (n > best()) localStorage.setItem(KEY, String(n)); } catch {} };

let teardown = null;
export function stopCheckride() { teardown?.(); teardown = null; }

export function renderCheckride(root) {
  stopCheckride();
  root.innerHTML = "";
  document.title = `The checkride · ${COURSE}`;

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "The checkride";
  const p = el("p", "cards__lede",
    "Five items. Each one asks you to go and produce a tree the course claimed would " +
    "work - not to recognise it in a list. The aircraft is the same interpreter you have " +
    "been flying all along, and every item starts fresh, so a bad one costs you nothing " +
    "but that item.");
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");
  wrap.appendChild(body);
  root.appendChild(wrap);

  let passedItems = new Set();
  brief();

  function brief() {
    stopCheckride();
    passedItems = new Set();
    body.innerHTML = "";

    const unread = LESSONS.filter((l) => !chapterDone(l.id)).length;
    if (unread) {
      body.appendChild(el("p", "cards__note",
        `${unread} of the course's ${LESSONS.length} chapters are not complete yet. Nothing stops ` +
        `you sitting it now, but every item below is drawn from one of them.`));
    }

    const list = el("table", "index exam__list");
    list.innerHTML = "<thead><tr><th>Item</th><th>Task</th><th>From</th></tr></thead>";
    const tb = el("tbody");
    EXAM.forEach((t) => {
      const tr = el("tr");
      tr.innerHTML =
        `<td class="c-item">${String(t.n).padStart(2, "0")}</td>` +
        `<td>${t.name}</td>` +
        `<td class="c-rem">Chapter ${String(t.ch).padStart(2, "0")} · ${LESSONS[t.ch - 1].title}</td>`;
      tb.appendChild(tr);
    });
    list.appendChild(tb);
    body.appendChild(list);

    const go = el("button", "cards__go", `<span>Begin the checkride</span>${mark()}`);
    go.type = "button";
    go.style.marginTop = "26px";
    go.onclick = () => sit(0);
    body.appendChild(go);
  }

  function sit(i) {
    stopCheckride();
    if (i >= EXAM.length) { report(); return; }
    const item = EXAM[i];
    body.innerHTML = "";

    const bar = el("div", "exam__bar",
      `<span>Item ${String(item.n).padStart(2, "0")}</span>` +
      `<span class="exam__score">score ${passedItems.size} of ${EXAM.length}</span>` +
      `<span class="exam__dots">${EXAM.map((_, n) =>
        `<i class="${passedItems.has(n) ? "done" : ""}${n === i ? " now" : ""}"></i>`).join("")}</span>`);
    body.appendChild(bar);
    body.appendChild(el("p", "exam__name", item.name));

    const host = el("div");
    body.appendChild(host);

    const result = el("p", "cards__note", "Judge this tree once you think it is ready.");
    body.appendChild(result);

    const row = el("div", "cards__acts");
    const judgeBtn = el("button", "exam__next", "Judge this tree");
    judgeBtn.type = "button";
    const scoreLabel = () => { bar.querySelector(".exam__score").textContent = `score ${passedItems.size} of ${EXAM.length}`; };
    const markPassed = () => {
      if (passedItems.has(i)) return;
      passedItems.add(i);
      scoreLabel();
      bar.querySelectorAll(".exam__dots i")[i].classList.add("done");
    };
    judgeBtn.onclick = () => {
      const ta = host.querySelector("textarea");
      const { passed, reason } = judge(item, ta ? ta.value : item.starter);
      result.textContent = passed ? "Met." : `Not met: ${reason}.`;
      if (passed) markPassed();
    };
    const next = el("button", "cards__go2", `<span>${i === EXAM.length - 1 ? "Finish" : "Next item"}</span>${mark()}`);
    next.type = "button";
    next.onclick = () => sit(i + 1);
    row.append(judgeBtn, next);
    body.appendChild(row);

    teardown = mountPlayground(host, {
      world: "drone", scenario: item.scenario, tree: item.starter, editor: true, hazards: [],
      script: item.script, brief: item.brief, goal: { test: item.pass, done: "Item met." },
    }, { onDone: markPassed });
  }

  function report() {
    stopCheckride();
    body.innerHTML = "";
    bank(passedItems.size);
    const d = el("div", "card card--done");
    d.innerHTML =
      `<div class="card__cap"><span>Result</span><span>${passedItems.size} of ${EXAM.length}</span></div>` +
      `<div class="card__q">Checkride complete.</div>` +
      `<div class="card__a">${didWhat(passedItems)}</div>`;
    body.appendChild(d);
    const again = el("button", "cards__go2", `<span>Sit it again</span>${mark()}`);
    again.type = "button";
    again.onclick = brief;
    const home = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`);
    home.href = "#";
    const acts = el("div", "cards__acts");
    acts.append(home, again);
    body.appendChild(acts);
  }
}

/* What the card may say you did. Built from the items actually passed, because
   telling a reader who scored nothing that they followed a moving goal is the
   one thing a judged exam may not do. */
const DID = [
  "wrote a delivery that came home and landed",
  "cut a delivery for a battery and got the drone down alive",
  "got out of a no fly zone inside thirty ticks",
  "followed a goal that moved after you launched",
  "knew when memory was the right answer",
];
function didWhat(passed) {
  const did = DID.filter((_, i) => passed.has(i));
  if (!did.length) return "Nothing met this time. Every item is still open, and the trees are still yours to write.";
  const list = did.length === 1 ? did[0] : `${did.slice(0, -1).join(", ")} and ${did[did.length - 1]}`;
  return `You ${list}. None of that was a multiple choice question.`;
}

/* The way in, at the foot of the index. */
export function checkrideStrip() {
  const n = best();
  const a = el("a", "catalogue catalogue--exam",
    `<span class="catalogue__t">The checkride</span>` +
    `<span class="catalogue__n">${EXAM.length} items, judged · ` +
    (n ? `best ${n} of ${EXAM.length}` : "not yet sat") + `</span>` +
    mark());
  a.href = "#checkride";
  return a;
}
