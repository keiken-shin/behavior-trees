/* The index is the drawing: the course as a tree, one chapter per leaf,
   authored in diagrams.js from LESSONS so a renamed chapter cannot leave a
   stale label. Beneath it, the parts table with progress. */
import { LESSONS, PARTS, lessonsIn, COURSE } from "../data/lessons.js";
import { indexTree } from "../data/diagrams.js";
import { el } from "./util.js";
import { chapterDone, doneCount, stepsFor } from "./steps.js";
import { catalogueStrip } from "./cards.js";
import { checkrideStrip } from "./checkride.js";
import { dialectsStrip } from "./dialects.js";
import { creditsStrip } from "./credits.js";

const chapterNo = (les) => LESSONS.indexOf(les) + 1;

export function renderHome(root) {
  root.innerHTML = "";
  PARTS.forEach((part) => {
    const lessons = lessonsIn(part.n);
    if (!lessons.length) return;
    const lede = el("div", "home__lede");
    const h = el(part.n === 1 ? "h1" : "h2", "t-display");
    h.textContent = `${part.title}, taken apart`;
    const p = el("p"); p.textContent = part.lede;
    lede.append(h, p);
    const plate = el("div", "home__plate");
    plate.innerHTML = indexTree(lessons);
    /* Done chapters are filled Success on the index tree: the one place the
       course lets a status colour mean "you did this". */
    lessons.forEach((les) => { if (chapterDone(les.id)) plate.querySelector(`a[href="#${les.id}"] g`)?.classList.add("st-ok"); });
    root.append(lede, plate);
    /* Never below reading size (9 px labels, the graph view's rule): on a
       phone the tree keeps that width and scrolls sideways, opened on its root;
       the table below lists the same chapters. */
    const svg = plate.querySelector("svg");
    svg.style.minWidth = `${svg.viewBox.baseVal.width * 0.75}px`;
    plate.scrollLeft = (plate.scrollWidth - plate.clientWidth) / 2;

    const table = el("table", "index");
    table.innerHTML = "<thead><tr><th>Item</th><th>Lesson</th><th>Remarks</th><th></th></tr></thead>";
    const tb = el("tbody");
    lessons.forEach((les) => {
      const complete = chapterDone(les.id);
      const n = doneCount(les.id), of = stepsFor(les.id).length;
      const tr = el("tr", complete ? "done" : "");
      tr.innerHTML =
        `<td class="c-item">${String(chapterNo(les)).padStart(2, "0")}</td>` +
        `<td><a href="#${les.id}">${les.title}</a></td>` +
        `<td class="c-rem">${les.oneLiner}</td>` +
        `<td class="c-st">${complete ? "complete" : n ? `${n} of ${of}` : ""}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    root.append(table);
  });
  root.append(catalogueStrip(), checkrideStrip(), dialectsStrip(), creditsStrip());
  document.title = COURSE;
}
