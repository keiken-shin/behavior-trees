#!/usr/bin/env node
/* Does every authored figure actually land where it was drawn?
 *
 * A figure is written as arithmetic - X(0.62), Y2(-0.34), CY + 196 - and the
 * eye that placed those numbers was looking at one state of one plate. Four
 * real defects lived in Part I for months because nobody re-checked the other
 * states: a chip sitting on an axis label, a note running under three chips.
 * None of them are visible in the source; all of them are obvious once the
 * marks are given boxes and the boxes are compared.
 *
 * So this renders all 4 figures - three plate builders and the index tree -
 * and measures the output. Four rules:
 *   1. no NaN or undefined anywhere in the markup
 *   2. every mark inside its own viewBox
 *   3. no chip-on-chip and no note-on-chip overlap, in any cumulative state
 *   4. a title, a desc, and one caption per state
 *
 * Boxes match what a browser reports for getBBox: the fonts are JetBrains Mono
 * (0.6 em advance, monospaced) and text is measured over its em box, ascender
 * to descender, which is the box that visibly covers what is behind it.
 *
 * Run with `npm run check`.
 */

import { readFileSync } from "node:fs";
import { tinyXml } from "../src/bt/nav2.js";
import { LESSONS } from "../src/data/lessons.js";

/* Node has no DOMParser and no ?raw loader: diagrams.js falls back to these
   globals when it does not find them already set (see nav2.js and the
   diagrams.js header). Must be set before diagrams.js is imported, so the
   import below is dynamic rather than static. */
globalThis.__NAV2 = readFileSync(new URL("../content/nav2.xml", import.meta.url), "utf8");
globalThis.DOMParser = class { parseFromString(x) { return tinyXml(x); } };
const { default: D, indexTree } = await import("../src/data/diagrams.js");

/* ── text metrics ──────────────────────────────────────────────────────────
   From app.css: .chip-t is 13px mono, .chip-t.sm 11.5px, .note 12px. Mono
   means the advance is exact rather than estimated, which is the only reason
   measuring text outside a browser is honest here. */
const FS = (cls) => (cls.has("note") ? 12
  : cls.has("node-t") ? (cls.has("node-t--xs") ? 9 : cls.has("node-t--sm") ? 10 : 12)
    : cls.has("sm") ? 11.5 : 13);
const ADV = 0.6, ASC = 1.02, DESC = 0.3;   // JetBrains Mono em metrics

/* ── transforms ───────────────────────────────────────────────────────────
   A builder may draw in local coordinates and place the result with a transform,
   so a mark's own points are legitimately outside the plate. Composing the matrix
   is the only way to tell that apart from a mark that has genuinely fallen off
   it, so the transform is applied rather than the element excused. */
const I = [1, 0, 0, 1, 0, 0];                       // a b c d e f
const mul = (m, o) => [
  m[0] * o[0] + m[2] * o[1], m[1] * o[0] + m[3] * o[1],
  m[0] * o[2] + m[2] * o[3], m[1] * o[2] + m[3] * o[3],
  m[0] * o[4] + m[2] * o[5] + m[4], m[1] * o[4] + m[3] * o[5] + m[5],
];
const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function parseTransform(s) {
  let m = I;
  for (const [, op, args] of s.matchAll(/([a-z]+)\s*\(([^)]*)\)/g)) {
    const a = args.trim().split(/[\s,]+/).map(Number);
    if (op === "translate") m = mul(m, [1, 0, 0, 1, a[0], a[1] || 0]);
    else if (op === "scale") m = mul(m, [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0]);
    else if (op === "rotate") {
      const r = (a[0] * Math.PI) / 180, c = Math.cos(r), n = Math.sin(r);
      const [cx, cy] = a.length > 1 ? [a[1], a[2]] : [0, 0];
      m = mul(m, [1, 0, 0, 1, cx, cy]);
      m = mul(m, [c, n, -n, c, 0, 0]);
      m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else throw new Error(`unhandled transform: ${op}`);
  }
  return m;
}

/* ── geometry → sample points ─────────────────────────────────────────────
   Everything becomes points, so a rotated group or a swept arc needs no
   special case downstream. Curves are sampled rather than bounded by their
   control points: a control box is a superset, and a superset is how a
   correctness check learns to cry wolf. */
/* svg.js escapes its text, so "-> deliver" reaches here as "-&gt; deliver".
   Measuring the entity would charge a label for four characters it never draws. */
const unesc = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const ptList = (s) => s.trim().split(/\s+/).filter(Boolean).map((p) => p.split(",").map(Number));

const ring = (cx, cy, rx, ry, n = 48) => Array.from({ length: n }, (_, i) => {
  const t = (2 * Math.PI * i) / n;
  return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
});

const cubic = (p0, p1, p2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [0, 1].map((j) =>
    u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j]);
});

const quad = (p0, p1, p2, n = 12) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [0, 1].map((j) => u * u * p0[j] + 2 * u * t * p1[j] + t * t * p2[j]);
});

/* SVG endpoint parameterisation → centre, so the bulge of an arc is measured
   and not guessed. Every arc in the project is circular and unrotated. */
function arcPts(p0, rx, ry, large, sweep, p1) {
  const [x0, y0] = p0, [x1, y1] = p1;
  if (!rx || !ry) return [p0, p1];
  const dx = (x0 - x1) / 2, dy = (y0 - y1) / 2;
  let lam = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * dy * dy - ry * ry * dx * dx;
  const den = rx * rx * dy * dy + ry * ry * dx * dx;
  const co = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(num / den, 0));
  const cxp = (co * rx * dy) / ry, cyp = (-co * ry * dx) / rx;
  const cx = cxp + (x0 + x1) / 2, cy = cyp + (y0 + y1) / 2;
  const ang = (x, y) => Math.atan2((y - cy) / ry, (x - cx) / rx);
  let a0 = ang(x0, y0), a1 = ang(x1, y1);
  if (sweep && a1 < a0) a1 += 2 * Math.PI;
  if (!sweep && a1 > a0) a1 -= 2 * Math.PI;
  return Array.from({ length: 33 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 32;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });
}

/* Only the commands the project actually draws. Anything else throws: a parser
   that shrugs at a command it does not know reports "no marks out of bounds"
   for a figure it never read. */
function pathPts(d) {
  const toks = d.match(/[MmLlHhVvCcSsQqAaZz]|-?[\d.]+(?:e-?\d+)?/g) || [];
  const pts = []; let i = 0, cur = [0, 0], start = [0, 0], cmd = "";
  const num = () => Number(toks[i++]);
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const rx = rel ? cur[0] : 0, ry = rel ? cur[1] : 0;
    switch (cmd.toUpperCase()) {
      case "M": case "L": {
        cur = [rx + num(), ry + num()]; pts.push(cur);
        if (cmd.toUpperCase() === "M") start = cur;
        if (cmd === "M") cmd = "L"; else if (cmd === "m") cmd = "l";
        break;
      }
      case "H": cur = [rx + num(), cur[1]]; pts.push(cur); break;
      case "V": cur = [cur[0], ry + num()]; pts.push(cur); break;
      case "C": {
        const p1 = [rx + num(), ry + num()], p2 = [rx + num(), ry + num()];
        const p3 = [rx + num(), ry + num()];
        pts.push(...cubic(cur, p1, p2, p3)); cur = p3; break;
      }
      case "Q": {
        const p1 = [rx + num(), ry + num()], p2 = [rx + num(), ry + num()];
        pts.push(...quad(cur, p1, p2)); cur = p2; break;
      }
      case "A": {
        const arx = num(), ary = num(); num();                 // x-rotation: always 0 here
        const large = num(), sweep = num();
        const p = [rx + num(), ry + num()];
        pts.push(...arcPts(cur, arx, ary, large, sweep, p)); cur = p; break;
      }
      case "Z": cur = start; pts.push(cur); break;
      default: throw new Error(`unhandled path command "${cmd}" in ${d.slice(0, 40)}`);
    }
  }
  return pts;
}

/* ── the markup ───────────────────────────────────────────────────────────
   A regex walk, not a DOM: the output is generated by svg.js from a handful of
   templates, so the shapes it can take are known exactly. */
const box = (pts) => ({
  x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])),
  y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])),
});

function marks(svg) {
  const out = [];
  const stack = [{ m: I, cls: new Set(), state: null, tag: "root", skip: false }];
  const re = /<([a-zA-Z]+)((?:[^>"]|"[^"]*")*?)(\/?)>|<\/([a-zA-Z]+)>|([^<]+)/g;
  let mt;
  while ((mt = re.exec(svg))) {
    const [, open, attrStr = "", selfClose, close, text] = mt;
    const top = stack[stack.length - 1];
    if (text !== undefined) {
      if ((top.tag === "text" || top.tag === "tspan") && !top.skip) top.text = (top.text || "") + text;
      continue;
    }
    /* <text> is the one element whose geometry needs its content, so it is
       measured when it closes rather than when it opens. */
    if (close) {
      if (stack.length > 1) {
        const done = stack.pop();
        if ((done.tag === "text" || done.tag === "tspan") && !done.skip) emit(done, out);
      }
      continue;
    }

    const at = {};
    for (const [, k, v] of attrStr.matchAll(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g)) at[k] = v;
    const cls = new Set((at.class || "").split(/\s+/).filter(Boolean));
    const m = at.transform ? mul(top.m, parseTransform(at.transform)) : top.m;
    /* <defs> holds marker geometry in marker-viewBox units - 0..10, nothing to
       do with the plate - so the subtree is not measured. */
    const skip = top.skip || open === "defs";
    const state = cls.has("caption") ? "cap"
      : /^s\d+$/.test([...cls].find((c) => /^s\d+$/.test(c)) || "") ? Number([...cls].find((c) => /^s\d+$/.test(c)).slice(1))
        : top.state;
    const el = { tag: open, cls, at, m, state, skip, parent: top };

    if (!selfClose) { stack.push(el); continue; }
    if (!skip) emit(el, out);
  }
  return out;
}

/* The nearest <g class="node"> above an element: a label is a direct child of
   the group on one line and a <tspan> one level deeper on two. */
const nodeOf = (el) => { let p = el.parent; while (p && !p.cls?.has("node")) p = p.parent; return p; };
const spanX = (points) => {
  const xs = ptList(points).map((p) => p[0]);
  return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
};

function emit(el, out) {
  const { tag, at, m, cls } = el;
  let pts = null;
  const N = (k, d = 0) => (at[k] === undefined ? d : Number(at[k]));
  if (tag === "line") pts = [[N("x1"), N("y1")], [N("x2"), N("y2")]];
  else if (tag === "rect") {
    const x = N("x"), y = N("y"), w = N("width"), h = N("height");
    pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  } else if (tag === "circle") pts = ring(N("cx"), N("cy"), N("r"), N("r"));
  else if (tag === "ellipse") pts = ring(N("cx"), N("cy"), N("rx"), N("ry"));
  else if (tag === "path") pts = pathPts(at.d || "");
  else if (tag === "polygon") pts = ptList(at.points || "");
  else if (tag === "text" || tag === "tspan") {
    const fs = FS(cls), t = unesc(el.text || "");
    const w = ADV * fs * t.length;
    const anchor = at["text-anchor"] || "middle";
    const x = N("x") - (anchor === "start" ? 0 : anchor === "end" ? w : w / 2);
    /* .chip-t is dominant-baseline:middle, everything else sits on its baseline. */
    const [top, bot] = cls.has("chip-t")
      ? [-((ASC + DESC) / 2) * fs, ((ASC + DESC) / 2) * fs]
      : [-ASC * fs, DESC * fs];
    const y = N("y");
    pts = [[x, y + top], [x + w, y + top], [x + w, y + bot], [x, y + bot]];
    /* Hand the label text up to the node group too, purely so a node-on-node
       overlap below can name what it is reporting. Two tspans (a two-line
       label) each append in turn. */
    if (cls.has("node-t")) { const g2 = nodeOf(el); if (g2) g2.label = (g2.label || "") + t; }
  }
  if (!pts || !pts.length) return;
  const b = box(pts.map((p) => apply(m, p)));
  /* Hand the words and their box up to the chip group: a chip is a rect and a
     text, and the rule below needs both halves of it at once. */
  if (cls.has("chip-t") && el.parent) { el.parent.label = el.text || ""; el.parent.ink = b; }
  /* Same idiom for a tree node, which svg.js always writes as
     <g class="node ..."><shape/><text class="node-t"/></g>. The label rule needs
     the shape's width, taken from its own attributes rather than its transformed
     box so a scaled plate is measured in the space the label was written in.
     Custom draws two rects; the first is the outer one. */
  const g = nodeOf(el);
  if (g && (tag === "rect" || tag === "ellipse" || tag === "polygon")) {
    g.shape ??= { tag, w: tag === "rect" ? N("width") : tag === "ellipse" ? 2 * N("rx") : spanX(at.points || "") };
  }
  out.push({ ...el, box: b });
}

/* ── rules ────────────────────────────────────────────────────────────────
   A chip is the paper-backed label of §3, which svg.js always writes as
   <g class="chip-g"><rect class="chip"/><text/></g>. Chapter 15's doghouse
   lays plain <rect class="chip"> patches over chapter 9's plate to re-read it
   - same fill, deliberately, but no chip-g and no text. Keying on the group
   rather than the class keeps those out without exempting the figure: a real
   chip added to the doghouse tomorrow is still checked.

   Those bare patches are the other half of it. A label buried under full paper
   is off the plate, so it can neither be hidden nor do any hiding, and the
   doghouse would otherwise report chapter 9's ghosted chips against chapter
   15's live ones. Only FULL paper counts: the doghouse's 0.9-opacity wash over
   the whole plate hides nothing, and treating it as a mask would switch the
   check off for that figure entirely. */
/* How much of a shape's width its label may use. */
const FIT = { rect: (w) => w - 8, ellipse: (w) => 0.82 * w, polygon: (w) => 0.6 * w };

const isChip = (el) => el.tag === "rect" && el.cls.has("chip") && el.parent?.cls.has("chip-g");
const isNote = (el) => el.tag === "text" && el.cls.has("note");
const isMask = (el) => el.tag === "rect" && el.cls.has("chip") && !el.parent?.cls.has("chip-g") &&
  el.at.opacity === undefined;
const inside = (a, b) => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;
/* A later state redrawing a node at the EXACT box an earlier state drew it at
   is just that node's status colour changing, which every progressive-build
   plate in this course does every state - not a print-through. Only a box
   that has moved or changed shape counts as one shape landing on another. */
const sameBox = (a, b) => Math.abs(a.x0 - b.x0) < 0.5 && Math.abs(a.x1 - b.x1) < 0.5 &&
  Math.abs(a.y0 - b.y0) < 0.5 && Math.abs(a.y1 - b.y1) < 0.5;

const over = (a, b) => {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? { w, h, area: w * h } : null;
};

function audit(key, svg) {
  const bad = [];
  const bug = svg.match(/NaN|undefined/);
  if (bug) bad.push(`${bug[0]} in the markup near "${svg.slice(Math.max(0, bug.index - 40), bug.index + 20).replace(/\s+/g, " ")}"`);

  const [, , vw, vh] = (svg.match(/viewBox="([^"]*)"/)?.[1] || "0 0 0 0").split(/\s+/).map(Number);
  if (!/<title>[^<]+<\/title>/.test(svg)) bad.push("no title");
  if (!/<desc>[^<]+<\/desc>/.test(svg)) bad.push("no desc");
  const states = Number(svg.match(/data-state="(\d+)"/)?.[1] || 0);
  const caps = [...svg.matchAll(/class="cap cap\d+"[^>]*>([^<]*)</g)].map((c) => c[1].trim());
  if (caps.length !== states || caps.some((c) => !c)) {
    bad.push(`${caps.filter(Boolean).length} captions for ${states} states`);
  }

  /* A caption is one line of a proportional face, so its width can only be
     estimated here: 6.5 px a character is what the browser reports for Archivo
     at 15 px over the captions this project actually ships. An estimate is
     enough for the failure that matters - a sentence wider than its own plate,
     which runs off both ends of the frame and cannot be seen at all. */
  for (const [i, c] of caps.entries()) {
    const px = c.length * 6.5;
    if (px > vw - 40) bad.push(`caption ${i + 1} is about ${px.toFixed(0)} px wide on a ${vw} px frame; shorten it`);
  }

  const all = marks(svg);
  /* A caption's exact box is the browser's to compute, not this script's; here
     it is checked for presence and for fitting the frame. */
  const drawn = all.filter((el) => el.state !== "cap");
  for (const el of drawn) {
    const b = el.box, e = 0.5;
    if (b.x0 < -e || b.y0 < -e || b.x1 > vw + e || b.y1 > vh + e) {
      bad.push(`<${el.tag}${el.cls.size ? ` class="${[...el.cls].join(" ")}"` : ""}> outside the ${vw}×${vh} viewBox: ` +
        `x ${b.x0.toFixed(0)}..${b.x1.toFixed(0)}, y ${b.y0.toFixed(0)}..${b.y1.toFixed(0)}`);
    }
  }

  /* Does every label fit the shape it is written in? Nothing else here can see
     this: the markup is valid, every mark is inside the viewBox, and the text
     simply runs out past the box's sides in the browser. A rect gets an 8 px
     inset; an ellipse and a rhombus are narrower than their box at the height
     the text sits on, so they get a fraction of the width instead. */
  const seenLabel = new Set();
  for (const el of drawn) {
    if (!el.cls.has("node-t")) continue;
    const t = unesc(el.text || "").trim();
    if (!t || seenLabel.has(t)) continue;
    const g = nodeOf(el);
    if (!g?.shape) continue;
    const room = FIT[g.shape.tag](g.shape.w);
    const wide = ADV * FS(el.cls) * t.length;
    if (wide > room + 0.5) {
      seenLabel.add(t);
      bad.push(`label "${t}" is ${wide.toFixed(0)} px wide in a ${g.shape.tag} with ${room.toFixed(0)} px of room`);
    }
  }

  /* Nothing may be written on the caption line. The caption is set in a
     proportional face, so its width is the browser's to know - but its line is
     not: figure() always writes it at vh - 30 at 15 px. Anything whose own box
     reaches into that band is printed through the sentence under the plate. */
  const capY = vh - 30, bandTop = capY - ASC * 15, bandBot = capY + DESC * 15;
  const seenBand = new Set();
  for (const el of drawn) {
    if (!isNote(el) && !el.cls.has("chip-t")) continue;
    const b = el.box;
    if (b.y1 <= bandTop || b.y0 >= bandBot) continue;
    const what = `${isNote(el) ? "note" : "chip"} "${(el.text || "").trim().slice(0, 34)}"`;
    if (seenBand.has(what)) continue;
    seenBand.add(what);
    bad.push(`state ${el.state ?? 1}: ${what} sits on the caption band (y ${b.y0.toFixed(0)}..${b.y1.toFixed(0)}, band starts at ${bandTop.toFixed(0)})`);
  }

  /* The rule is "paper never covers words": a chip carries a paper patch and a
     note does not, so testing every patch against every other label's text is
     exactly chip-on-chip plus note-on-chip, and two chips whose corners touch
     within their own 4px padding are left alone - nothing is hidden there.

     Per cumulative state, because state 3 shows s1+s2+s3: a chip added in s3
     that lands on one drawn in s1 is a collision the source cannot show you. */
  const masks = drawn.filter(isMask);
  const labels = drawn.filter((el) => isChip(el) || isNote(el))
    .map((el) => ({
      state: el.state || 1,
      paper: isChip(el) ? el.box : null,
      ink: isChip(el) ? el.parent.ink : el.box,
      what: isChip(el) ? `chip "${(el.parent.label || "?").trim()}"` : `note "${(el.text || "").trim().slice(0, 34)}"`,
    }));
  const seen = new Set();
  for (let s = 1; s <= states; s++) {
    const live = labels.filter((l) => l.state <= s && !masks.some(
      (m) => (m.state || 1) >= l.state && (m.state || 1) <= s && inside(l.paper || l.ink, m.box)));
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const [a, b] = [live[i], live[j]];
      for (const [p, q] of [[a, b], [b, a]]) {
        const o = p.paper && q.ink && over(p.paper, q.ink);
        if (!o || o.w < 1 || o.h < 1) continue;          // under a pixel is a touch, not a cover
        const id = `${p.what}|${q.what}`;
        if (seen.has(id)) continue;
        seen.add(id);
        bad.push(`state ${s}: ${p.what} covers ${q.what} by ${o.w.toFixed(0)}×${o.h.toFixed(0)} px`);
      }
    }
  }

  /* A tree node's rect, ellipse or polygon is opaque paper exactly like a
     chip is. A cumulative state can redraw a whole tree in a different shape
     from the same origin as an earlier state - design/backchain used to -
     which lands a later state's node shapes on an earlier state's. Neither
     shape is a chip or a note, so nothing above catches it. Same masking
     idiom: a mask drawn in a state after the earlier shape and at or before
     the later one clears it. Two shapes belonging to the same node (Custom's
     double ruled box) sit concentric on purpose, two shapes added in the very
     same state are ordinary siblings the layout already spaced apart, and a
     later state redrawing the very same node at the very same box is a status
     colour update, not an overlap - none of the three is compared. */
  const nodeShapes = drawn
    .filter((el) => (el.tag === "rect" || el.tag === "ellipse" || el.tag === "polygon") && el.parent?.cls.has("node"))
    .map((el) => ({
      state: el.state || 1, box: el.box, node: el.parent,
      what: `${el.tag}${el.parent.label ? ` "${el.parent.label.trim()}"` : ""}`,
    }));
  const seenNodes = new Set();
  for (let s = 1; s <= states; s++) {
    const live = nodeShapes.filter((nd) => nd.state <= s && !masks.some(
      (m) => (m.state || 1) >= nd.state && (m.state || 1) <= s && inside(nd.box, m.box)));
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const [a, b] = [live[i], live[j]];
      if (a.node === b.node || a.state === b.state || sameBox(a.box, b.box)) continue;
      const o = over(a.box, b.box);
      if (!o || o.w < 1 || o.h < 1) continue;
      const [older, newer] = a.state < b.state ? [a, b] : [b, a];
      const id = `${older.what}@${older.state}|${newer.what}@${newer.state}`;
      if (seenNodes.has(id)) continue;
      seenNodes.add(id);
      bad.push(`state ${s}: ${newer.what} (state ${newer.state}) overlaps ${older.what} (state ${older.state}) by ${o.w.toFixed(0)}×${o.h.toFixed(0)} px`);
    }
  }
  return bad;
}

/* ── run ──────────────────────────────────────────────────────────────── */
/* The index plate is not in D - it takes LESSONS as an argument rather than
   being a zero-argument builder - so it is added here rather than left out
   of the guard spec section 7 asks for. */
const ALL = { ...D, "index/tree": () => indexTree(LESSONS) };

let failed = 0, passed = 0;
for (const [key, build] of Object.entries(ALL)) {
  let svg;
  try { svg = build(); } catch (e) {
    failed++; console.log(`  FAIL  ${key}\n          threw: ${e.message}`); continue;
  }
  const bad = audit(key, svg);
  if (!bad.length) { passed++; continue; }
  failed++;
  console.log(`  FAIL  ${key}`);
  for (const b of bad) console.log(`          ${b}`);
}

console.log(`\n${passed}/${passed + failed} figures clean`);
if (failed) {
  console.error(`${failed} figure(s) have layout defects. Move the label, not the drawing.`);
  process.exit(1);
}
