#!/usr/bin/env node
/* The content audit: the rules that are about what the course SAYS rather than
 * about whether it runs.
 *
 * These are the ones a build cannot catch and a reader cannot check. A term
 * badged as standard without naming the edition it came from, a chapter that
 * quietly lost its stage check, a cross-reference pointing at the wrong chapter
 * because someone inserted a lesson in the middle of the array - each of those
 * ships looking completely fine.
 */

import { LESSONS, PARTS } from "../src/data/lessons.js";
import { VIDEOS } from "../src/data/videos.js";
import { SCENES } from "../src/data/scenes.js";
import { buildDeck } from "../src/data/deck.js";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path/posix";

/* Node has no ?raw loader: diagrams.js falls back to globalThis.__NAV2 when
   set. Must be set before diagrams.js is imported, so the import is dynamic. */
globalThis.__NAV2 = readFileSync(new URL("../content/nav2.xml", import.meta.url), "utf8");
const { default: DIAGRAMS } = await import("../src/data/diagrams.js");

const { sources: SOURCES } = JSON.parse(readFileSync(new URL("../content/sources.json", import.meta.url), "utf8"));
const DIAL = JSON.parse(readFileSync(new URL("../content/dialects.json", import.meta.url), "utf8"));

let failed = 0;
const fail = (m) => { console.log(`  FAIL  ${m}`); failed++; };
const pass = (m) => console.log(`  pass  ${m}`);

/* ── every chapter has the spine ─────────────────────────────────────────── */
const spineless = [];
for (const les of LESSONS) {
  const t = (k) => les.flow.some((b) => b.t === k);
  const missing = ["concrete", "fig", "play", "myth", "check"].filter((k) => !t(k));
  if (missing.length) spineless.push(`${les.id} (no ${missing.join(", ")})`);
}
spineless.length
  ? fail(`chapters missing a spine block: ${spineless.join("; ")}`)
  : pass(`all ${LESSONS.length} chapters carry concrete, figure, play, myth and check`);

/* ── the sources rule: every myth and fact names a source that exists ───── */
const unsourced = [], phantom = [], forum = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "myth" || x.t === "fact")) {
    if (!b.src) unsourced.push(`${les.id}: ${b.t} "${(b.claim ?? b.text).slice(0, 40)}"`);
    else if (!SOURCES[b.src]) phantom.push(`${les.id}: ${b.t} cites "${b.src}"`);
    else if (b.t === "fact" && /forum post/.test(SOURCES[b.src].grade)) forum.push(`${les.id}: fact cites forum post "${b.src}"`);
  }
const claimCount = LESSONS.flatMap((l) => l.flow).filter((b) => b.t === "myth" || b.t === "fact").length;
unsourced.length || phantom.length || forum.length
  ? fail(`sources: ${[...unsourced, ...phantom, ...forum].join("; ")}`)
  : pass(`all ${claimCount} myths and facts cite a real source, and no fact rests on a forum post`);
const thin = Object.entries(SOURCES).filter(([, s]) => !(s.title && s.url?.startsWith("https://") && s.grade && s.read));
thin.length
  ? fail(`sources missing title, https url, grade or read: ${thin.map(([id]) => id).join(", ")}`)
  : pass(`all ${Object.keys(SOURCES).length} sources carry a title, an https url, a grade in words and what was read`);

/* ── the dialect table cites real sources ────────────────────────────────── */
const badCols = DIAL.columns.filter((c) => !SOURCES[c.src]);
const badRows = DIAL.rows.filter((r) => DIAL.columns.some((c) => typeof r[c.id] !== "string" || !r[c.id]));
badCols.length || badRows.length
  ? fail(`dialects: ${badCols.length} columns without a source, ${badRows.length} rows with an empty cell`)
  : pass(`dialect table: ${DIAL.rows.length} rows, every column sourced`);

/* ── cross-references point where they claim to ──────────────────────────── */
const badRefs = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "ref")) {
    const dest = LESSONS[b.ch - 1];
    if (!dest) badRefs.push(`${les.id} → chapter ${b.ch}, which does not exist`);
    else if (dest.id === les.id) badRefs.push(`${les.id} → itself`);
    else if (LESSONS.indexOf(les) < b.ch - 1)
      badRefs.push(`${les.id} → chapter ${b.ch} (${dest.id}), which comes AFTER it`);
  }
const refCount = LESSONS.flatMap((l) => l.flow).filter((b) => b.t === "ref").length;
badRefs.length
  ? fail(`cross-references: ${badRefs.join("; ")}`)
  : pass(`all ${refCount} cross-references resolve to an earlier chapter`);

/* ── every figure a chapter asks for actually exists ─────────────────────── */
const missingFigs = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "fig"))
    if (!DIAGRAMS[b.id]) missingFigs.push(`${les.id} → ${b.id}`);
missingFigs.length
  ? fail(`figures referenced but not built: ${missingFigs.join(", ")}`)
  : pass(`all ${Object.keys(DIAGRAMS).length} figure builders resolve`);

/* ── every scene block resolves, and every chapter has one ───────────────── */
const badPlays = [];
for (const les of LESSONS)
  for (const b of les.flow.filter((x) => x.t === "scene"))
    if (!SCENES[b.id]) badPlays.push(`${les.id} → ${b.id}`);
badPlays.length
  ? fail(`scene blocks with no configuration in scenes.js: ${badPlays.join(", ")}`)
  : pass(`all ${Object.keys(SCENES).length} playgrounds resolve`);

/* ── the appendix must never become homework ─────────────────────────────── */
const deck = buildDeck();
const leaked = deck.filter((c) => !LESSONS.some((l) => l.id === c.lesson));
leaked.length
  ? fail(`${leaked.length} deck cards come from something that is not a chapter`)
  : pass(`all ${deck.length} deck cards derive from chapters, none from the glossary`);

/* ── parts are coherent ──────────────────────────────────────────────────── */
const noPart = LESSONS.filter((l) => !PARTS.some((p) => p.n === l.part));
noPart.length
  ? fail(`chapters in no declared part: ${noPart.map((l) => l.id).join(", ")}`)
  : pass(`every chapter belongs to one of ${PARTS.length} parts`);

/* ── an imported asset that is not in the repo ────────────────────────────
   The one failure mode a local build cannot see. An asset sitting on the disk
   of the machine that made it resolves perfectly there and is simply absent on
   a clean checkout, so the build passes for its author and fails for everyone
   else - which is exactly how plate-combat.png reached a deploy. The ignore
   rule that caused it even carried a comment saying plates are tracked BECAUSE
   the build needs them; it just named one file instead of the class. */
{
  const list = (args) => execSync(`git ls-files ${args}`, { encoding: "utf8" })
    .split(/\r?\n/).filter(Boolean);
  const tracked = new Set(list(""));
  const ASSET = /\.(png|jpe?g|gif|svg|webp|avif|woff2?|mp[34])$/i;
  const missing = [];
  for (const f of list("src content")) {
    if (!/\.(js|mjs|css)$/.test(f)) continue;
    const dir = dirname(f);
    for (const m of readFileSync(f, "utf8")
      .matchAll(/from\s+["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      const spec = m[1] ?? m[2];
      if (!spec?.startsWith(".") || !ASSET.test(spec)) continue;
      const rel = join(dir, spec);
      if (!tracked.has(rel)) missing.push(`${f} imports ${rel}`);
    }
  }
  missing.length
    ? fail(`imported but not tracked by git: ${missing.join("; ")}`)
    : pass("every asset imported by source is tracked, so a clean checkout builds");
}

/* A source nobody cites is not a failure - several were read, and honestly
   reported, without ending up under a sentence - but an uncited source should
   stay in sight rather than quietly accumulate. */
{
  const cited = new Set(LESSONS.flatMap((l) => l.flow)
    .filter((b) => b.t === "myth" || b.t === "fact").map((b) => b.src));
  for (const c of DIAL.columns) cited.add(c.src);     // the appendix cites its columns
  const loose = Object.keys(SOURCES).filter((id) => !cited.has(id));
  console.log(`  note  ${loose.length ? `cited by no block: ${loose.join(", ")}` : "every source is cited by a block"}`);
}

/* A chapter with no clips is allowed - some subjects have no honest source -
   but it should be a decision rather than an oversight, so it is reported. */
const silent = LESSONS.filter((l) => !(VIDEOS[l.id] || []).length).map((l) => l.id);
console.log(`  note  ${silent.length ? `no clips: ${silent.join(", ")}` : "every chapter has clips"}`);

console.log(failed ? `\n${failed} content check(s) FAILED` : "\ncontent is coherent");
process.exit(failed ? 1 : 0);
