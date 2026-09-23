/* SVG primitives that encode content/visual-grammar.md so every figure obeys it
   by construction. Diagrams are built as strings - simpler than DOM here, and the
   output is inspectable. Colour is never passed in; only a semantic `kind`. */

import { layout } from "../bt/layout.js";

const VB_W = 800, VB_H = 500;

/* §1 - kind → CSS class. A diagram names meaning, never colour. */
const KIND = { ok: "k-ok", fail: "k-fail", run: "k-run", tick: "k-tick", ref: "k-ref", ink: "k-ink" };
const k = (n) => KIND[n] || KIND.ink;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n = (v) => Math.round(v * 100) / 100;

/* ── marks ─────────────────────────────────────────────────────────────── */

function line(x1, y1, x2, y2, kind = "ink", cls = "") {
  return `<line class="stroke ${k(kind)} ${cls}" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
}

/* §3 - labels live in a chip on the figure, never in a legend. */
function chip(cx, cy, text, kind = "ink", { small = false } = {}) {
  const t = esc(text);
  const w = (small ? 7.0 : 8.2) * t.length + 18, h = small ? 24 : 26;
  return `<g class="chip-g"><rect class="chip" x="${n(cx - w / 2)}" y="${n(cy - h / 2)}"
    width="${n(w)}" height="${h}" rx="4"/><text class="chip-t ${small ? "sm " : ""}${k(kind)}"
    x="${n(cx)}" y="${n(cy)}">${t}</text></g>`;
}

function note(cx, cy, text, { anchor = "middle" } = {}) {
  return `<text class="note" text-anchor="${anchor}" x="${n(cx)}" y="${n(cy)}">${esc(text)}</text>`;
}

/* ── trees: shape is the kind, fill is the answer ─────────────────────────
   Textbook notation (Colledanchise and Ogren, table 1.1): Sequence is a box
   with an arrow, Fallback a box with a question mark, Parallel a box with a
   double arrow, Decorator a rhombus, Action a rounded box, Condition an
   ellipse. Custom is for a real world node we draw but do not run (Nav2). */
/* Label sizes: 12 px on a course plate, and the two smaller classes a dense
   plate may ask for. Mirrored by scripts/check-figures.mjs, which measures what
   this writes. */
const LABEL_FS = { "node-t--sm": 10, "node-t--xs": 9 };
const ADV = 0.6;                       // JetBrains Mono is monospaced
/* How much of a shape's width its label may use: a rect gets an 8 px inset, and
   an ellipse and a rhombus are narrower than their box where the text sits. */
const room = (kind, w) => (kind === "Condition" ? 0.82 * w : kind === "Decorator" ? 0.6 * w : w - 8);

/* Where to break a label that will not fit on one line: the last CamelCase
   boundary or space at or before the midpoint. Where that still leaves a line
   too wide - WouldAControllerRecoveryHelp breaks after "Would" - the break that
   makes the longer half shortest is used instead, because a two-line label that
   still overflows has bought nothing. */
function twoLines(label, max) {
  const cuts = [];
  for (let i = 1; i < label.length; i++) {
    if (label[i] === " ") cuts.push([i, 1]);
    else if (/[A-Z]/.test(label[i]) && /[a-z0-9]/.test(label[i - 1])) cuts.push([i, 0]);
  }
  if (!cuts.length) return null;
  const longest = ([i, k]) => Math.max(i, label.length - i - k);
  const before = cuts.filter(([i]) => i <= label.length / 2);
  let cut = before.length ? before[before.length - 1] : cuts[0];
  if (longest(cut) > max) for (const c of cuts) if (longest(c) < longest(cut)) cut = c;
  return [label.slice(0, cut[0]), label.slice(cut[0] + cut[1])];
}

function node(kind, cx, cy, label, { status = "idle", w = 96, h = 34, dirty = false, href = null, labelClass = "", twoLine = false } = {}) {
  const x = cx - w / 2, y = cy - h / 2;
  let shape;
  if (kind === "Condition") shape = `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(w / 2)}" ry="${n(h / 2)}"/>`;
  else if (kind === "Decorator") shape = `<polygon points="${n(cx)},${n(y)} ${n(x + w)},${n(cy)} ${n(cx)},${n(y + h)} ${n(x)},${n(cy)}"/>`;
  else if (kind === "Action") shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}" rx="8"/>`;
  else if (kind === "Custom") shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}"/><rect x="${n(x + 3)}" y="${n(y + 3)}" width="${w - 6}" height="${h - 6}"/>`;
  else shape = `<rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}"/>`;
  const fs = LABEL_FS[labelClass] ?? 12;
  const tc = `node-t${labelClass ? ` ${labelClass}` : ""}`;
  const max = room(kind, w) / (ADV * fs);
  /* Two tspans, each with its own absolute x and y rather than a dy: the same
     numbers a browser lays out are then the numbers the figure check reads. */
  const parts = twoLine && label.length > max ? twoLines(label, max) : null;
  const words = parts
    ? `<text class="${tc}" x="${n(cx)}" y="${n(cy)}">` +
      `<tspan class="${tc}" x="${n(cx)}" y="${n(cy - fs * 0.6)}">${esc(parts[0])}</tspan>` +
      `<tspan class="${tc}" x="${n(cx)}" y="${n(cy + fs * 0.6)}">${esc(parts[1])}</tspan></text>`
    : `<text class="${tc}" x="${n(cx)}" y="${n(cy)}">${esc(label)}</text>`;
  const body = `<g class="node node--${kind.toLowerCase()} st-${status}${dirty ? " dirty" : ""}">${shape}${words}</g>`;
  return href ? `<a href="${esc(href)}">${body}</a>` : body;
}

/* An edge, optionally carrying the tick as a dot part way down it. `pulse` is
   0..1 along the edge. */
function edge(x1, y1, x2, y2, { pulse = null } = {}) {
  let out = `<line class="edge" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`;
  if (pulse != null) out += `<circle class="pulse" cx="${n(x1 + (x2 - x1) * pulse)}" cy="${n(y1 + (y2 - y1) * pulse)}" r="4"/>`;
  return out;
}

/* The drone, nose up at heading 0, rotated clockwise. Same glyph on the map
   and on the plates. */
function craft(cx, cy, heading, { landed = false } = {}) {
  return `<g class="craft${landed ? " craft--landed" : ""}" transform="translate(${n(cx)} ${n(cy)}) rotate(${n(heading)})"><path d="M0 -6 L4 5 L0 3 L-4 5 Z"/></g>`;
}

/* A whole tree from a spec, laid out by layout.js. `status` maps node id to
   ok | fail | run; `pulse` maps an edge "from>to" to 0..1; `hrefs` maps id to
   a link (the index plate). */
function tree(spec, { x = 0, y = 0, status = {}, dirty = {}, pulse = {}, hrefs = {}, labelClass = "", twoLine = false, ...opts } = {}) {
  const L = layout(spec, opts);
  const edges = L.edges.map((e) => edge(x + e.x1, y + e.y1, x + e.x2, y + e.y2, { pulse: pulse[`${e.from}>${e.to}`] ?? null })).join("");
  const nodes = L.nodes.map((d) => node(d.kind, x + d.x, y + d.y, d.label,
    { status: status[d.id] ?? "idle", w: d.w, h: d.h, dirty: !!dirty[d.id], href: hrefs[d.id] ?? null, labelClass, twoLine })).join("");
  return `<g class="tree">${edges}${nodes}</g>`;
}

/* ── document wrapper ──────────────────────────────────────────────────── */

/* A hatch pattern for dirty conditions. No arrowheads: nothing in this course
   is drawn as a force, so there is nothing for a marker to terminate. */
function defs() {
  return `<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>`;
}

/* Progressive build (§4.2): all states share one viewBox and one set of
   positions; later states only add. */
function figure({ title, desc, states = [], captions = [], vb = `0 0 ${VB_W} ${VB_H}`, wide = false }) {
  // Captions sit on the box the figure actually uses, not on a hardcoded 800x500.
  const [, , vw, vh] = vb.split(/\s+/).map(Number);
  const body = states.map((sBody, i) => `<g class="s${i + 1}">${sBody}</g>`).join("");
  const caps = captions.map((c, i) =>
    `<text class="cap cap${i + 1}" x="${n(vw / 2)}" y="${n(vh - 30)}">${esc(c)}</text>`).join("");
  /* wide: for a plate whose labels only read at their real size (Nav2), not
     scaled down to fit a column. An explicit width attribute, in the same
     units as the viewBox, is what lets app.css's `width: auto` on
     figure--wide render the svg at that real size instead of the usual 100%;
     the host then scrolls to it sideways rather than the page ever growing
     wider than the viewport. */
  const wattr = wide ? ` width="${n(vw)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${wattr} class="figure${wide ? " figure--wide" : ""}" data-state="${states.length}"
    role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(desc)}</desc>
    ${defs()}${body}<g class="caption">${caps}</g></svg>`;
}

export {
  line, chip, note, figure, esc,
  node, edge, craft, tree,
};
