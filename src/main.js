import "./styles/app.css";
import { LESSONS, PARTS, partOf, COURSE } from "./data/lessons.js";
import { renderHome } from "./ui/home.js";
import { renderLesson, stopLesson } from "./ui/lesson.js";
import { renderCards } from "./ui/cards.js";
import { renderCheckride, stopCheckride } from "./ui/checkride.js";
import { renderDialects } from "./ui/dialects.js";
import { renderCredits } from "./ui/credits.js";
import { el, applyPlate, currentPlate, cyclePlate } from "./ui/util.js";
import { logoSvg, faviconDataUri } from "./ui/logo.js";

const app = document.getElementById("app");

/* The zone grid: letters down the sides, numbers across. Generated, because a
   hand-placed index is the kind of thing that rots the first time the layout
   changes. */
function zoneRails() {
  const cols = "1 2 3 4 5 6 7 8 9 10 11 12".split(" ");
  const rows = "A B C D E F G H".split(" ");
  const make = (cls, items) => {
    const z = el("div", `zone ${cls}`);
    items.forEach((t) => z.appendChild(el("i", "", t)));
    return z;
  };
  document.body.append(
    make("zone--top", cols), make("zone--bottom", cols),
    make("zone--left", rows), make("zone--right", rows),
  );
}

function header() {
  const bar = el("header", "bar");
  /* The wordmark carries the whole course. Built from PARTS so it can never
     drift from what the course actually contains. */
  const home = el("a", "bar__title", logoSvg({ size: 20 }) + `<span>${COURSE}</span>`);
  home.href = "#";
  const meta = el("span", "bar__meta");
  const spacer = el("span", "bar__spacer");
  /* An explicit way out of a chapter. The wordmark has always linked home, but
     a wordmark reads as a title rather than a control, so mid-lesson there was
     no visible way back to the index. */
  const index = el("a", "bar__ix", "Index");
  index.href = "#";
  /* Labelled light / dark / auto, not positive / negative. The plate metaphor is
     right for the design system and wrong for a control: nobody can tell which
     way round it goes without pressing it, and it reads as inverted about half
     the time. The internal names stay positive/negative. */
  const plate = el("button", "", "");
  plate.type = "button";
  plate.title = "Light plate, negative plate, or follow the system";
  const setLabel = (m) => {
    plate.textContent = m === "auto" ? "plate: auto" : m === "positive" ? "plate: light" : "plate: dark";
  };
  setLabel(currentPlate());
  plate.onclick = () => setLabel(cyclePlate());
  bar.append(home, spacer, meta, index, plate);
  return { bar, meta, index };
}

function route({ meta, index }) {
  const id = location.hash.replace(/^#/, "");
  const i = LESSONS.findIndex((l) => l.id === id);
  index.hidden = id === "";           // nothing to go back to from the index itself
  /* A new plate starts at its top. The hashes here name routes, not anchors, so
     the browser finds no element to jump to and simply leaves the scroll where
     it was. Instant, not smooth: `html` carries scroll-behavior: smooth for
     in-page jumps, and inherited here it would animate the whole length of the
     document you are leaving before the one you asked for appears. */
  scrollTo({ top: 0, behavior: "instant" });
  stopCheckride();                    // never leave a checkride running offscreen
  stopLesson();                       // nor a playground, which would sit over the next page
  if (id === "cards") {
    meta.textContent = "Revision";
    renderCards(app);
  } else if (id === "checkride") {
    /* One ride: the part has nothing to decide, unlike the flight course's two. */
    meta.textContent = "Final test";
    renderCheckride(app);
  } else if (id === "dialects") {
    /* Reference, not a chapter - so it is a route with no number, and the meta
       says which kind of page this is rather than where you are in a sequence. */
    meta.textContent = "Lookup";
    renderDialects(app);
  } else if (id === "credits") {
    meta.textContent = "Sources";
    renderCredits(app);
  } else if (i === -1) {
    meta.textContent = `${LESSONS.length} chapters`;
    renderHome(app);
  } else {
    /* Chapter numbers run 01-12 straight through, because the cross-references
       are spoken as numbers - a chapter that says "you drew this in 9" has to
       mean the ninth thing in the course. The part name is carried alongside,
       named only when there is more than one part to be in. */
    const part = PARTS.find((p) => p.n === partOf(id));
    const n = `Chapter ${String(i + 1).padStart(2, "0")} of ${LESSONS.length}`;
    meta.textContent = PARTS.length > 1 && part ? `${part.title} · ${n}` : n;
    renderLesson(app, id);
  }
}

/* Turning to another plate, rather than the old one being replaced under you.
   The browser does the crossfade from two snapshots it takes either side of the
   render, so there is no second copy of the page in the DOM and nothing to
   clean up if it is interrupted. Skipped outright when the reader asked for
   less motion - the global reduced-motion rule cannot reach ::view-transition
   pseudo-elements, so this has to be a decision rather than a duration. */
const still = matchMedia("(prefers-reduced-motion: reduce)");
function navigate() {
  if (!document.startViewTransition || still.matches) return route(h);
  const t = document.startViewTransition(() => route(h));
  /* A skipped transition rejects `ready`: the document is not being rendered,
     or a second navigation arrived before this one settled - which a reader
     clicking through chapters quickly will do. The page has already changed by
     then and there is nothing to recover, so this only keeps a routine outcome
     from being reported as an unhandled rejection. */
  t.ready.catch(() => {});
}

applyPlate(currentPlate());
// The mark doubles as the favicon; one geometry, no extra request, no raster.
document.querySelector('link[rel="icon"]')?.setAttribute("href", faviconDataUri());
/* The browser restores the old scroll offset on reload, but this document is
   empty at that moment and grows under it, so the offset it restores belongs to
   nothing. route() puts every page at its top instead. */
history.scrollRestoration = "manual";
zoneRails();
const h = header();
document.querySelector(".plate-frame").prepend(h.bar);
addEventListener("hashchange", navigate);
route(h);

/* Uncover once the type is real AND the plate has been up long enough to have
   been seen. fonts.ready settles either way - loaded or failed - so it cannot
   strand the page behind the cover; the floor is what makes the loader a moment
   rather than a flicker, since on a warm cache the fonts land in a handful of
   milliseconds and an uncovering that fast reads as a glitch. It costs a held
   beat on a fast load, which is the trade being asked for.
   Only a full page load raises the cover at all. Route changes have their own
   transition and never see it. */
const COVER_FLOOR = 900;
Promise.all([
  document.fonts.ready,
  new Promise((done) => setTimeout(done, COVER_FLOOR)),
]).then(() => {
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.classList.add("gone");
  /* Removed on a timer rather than on transitionend, which is not guaranteed to
     arrive: a page whose transitions are not advancing - loaded in a background
     tab, or anywhere frames are not being produced - never fires it, and the one
     thing an opaque full-screen cover may not do is outlive its reason. */
  setTimeout(() => boot.remove(), 300);
});
