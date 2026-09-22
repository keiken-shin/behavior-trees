import { LESSONS, PARTS, COURSE } from "../data/lessons.js";
import { VIDEOS } from "../data/videos.js";
import DIAGRAMS from "../data/diagrams.js";
import { el, mark } from "./util.js";
import { stepsFor, doneSteps, markStep } from "./steps.js";
import { openPlayer, closePlayer } from "./player.js";
import { PLAYS } from "../data/plays.js";
import { mountPlayground } from "../play/playground.js";

/* Drawn, like every other mark here. A tick and a cross as stroked paths hold
   their contrast against paper in either plate, where a coloured letter on a
   coloured fill would fail it in one of them. */
const TICK = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M1 7 L5.5 11.5 L14 1.5"/></svg>`;
const CROSS = `<svg viewBox="0 0 15 13" aria-hidden="true"><path d="M2.5 1.5 L12.5 11.5 M12.5 1.5 L2.5 11.5"/></svg>`;

let teardown = null;

/* The counterpart to stopCheckride(). Rendering another lesson tears the last
   one down, but leaving for the index or the revision cards never did - so a
   sandbox opened and then escaped with the browser's Back button stayed live,
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
  const benchWrap = el("div", "bench-wrap");
  const bench = el("div", "bench");
  benchWrap.appendChild(bench);

  /* ── the bench: one figure at a time, swapped by what you are reading.
     Only on wide screens - a narrow one gets a plate per reference instead. ── */

  const figIds = les.flow.filter((b) => b.t === "fig").map((b) => b.id);
  let activeFig = null;
  let cur = null;      // the bench's controller, on wide screens
  let pinned = false;  // a manual tab click holds until the figure changes

  /* One figure, its step strip, and the controls over both. The bench uses one
     of these; on a narrow screen every figure reference gets its own, because a
     single bench above the reading has scrolled 300px out of sight by the time
     you reach the paragraph that refers to it. */
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
    const c = { svg, total, label, btns, plate: plateName, at: 0, pinned: false };
    if (total > 1) {
      for (let n = 1; n <= total; n++) {
        const b = el("button", "", String(n));
        b.type = "button";
        b.setAttribute("aria-label", `${plateName}, step ${n} of ${total}`);
        b.onclick = () => { c.pinned = true; pinned = true; setStepOn(c, n); };
        btns.push(b);
        strip.appendChild(b);
      }
    }
    if (total > 1) strip.appendChild(el("span", "sheets__hint", `tap 1 to build it up`));
    /* Opens COMPLETE. The prose right after a figure reference describes the
       finished drawing, so the finished drawing is what has to be there; the
       tabs replay how it got that way. */
    setStepOn(c, total);
    return c;
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

  /* Setting the step is separate from swapping the figure, because reading
     scroll drives the first and the figure references drive the second.

     "Step", not "sheet". In a real parts catalogue Sheet 2 of 4 is a different
     page carrying different content; these are one drawing at successive stages
     of its own assembly, each keeping everything before it and adding one thing.
     The word promised pagination and delivered a build, and readers reasonably
     concluded they were missing three other figures. */
  const setStep = (n) => cur && setStepOn(cur, n);

  /* The strip names the PLATE, not just the step. Seven of the twelve lessons
     give every figure the same step count, so a strip that only ever read
     "Step 4 of 4" looked frozen while scrolling swapped the drawing beneath it.
     The plate number is also what ties a figure back to its "Fig. 2-1"
     reference in the reading. */
  const plateName = (figId) => `Fig. ${i + 1}-${figIds.indexOf(figId) + 1}`;

  function showFigure(figId) {
    if (figId === activeFig || !DIAGRAMS[figId]) return;
    activeFig = figId;
    pinned = false;
    cur = mountFigure(bench, figId, plateName(figId));
  }

  /* ── title block ──
     Its own element, not the first two children of the reading column, so that
     on a phone the bench can sit between the title and the reading. Inside the
     column the bench could only go above everything, and the first viewport
     then named no lesson. */
  const head = el("div", "lesson__head");
  const title = el("h1", "t-display lesson__title");
  title.textContent = les.title;
  const sub = el("p", "lesson__sub");
  sub.textContent = les.oneLiner;
  head.append(title, sub);

  let figSeen = 0;
  // Kept so the completion list can send the reader to the thing it is asking for.
  let vidsNode = null, checkNode = null, playNode = null;
  let target = col;          // flow blocks land here until a figure opens a section
  les.flow.forEach((b) => {
    let node = null;
    switch (b.t) {
      case "p": node = el("p", "", b.text); break;
      case "fact": node = el("p", "fact", b.text); break;
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
          `<p class="myth__truth">${b.truth}</p></div>`;
        break;

      /* On a wide screen a figure in the text is a REFERENCE and the plate lives
         on the bench beside it. On a narrow one there is no beside, so the plate
         is rendered here - see the section wrapper below. */
      case "fig": {
        figSeen++;
        node = el("div", "figref");
        node.dataset.fig = b.id;
        node.innerHTML =
          `<div class="figref__line">` +
            `<span class="t-label">Fig. ${i + 1}-${figSeen}</span>` +
            `<span class="figref__rule"></span>` +
            `<span class="figref__hint">shown on the bench ${mark()}</span>` +
          `</div>`;
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

      /* The playground, inline. No dialog: there is no engine to download and
         the reader edits the tree while reading about it. */
      case "play": {
        const cfg = PLAYS[b.id];
        if (!cfg) { console.error("play block with no configuration:", b.id); break; }
        node = el("div", "play");
        node.appendChild(el("div", "play__cap", `<span>Playground</span><span>Ch ${String(i + 1).padStart(2, "0")} · ${b.id}</span>`));
        const host = el("div", "play__host");
        node.appendChild(host);
        const stop = mountPlayground(host, cfg, { onDone: () => markStep(les.id, "play") });
        const prev = teardown;
        teardown = () => { stop(); prev?.(); };
        playNode = node;
        break;
      }

      /* Points back into Part I. The chapter title is read from LESSONS rather
         than written here, so renaming a chapter cannot leave a link describing
         the old one - the same reason the deck derives its cards instead of
         holding copies. */
      case "ref": {
        /* NOT `target` - the enclosing scope already has a `let target` that the
           post-switch append uses. Shadowing it here is legal and works and is a
           merge landmine. */
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
    /* A figure opens a SECTION that runs until the next figure. It exists so the
       inline plate has something to stick inside: `position: sticky` is bounded
       by its parent, and a plate whose parent is only as tall as itself has no
       range at all - it read as sticky and behaved as static, sliding straight
       off the top. The section is that range, and it ends exactly where the
       figure stops being what you are reading about. */
    if (b.t === "fig") {
      target = el("div", "fig-section");
      target.dataset.fig = b.id;
      col.appendChild(target);
      target.appendChild(node);
      target.appendChild(el("div", "figref__plate"));
      return;
    }
    if (node) target.appendChild(node);
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
     The apply surface and the footer nav sit OUTSIDE the two-column grid, as
     plain blocks beneath it. That placement is the whole fix.

     Inside the grid they were a third row under a sticky element, and a sticky
     element overhangs the row after it rather than stopping at it - so the
     launch control was drawn straight across the figure's caption. Painting it
     over the bench made the collision opaque instead of removing it. Out here
     the grid has ended, the bench has nowhere left to reach, and both can have
     the full width honestly.

     Order matters too: read the chapter, fly it, then leave. The footer nav used
     to sit above the sandbox inside the reading column, which put "next chapter"
     before the thing the chapter was building toward. */
  const apply = el("div", "apply");
  const after = el("div", "after");

  /* ── what this chapter still wants ──
     The rule used to be invisible and, worse, wrong: one click on any stage-check
     option - right or wrong - silently marked the whole chapter complete, while
     watching the clip and flying the sandbox counted for nothing at all. A reader
     who did the work and watched the index stay empty had no way to find out why.

     So the requirements are stated where the chapter ends, they tick over as they
     are met, and each row is a way back to the thing it is asking for. It is
     derived from the chapter's own content in steps.js, not declared here. */
  const steps = stepsFor(les.id);
  const stepsBox = el("div", "steps");
  const jump = { video: () => vidsNode, check: () => checkNode, play: () => playNode };
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
  /* Two of the three steps are marked from inside a modal that covers this page,
     so the list cannot repaint itself on click - it listens for the store instead.
     Chained onto whatever teardown the flow already set (the playground, if this
     chapter has one) - it must not be the block that stops its setInterval. */
  document.addEventListener("bt:progress", paintSteps);
  { const prev = teardown; teardown = () => { document.removeEventListener("bt:progress", paintSteps); prev?.(); }; }

  if (steps.length) { paintSteps(); after.appendChild(stepsBox); }
  after.append(apply, foot);
  wrap.append(head, col, benchWrap);
  root.append(wrap, after);

  showFigure(figIds[0]);

  /* Scroll's only remaining job is deciding WHICH figure the bench holds on a
     wide screen. Stepping belongs to the reader.

     Driving the build off scroll read well as an idea and failed on the content.
     A chapter is about 330 words, so a figure's own section passes in a couple
     of flicks and four steps blur past unread. The strip opens complete, says
     what it is, and waits to be tapped. */
  const sections = [...col.querySelectorAll(".fig-section")];
  if (sections.length) {
    const NARROW = matchMedia("(max-width: 1020px)");

    /* Narrow screens have no bench, so every section carries its own plate.
       Mounted on first narrow use, not up front: on a wide screen these are
       display:none, and rendering SVGs nobody will see is work for nothing. */
    const inline = [];
    const mountInline = () => {
      if (inline.length) return;
      sections.forEach((s) => inline.push(
        mountFigure(s.querySelector(".figref__plate"), s.dataset.fig, plateName(s.dataset.fig))));
    };

    const track = () => {
      if (NARROW.matches) return mountInline();
      const line = scrollY + innerHeight * 0.34;
      const tops = sections.map((s) => s.getBoundingClientRect().top + scrollY);
      let k = 0;
      for (let n = 0; n < tops.length; n++) if (tops[n] <= line) k = n;
      showFigure(sections[k].dataset.fig);
    };
    addEventListener("scroll", track, { passive: true });
    addEventListener("resize", track, { passive: true });
    track();
    const prev = teardown;
    teardown = () => {
      removeEventListener("scroll", track);
      removeEventListener("resize", track);
      prev?.();
    };
  }

  document.title = `${les.title} · ${PARTS.find((p) => p.n === (les.part ?? 1))?.title ?? COURSE}`;
  window.scrollTo(0, 0);
}
