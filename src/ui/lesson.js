import { LESSONS, PARTS, COURSE } from "../data/lessons.js";
import { VIDEOS } from "../data/videos.js";
import DIAGRAMS from "../data/diagrams.js";
import { el, mark } from "./util.js";
import { stepsFor, doneSteps, markStep } from "./steps.js";
import { openPlayer, closePlayer } from "./player.js";
import { sceneConfig } from "../data/scenes.js";
import SOURCE_FILE from "../../content/sources.json";
import { mountPlayground } from "../play/playground.js";

/* Drawn, like every other mark here. A tick and a cross as stroked paths hold
   their contrast against paper in either plate, where a coloured letter on a
   coloured fill would fail it in one of them. */
const TICK = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M1 7 L5.5 11.5 L14 1.5"/></svg>`;
const CROSS = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M2.5 1.5 L12.5 11.5 M12.5 1.5 L2.5 11.5"/></svg>`;

/* Every fact and myth already names the source it rests on, and until now that
   id only ever gated the build. Shown here as a quiet superscript: the id the
   sources page lists it under, the source's own title on hover, and a way to
   the page that carries all of them. Deliberately not a status colour - a
   citation is not an answer. */
const SOURCES = SOURCE_FILE.sources;
const cite = (id) => {
  const s = SOURCES[id];
  if (!s) return "";
  return `<sup class="cite"><a href="#credits/${id}" title="${s.title.replace(/"/g, "&quot;")}">${id}</a></sup>`;
};

let teardown = null;

/* The counterpart to stopCheckride(). Rendering another lesson tears the last
   one down, but leaving for the index or the revision cards never did - so a
   playground opened and then escaped with the browser's Back button stayed live,
   and once it became a modal it stayed live ON TOP of wherever you went. */
export function stopLesson() { teardown?.(); teardown = null; }

export function renderLesson(root, id) {
  teardown?.();
  teardown = null;
  // Navigating away while a clip is open must not leave it playing offscreen.
  closePlayer();

  const i = LESSONS.findIndex((l) => l.id === id);
  const les = LESSONS[i];
  root.innerHTML = "";

  const wrap = el("div", "lesson");
  const col = el("div", "col");

  /* One figure, inline, and the step strip over it. A narrow screen and a wide
     one now render the same markup - there is no bench left to differ from. */
  function mountFigure(host, figId, plateName) {
    host.innerHTML = `<div class="fig-host">${DIAGRAMS[figId]()}</div><div class="sheets"></div>`;
    const svg = host.querySelector("svg");
    const strip = host.querySelector(".sheets");
    const total = svg.querySelectorAll('g[class^="s"]').length;
    const label = el("span", "sheets__lab", "");
    strip.appendChild(label);
    const btns = [];
    /* The strip has to SAY it is steppable. Driving the build off scroll instead
       looked clever and failed on the content: a chapter is ~330 words, so a
       section passes in a couple of flicks and four steps blur past with no
       chance to read any of them. Clicking is the reader's own clock. */
    const c = { svg, total, label, btns, plate: plateName, at: 0 };
    if (total > 1) {
      for (let n = 1; n <= total; n++) {
        const b = el("button", "", String(n));
        b.type = "button";
        b.setAttribute("aria-label", `${plateName}, step ${n} of ${total}`);
        b.onclick = () => setStepOn(c, n);
        btns.push(b);
        strip.appendChild(b);
      }
    }
    if (total > 1) strip.appendChild(el("span", "sheets__hint", `tap 1 to build it up`));
    /* Opens COMPLETE. The prose right after a figure reference describes the
       finished drawing, so the finished drawing is what has to be there; the
       tabs replay how it got that way. */
    setStepOn(c, total);
  }

  function setStepOn(c, n) {
    const v = Math.max(1, Math.min(c.total, n));
    if (v === c.at) return;
    c.at = v;
    c.svg.setAttribute("data-state", String(v));
    c.label.textContent = `${c.plate} · Step ${v} of ${c.total}`;
    c.btns.forEach((x, j) => {
      const n1 = j + 1;
      x.setAttribute("aria-pressed", n1 === v ? "true" : "false");
      x.dataset.at = n1 < v ? "done" : n1 === v ? "now" : "todo";
    });
  }

  /* ── title block ── */
  const head = el("div", "lesson__head");
  const title = el("h1", "t-display lesson__title");
  title.textContent = les.title;
  const sub = el("p", "lesson__sub");
  sub.textContent = les.oneLiner;
  head.append(title, sub);

  let figSeen = 0, sceneSeen = 0, sceneNode = null;
  // Kept so the completion list can send the reader to the thing it is asking for.
  let vidsNode = null, checkNode = null;
  les.flow.forEach((b) => {
    let node = null;
    switch (b.t) {
      case "p": node = el("p", "", b.text); break;
      case "fact": node = el("p", "fact", b.text + cite(b.src)); break;
      case "concrete": node = el("p", "concrete", b.text); break;
      case "aside": node = el("p", "aside", b.text); break;

      /* No kicker label above the claim - the craft floor bans it outright. The
         flag is carried by a drawn revision triangle, which is this world's own
         mark for "this has been changed / do not trust the previous issue". */
      case "myth":
        node = el("div", "myth");
        node.innerHTML =
          `<div class="myth__b"><p class="myth__claim">` +
          `<svg class="revmark" viewBox="0 0 14 12" aria-hidden="true"><path d="M7 0 L14 12 L0 12 Z"/></svg>` +
          `<span>“${b.claim}”</span></p>` +
          `<p class="myth__truth">${b.truth}${cite(b.src)}</p></div>`;
        break;

      /* A drawing, inline, where the flow places it, with its own step strip.
         Only three plates survive the move to scenes: the ones that are not
         runs (the Nav2 tree, the stack, back chaining). */
      case "fig": {
        if (!DIAGRAMS[b.id]) { console.error("fig block with no builder:", b.id); break; }
        figSeen++;
        node = el("div", "figure-inline");
        node.appendChild(el("div", "figref__line",
          `<span class="t-label">Fig. ${i + 1}-${figSeen}</span><span class="figref__rule"></span>`));
        const plate = el("div", "figref__plate");
        node.appendChild(plate);
        mountFigure(plate, b.id, `Fig. ${i + 1}-${figSeen}`);
        break;
      }

      case "formula":
        node = el("div", "formula plate");
        node.innerHTML =
          `<div class="formula__eq" role="math" aria-label="${b.plain}">${b.html}</div>` +
          (b.terms?.length
            ? `<dl>${b.terms.map(([s, m]) => `<dt>${s}</dt><dd>${m}</dd>`).join("")}</dl>`
            : "");
        break;

      /* A live scene: the interpreter on the real world, told as one live run,
         then handed over. It sits exactly where the flow put it, which is right after
         the paragraph that set it up. */
      case "scene": {
        let cfg;
        try { cfg = sceneConfig(b.id); } catch (e) { console.error(e.message); break; }
        sceneSeen++;
        node = el("div", "scene");
        node.appendChild(el("div", "scene__cap",
          `<span>Scene ${i + 1}-${sceneSeen}</span><span>${cfg.steps.length ? "live, then yours" : "yours"}</span>`));
        const host = el("div", "scene__host");
        node.appendChild(host);
        const stop = mountPlayground(host, cfg, { onDone: () => markStep(les.id, "scene") });
        const prev = teardown;
        teardown = () => { stop(); prev?.(); };
        if (!sceneNode) sceneNode = node;
        break;
      }

      /* Points back into Part I. The chapter title is read from LESSONS rather
         than written here, so renaming a chapter cannot leave a link describing
         the old one - the same reason the deck derives its cards instead of
         holding copies. */
      case "ref": {
        const dest = LESSONS[b.ch - 1];
        if (!dest) break;
        node = el("div", "xref");
        node.innerHTML =
          `<a href="#${dest.id}"><span class="xref__n">` +
          `Chapter ${String(b.ch).padStart(2, "0")}</span>` +
          `<span class="xref__t">${dest.title}</span></a>` +
          `<p class="xref__y">${b.why}</p>`;
        break;
      }

      /* Videos play HERE, not on youtube.com. Sending a reader to the sidebar
         is how you lose them; the clip is part of the lesson, so it opens on a
         plate like everything else. Each card is a button, and nothing is
         requested from Google until one is pressed. */
      case "videos": {
        const list = VIDEOS[les.id] || [];
        if (!list.length) break;
        node = el("div", "vids");
        node.appendChild(el("h2", "t-h2", "Watch"));
        list.forEach((v) => {
          const b = el("button", "vid");
          b.type = "button";
          b.innerHTML =
            `<span class="vid__play" aria-hidden="true"><svg viewBox="0 0 12 14"><path d="M1 1 L11 7 L1 13 Z"/></svg></span>` +
            `<span class="vid__t"><b>${v.title}</b>` +
            `<span class="m">${v.channel} · ${v.duration}</span>` +
            (v.note ? `<span class="n">${v.note}</span>` : "") + `</span>`;
          b.onclick = () => openPlayer(v, list, les.id);
          node.appendChild(b);
        });
        vidsNode = node;
        break;
      }

      /* An answer key: keyed rows, and a drawn mark for the result.
         The strip on top is a plate caption, not a kicker - it carries an
         identifier and a reference number, the way a manual heads an inspection
         block. "Checkride" is the ride an examiner sits in on; it names the
         thing rather than describing it, which is the difference. */
      case "check": {
        node = el("div", "check");
        /* "Stage check" is the periodic progress test during training; the
           checkride is the final practical test with an examiner. Reserving the
           second word for the finale is both correct and worth the anticipation. */
        node.appendChild(el("div", "check__cap",
          `<span>Stage Check</span><span>Ch ${String(i + 1).padStart(2, "0")} · ${b.options.length} options</span>`));
        node.appendChild(el("p", "check__q", b.q));   // the question is the heading
        const why = el("p", "check__why", `<strong>Why:</strong> ${b.why}`);
        why.hidden = true;
        const btns = [];
        /* Settling the check - the tick on the answer, the cross on what was
           picked, the reasoning shown, every option spent. Its own function
           because a chapter you have already passed opens in this state rather
           than pretending to be unanswered. */
        const settle = (chosen) => {
          btns.forEach((x, j) => {
            x.disabled = true;
            const key = x.querySelector(".check__k");
            if (j === b.answer) { x.classList.add("right"); key.innerHTML = TICK; }
            else if (j === chosen) { x.classList.add("wrong"); key.innerHTML = CROSS; }
          });
          why.hidden = false;
        };
        b.options.forEach((opt, oi) => {
          const btn = el("button", "",
            `<span class="check__k" aria-hidden="true">${String.fromCharCode(65 + oi)}</span>` +
            `<span class="check__o">${opt}</span>`);
          btn.type = "button";
          btn.onclick = () => {
            settle(oi);
            /* Only a correct answer counts. Getting it wrong still reveals the
               answer and the reasoning - that is what the check is for - but the
               chapter stays open until you come back and know it. */
            if (oi === b.answer) markStep(les.id, "check");
          };
          btns.push(btn);
          node.appendChild(btn);
        });
        node.appendChild(why);
        /* Already answered correctly, so restore it. Nothing extra is stored to
           do this: the check step is only ever marked by picking the right
           option, so "answered" and "answered with b.answer" are the same fact.
           A wrong attempt is deliberately not remembered - that one is worth
           coming back to, and the reasoning is right there once you try again. */
        if (doneSteps(les.id).check) settle(b.answer);
        checkNode = node;
        break;
      }
    }
    if (node) col.appendChild(node);
  });

  // footer
  const foot = el("div", "foot");
  foot.appendChild(i > 0
    ? Object.assign(el("a", "", `${mark("left")}<span>${LESSONS[i - 1].title}</span>`), { href: "#" + LESSONS[i - 1].id })
    : Object.assign(el("a", "", `${mark("left")}<span>Index</span>`), { href: "#" }));
  // The middle of the footer was an empty spacer. It is the natural place to
  // leave the chapter, so it carries the way back to the index.
  /* Counted, not typed. It said "All 12 chapters" for as long as there were
     twelve, and the day a thirteenth shipped it became a small lie printed at
     the foot of every page. */
  const toIndex = Object.assign(
    el("a", "foot__ix", `<span>All ${LESSONS.length} chapters</span>`), { href: "#" });
  foot.appendChild(toIndex);
  if (i < LESSONS.length - 1)
    foot.appendChild(Object.assign(el("a", "", `<span>${LESSONS[i + 1].title}</span>${mark()}`),
      { href: "#" + LESSONS[i + 1].id }));

  /* ── after the chapter ──────────────────────────────────────────────────
     The footer nav sits outside the reading column, as a plain block beneath
     it, held to the text's own 68ch measure rather than the column's full
     width - see app.css's .foot rule.

     Order matters too: read the chapter, fly it, then leave. The footer nav used
     to sit above the playground inside the reading column, which put "next chapter"
     before the thing the chapter was building toward. */
  const after = el("div", "after");

  /* ── what this chapter still wants ──
     The rule used to be invisible and, worse, wrong: one click on any stage-check
     option - right or wrong - silently marked the whole chapter complete, while
     watching the clip and flying the playground counted for nothing at all. A reader
     who did the work and watched the index stay empty had no way to find out why.

     So the requirements are stated where the chapter ends, they tick over as they
     are met, and each row is a way back to the thing it is asking for. It is
     derived from the chapter's own content in steps.js, not declared here. */
  const steps = stepsFor(les.id);
  const stepsBox = el("div", "steps");
  const jump = { video: () => vidsNode, check: () => checkNode, scene: () => sceneNode };
  function paintSteps() {
    const done = doneSteps(les.id);
    const n = steps.filter((s) => done[s.key]).length;
    const all = n === steps.length;
    stepsBox.innerHTML =
      `<div class="steps__cap"><span>${all ? "Chapter complete" : "To complete this chapter"}</span>` +
      `<span>${n} of ${steps.length}</span></div>`;
    steps.forEach((s) => {
      const row = el("button", "steps__row" + (done[s.key] ? " done" : ""));
      row.type = "button";
      row.innerHTML =
        `<span class="steps__k" aria-hidden="true">${done[s.key] ? TICK : ""}</span>` +
        `<span class="steps__l">${s.label}<span class="steps__h">${s.hint}</span></span>` +
        (done[s.key] ? "" : mark());
      row.setAttribute("aria-label", `${s.label} - ${done[s.key] ? "done" : "not yet"}`);
      row.onclick = () => jump[s.key]?.()?.scrollIntoView({ block: "center", behavior: "smooth" });
      stepsBox.appendChild(row);
    });
  }
  /* One of the three steps (the clip) is marked from inside a modal that covers
     this page, so the list cannot repaint itself on click - it listens for the
     store instead. A goal met inside a scene fires the same event from right on
     this page, so the listener is still earning its keep either way.
     Chained onto whatever teardown the flow already set (a scene, if this
     chapter has one) - it must not be the block that stops its setInterval. */
  document.addEventListener("bt:progress", paintSteps);
  { const prev = teardown; teardown = () => { document.removeEventListener("bt:progress", paintSteps); prev?.(); }; }

  if (steps.length) { paintSteps(); after.appendChild(stepsBox); }
  after.append(foot);
  wrap.append(head, col);
  root.append(wrap, after);

  document.title = `${les.title} · ${PARTS.find((p) => p.n === (les.part ?? 1))?.title ?? COURSE}`;
  window.scrollTo(0, 0);
}
