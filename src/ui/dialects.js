/* The lookup appendix: one concept per row, one dialect per column, every
   column sourced. Not a lesson, not numbered, never fed to the deck. */
import DIAL from "../../content/dialects.json";
import SRC from "../../content/sources.json";
import { COURSE } from "../data/lessons.js";
import { el, mark } from "./util.js";

/* Small counts are spelled out in prose, as everywhere else in the course. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n) => WORDS[n] ?? String(n);

export function renderDialects(root) {
  root.innerHTML = "";
  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  head.innerHTML = `<h1 class="t-display">Dialects</h1><p class="cards__lede">The same ${words(DIAL.rows.length)} ideas in ${words(DIAL.columns.length)} vocabularies. ` +
    `Every column names the document it was read from. Where a tool changes the meaning and not just the word, the cell says so.</p>`;
  wrap.appendChild(head);
  const t = el("table", "index dialects");
  t.innerHTML = `<thead><tr><th>Concept</th>${DIAL.columns.map((c) =>
    `<th>${c.title}<br><a class="dial__src" href="${SRC.sources[c.src].url}" target="_blank" rel="noopener">${SRC.sources[c.src].grade}</a></th>`).join("")}</tr></thead>`;
  const tb = el("tbody");
  DIAL.rows.forEach((r) => {
    const tr = el("tr");
    tr.innerHTML = `<td class="c-rem">${r.concept}</td>${DIAL.columns.map((c) => `<td>${r[c.id]}</td>`).join("")}`;
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  const scroll = el("div", "dial__wrap");
  scroll.appendChild(t);
  wrap.appendChild(scroll);
  const back = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`); back.href = "#";
  wrap.appendChild(back);
  root.appendChild(wrap);
  document.title = `Dialects · ${COURSE}`;
}

export function dialectsStrip() {
  const a = el("a", "catalogue",
    `<span class="catalogue__t">Dialects</span><span class="catalogue__n">${DIAL.rows.length} concepts · ${DIAL.columns.length} vocabularies</span>` + mark());
  a.href = "#dialects";
  return a;
}
