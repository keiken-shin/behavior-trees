#!/usr/bin/env node
// YouTube curation for the concept spine. Gathers *candidates* - picking is editorial.
//
//   node scripts/yt.mjs search "dutch roll explained"   one-off search, prints results
//   node scripts/yt.mjs curate                          run every query in concepts.json
//   node scripts/yt.mjs curate axes-and-controls        one concept
//   node scripts/yt.mjs verify                          re-check saved videos still resolve
//
// Needs GOOGLE_API_KEY with the YouTube Data API v3 enabled.
// Quota: a search costs 100 units, default daily quota is 10,000 → ~100 searches/day.
// A full `curate` over the current spine is ~31 searches (~3,100 units).

import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

try { process.loadEnvFile(); } catch {} // .env is optional; env vars win if already set

const ROOT = path.resolve(import.meta.dirname, "..");
const CONCEPTS = path.join(ROOT, "content", "concepts.json");
const VIDEOS = path.join(ROOT, "content", "videos.json");
const API = "https://www.googleapis.com/youtube/v3";
const PER_QUERY = 6;

const [cmd, arg] = process.argv.slice(2);
const key = process.env.GOOGLE_API_KEY;

if (!key) {
  console.error("GOOGLE_API_KEY is not set.");
  process.exit(1);
}

const cmds = { search, curate, verify, emit };
if (!cmds[cmd]) {
  console.error("Usage: node scripts/yt.mjs <search|curate|verify|emit> [arg]");
  process.exit(1);
}
cmds[cmd](arg).catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});

async function get(endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${res.status} ${json?.error?.message ?? res.statusText}`);
  return json;
}

// Search returns thin snippets; a second videos.list call is what gives us
// duration, view count, and whether the thing is actually embeddable.
async function candidates(query, n = PER_QUERY) {
  const found = await get("search", {
    part: "snippet",
    type: "video",
    q: query,
    maxResults: n,
    relevanceLanguage: "en",
    videoEmbeddable: "true",
    order: "relevance",
  });
  const ids = found.items.map((i) => i.id.videoId);
  if (!ids.length) return [];
  return hydrate(ids);
}

async function hydrate(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const { items } = await get("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.slice(i, i + 50).join(","),
    });
    out.push(
      ...items.map((v) => ({
        id: v.id,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        published: v.snippet.publishedAt.slice(0, 10),
        duration: humanDuration(v.contentDetails.duration),
        views: Number(v.statistics.viewCount ?? 0),
        embeddable: v.status?.embeddable !== false,
      })),
    );
  }
  return out;
}

function humanDuration(iso) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) ?? [];
  const [h, mm, s] = [m[1], m[2], m[3]].map((x) => Number(x ?? 0));
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(mm)}:${pad(s)}` : `${mm}:${pad(s)}`;
}

function show(v) {
  console.log(
    `  ${v.title}\n    ${v.channel} · ${v.duration} · ${v.views.toLocaleString()} views · ${v.published}\n    ${v.url}`,
  );
}

async function search(query) {
  if (!query) throw new Error('Pass a query: node scripts/yt.mjs search "..."');
  (await candidates(query, 10)).forEach(show);
}

async function curate(conceptId) {
  const { concepts } = JSON.parse(await readFile(CONCEPTS, "utf8"));
  const selected = conceptId ? concepts.filter((c) => c.id === conceptId) : concepts;
  if (!selected.length) throw new Error(`No concept with id "${conceptId}".`);

  const prior = (await access(VIDEOS).then(() => true, () => false))
    ? JSON.parse(await readFile(VIDEOS, "utf8"))
    : {};

  for (const c of selected) {
    console.log(`\n── ${c.title}`);
    const seen = new Map((prior[c.id] ?? []).map((v) => [v.id, v]));
    for (const q of c.videoQueries ?? []) {
      console.log(`  query: "${q}"`);
      for (const v of await candidates(q)) {
        // Preserve an existing editorial decision rather than resetting it.
        if (!seen.has(v.id)) seen.set(v.id, { ...v, picked: false, note: "", query: q });
      }
    }
    prior[c.id] = [...seen.values()].sort((a, b) => b.views - a.views);
    prior[c.id].forEach(show);
  }

  await writeFile(VIDEOS, JSON.stringify(prior, null, 2) + "\n");
  const total = Object.values(prior).flat().length;
  console.log(`\nWrote content/videos.json - ${total} candidates.`);
  console.log('Now the editorial pass: set "picked": true and write a "note" for the ones that earn a slot.');
}

// Link rot is the standing failure mode of curated video. Run this monthly.
async function verify() {
  const saved = JSON.parse(await readFile(VIDEOS, "utf8"));
  const ids = [...new Set(Object.values(saved).flat().map((v) => v.id))];
  const alive = new Set((await hydrate(ids)).map((v) => v.id));

  /* Embeddability is checked alongside aliveness. Since videos play inside the
     app, an uploader switching embedding off breaks a lesson just as completely
     as deleting the video - and it is invisible from the outside. */
  const fresh = await hydrate(ids);
  const noEmbed = new Set(fresh.filter((v) => v.embeddable === false).map((v) => v.id));

  let dead = 0, blocked = 0;
  for (const [conceptId, list] of Object.entries(saved)) {
    for (const v of list) {
      const tag = `${conceptId} · ${v.picked ? "PICKED · " : ""}${v.title}`;
      if (!alive.has(v.id)) { dead++; console.log(`DEAD     ${tag} - ${v.url}`); continue; }
      if (v.picked && noEmbed.has(v.id)) { blocked++; console.log(`NOEMBED  ${tag} - ${v.url}`); }
    }
  }
  console.log(dead ? `\n${dead} of ${ids.length} unreachable.` : `\nAll ${ids.length} videos reachable.`);
  if (blocked) console.log(`${blocked} picked video(s) can no longer be embedded - replace them.`);
}

/* Emit the picked set as an ES module for the app to import. Run after any
   editorial pass so content/videos.json stays the single source of truth. */
async function emit() {
  const data = JSON.parse(await readFile(VIDEOS, "utf8"));
  const out = {};
  for (const [k, list] of Object.entries(data)) {
    const picked = list.filter((v) => v.picked)
      .map(({ id, url, title, channel, duration, note }) => ({ id, url, title, channel, duration, note }));
    if (picked.length) out[k] = picked;
  }
  const path2 = "src/data/videos.js";
  await writeFile(path2,
    "/* Generated from content/videos.json - the picked set only.\n" +
    "   Regenerate with `npm run videos`; do not hand-edit. */\n" +
    "export const VIDEOS = " + JSON.stringify(out, null, 2) + ";\n");
  console.log(`wrote ${path2} - ${Object.values(out).flat().length} videos across ${Object.keys(out).length} concepts`);
}
