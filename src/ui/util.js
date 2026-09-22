export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};

/* Every other mark in this world is drawn - the revision triangle, the CG
   symbol, the force arrowheads. A typed "→" is a different object at a
   different weight that no longer matches them, so the interface arrows are
   drawn too, with the same flat tail and solid head the figures use. */
export const mark = (dir = "right") =>
  dir === "left"
    ? `<svg class="mk" viewBox="0 0 18 10" aria-hidden="true"><path class="mk-s" d="M18 5 H6"/><path class="mk-h" d="M7 1 L0 5 L7 9 Z"/></svg>`
    : `<svg class="mk" viewBox="0 0 18 10" aria-hidden="true"><path class="mk-s" d="M0 5 H12"/><path class="mk-h" d="M11 1 L18 5 L11 9 Z"/></svg>`;

/* The raw store, and only the raw store. What an entry means - which steps a
   chapter asks for, which of them are done - is steps.js's business, so this
   file stays free of content data. */
const KEY = "fd.progress";
export const progress = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
};
export const saveProgress = (p) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
};

/* The plate has two sides. Positive is ink on paper; negative is the same
   drawing on a light table. Auto follows the operating system. */
const TKEY = "fd.plate";
export function applyPlate(mode) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-plate");
  else root.setAttribute("data-plate", mode);
}
/* Light is the default, not the system setting. This is a drawing on index
   stock; the negative plate is the alternate reading of it, and a reader whose
   OS happens to be dark should still meet the document the way it is drawn. */
export function currentPlate() {
  return localStorage.getItem(TKEY) || "positive";
}
export function cyclePlate() {
  const order = ["positive", "negative", "auto"];
  const next = order[(order.indexOf(currentPlate()) + 1) % order.length];
  try { localStorage.setItem(TKEY, next); } catch {}
  applyPlate(next);
  return next;
}
