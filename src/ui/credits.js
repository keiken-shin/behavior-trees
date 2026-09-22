import { COURSE } from "../data/lessons.js";
/* Credits - a manual's back page, where the sources are listed.
 *
 * The channel list is DERIVED from the shipped video set, not typed here, so a
 * curation pass can never leave somebody uncredited. Everything else is a fixed
 * record of what this project is built out of.
 */

import { VIDEOS } from "../data/videos.js";
import UNREACHABLE from "../../content/unreachable.json";
import { el, mark } from "./util.js";

/* Owed for material this course could not have been built without. */
const SOURCES = [
  {
    name: "Colledanchise and Ogren, Behavior Trees in Robotics and AI",
    who: "Michele Colledanchise and Petter Ogren",
    lic: "open access on arXiv",
    url: "https://arxiv.org/abs/1709.00084",
    what:
      "The textbook this course teaches from (CRC Press 2018; arXiv 1709.00084). The node " +
      "definitions, algorithms 1 to 3, the memory node caution, the behavior tree versus " +
      "finite state machine argument and the design chapter all come from here, and every " +
      "one of chapters 1 to 12 rests on it. The interpreter is asserted against algorithms " +
      "1 to 3 directly in scripts/check-bt.mjs, not just read and paraphrased.",
  },
  {
    name: "BehaviorTree.CPP",
    who: "Davide Faconti and contributors",
    lic: "MIT",
    url: "https://www.behaviortree.dev/",
    what:
      "The Sequence and Fallback comparison tables, which define this course's memory and " +
      "keep modes, the condition rule, the halt rule and the blackboard. No code from the " +
      "library is used anywhere in this course - only its documentation, read.",
  },
  {
    name: "ROS 2 Nav2",
    who: "Steve Macenski and the Nav2 contributors",
    lic: "Apache License 2.0",
    url: "https://docs.nav2.org/",
    what:
      "content/nav2.xml is copied verbatim from the Nav2 repository and drawn, not executed, " +
      "in chapter 12. The walkthrough and node reference documentation are cited beside it.",
  },
  {
    name: "Klockner, Behavior Trees for UAV Mission Management",
    who: "Klockner",
    lic: "DLR e-library",
    url: "https://elib.dlr.de/91679/1/kloeckner2013behavior.pdf",
    what: "The placement of the tree above the autopilot, and the waypoint success condition case in chapter 7.",
  },
  {
    name: "Aerostack2 and drone_trees",
    who: "Fernandez-Cortizas et al.; the Bristol Flight Lab",
    lic: "cited, not copied",
    url: "https://github.com/BristolFlightLab/drone_trees",
    what: "Two more real drone projects that place the tree above PX4, ArduPilot or MAVLink; cited in chapter 12.",
  },
  {
    name: "PX4 and ArduPilot documentation",
    who: "The PX4 and ArduPilot projects",
    lic: "cited, not copied",
    url: "https://docs.px4.io/main/en/modules/modules_system.html",
    what: "The evidence that neither autopilot is a behavior tree.",
  },
  {
    name: "Ghzouli et al., SLE 2020 and IEEE TSE 2023",
    who: "Ghzouli, Berger, Johnsen, Dragule, Wasowski, and coauthors",
    lic: "peer reviewed, cited",
    url: "https://arxiv.org/abs/2208.04211",
    what: "The node share and the state machine versus tree counts.",
  },
  {
    name: "Game AI Pro, chapters by Champandard and Dunstan, and by Francis",
    who: "Alex J. Champandard, Marc Dunstan, Anthony Francis",
    lic: "free from gameaipro.com",
    url: "https://www.gameaipro.com/",
    what: "The games lineage vocabulary and the three pitfalls.",
  },
  {
    name: "Isla, Handling Complexity in the Halo 2 AI",
    who: "Damian Isla",
    lic: "cited, not copied",
    url: "https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai",
    what: "Where the idea came from.",
  },
  {
    name: "Anguelov, and the AI Arborist GDC 2017 talk",
    who: "Bobby Anguelov; Vehkala, Anguelov, Weber",
    lic: "cited, not copied",
    url: "https://takinginitiative.net/2020/01/07/behavior-trees-breaking-the-cycle-of-misuse/",
    what: "The practitioner critique quoted in chapter 11.",
  },
  {
    name: "Archivo, Archivo Narrow, JetBrains Mono",
    who: "Omnibus-Type, and JetBrains",
    lic: "SIL Open Font License 1.1",
    url: "https://fontsource.org/",
    what:
      "The plate's lettering, self-hosted through Fontsource so the course loads no " +
      "third-party font service.",
  },
];

export function renderCredits(root) {
  root.innerHTML = "";
  document.title = `Sources · ${COURSE}`;

  const wrap = el("div", "cards");
  const head = el("div", "cards__head");
  const h = el("h1", "t-display");
  h.textContent = "Sources";
  const p = el("p", "cards__lede");
  p.textContent =
    "This course is mostly other people's work, rearranged. The definitions that make " +
    "the tree correct, and the real trees that prove it is not just theory, are all " +
    "borrowed. Here is who from.";
  head.append(h, p);
  wrap.appendChild(head);

  const body = el("div", "cards__body");

  // ── libraries, data, type ──
  body.appendChild(el("h2", "t-h2 cards__h2", "Built on"));
  SOURCES.forEach((s) => {
    const c = el("div", "src");
    c.innerHTML =
      `<div class="src__cap"><span>${s.name}</span><span>${s.lic}</span></div>` +
      `<p class="src__who">${s.who}</p>` +
      `<p class="src__what">${s.what}</p>` +
      (s.url ? `<a class="src__url" href="${s.url}" target="_blank" rel="noopener noreferrer">${s.url}</a>` : "");
    body.appendChild(c);
  });

  /* ── the channels ──
     Counted from the shipped set so this list cannot fall behind curation. */
  const byChannel = new Map();
  for (const list of Object.values(VIDEOS)) {
    for (const v of list) {
      if (!byChannel.has(v.channel)) byChannel.set(v.channel, []);
      byChannel.get(v.channel).push(v);
    }
  }
  const channels = [...byChannel.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const total = channels.reduce((n, [, v]) => n + v.length, 0);

  body.appendChild(el("h2", "t-h2 cards__h2", "The channels"));
  body.appendChild(el("p", "cards__note",
    `${total} videos from ${channels.length} channels, each chosen by hand and each ` +
    `credited to whoever made it. They are embedded and played inside this course rather ` +
    `than linked away, which is a decision about the reader's attention and not about ` +
    `whose work it is - every clip is theirs, hosted on their channel, and their view ` +
    `count is unaffected.`));

  const table = el("table", "index credits__list");
  table.innerHTML = "<thead><tr><th>Channel</th><th>Used for</th><th>Clips</th></tr></thead>";
  const tb = el("tbody");
  channels.forEach(([name, vids]) => {
    const tr = el("tr");
    tr.innerHTML =
      `<td><b>${name}</b></td>` +
      `<td class="c-rem">${vids.map((v) => v.title).join(" · ")}</td>` +
      `<td class="c-item">${vids.length}</td>`;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  body.appendChild(table);

  /* ── what could not be checked ──
     Verbatim from RESEARCH.md section 6, so the page cannot claim more
     certainty than the research actually reached. */
  body.appendChild(el("h2", "t-h2 cards__h2", "Could not be reached"));
  body.appendChild(el("p", "cards__note",
    "Every source below was looked for and not found, or found and not readable. Named " +
    "rather than left silent, because a gap that is not admitted reads as a gap that " +
    "was never noticed."));
  UNREACHABLE.forEach((u) => {
    body.appendChild(el("p", "cards__note", `<b>${u.what}</b> - ${u.why}`));
  });

  const foot = el("p", "cards__note credits__foot");
  foot.innerHTML =
    "If you made something listed here and would rather it were not used, say so and it " +
    "comes out of the next curation pass.";
  body.appendChild(foot);

  const home = el("a", "cards__go", `${mark("left")}<span>Back to the index</span>`);
  home.href = "#";
  home.style.marginTop = "28px";
  body.appendChild(home);

  wrap.appendChild(body);
  root.appendChild(wrap);
}

/* Sits at the very foot of the index, under the checkride - the last page of
   the manual, which is where a sources list belongs. */
export function creditsStrip() {
  const n = Object.values(VIDEOS).flat().length;
  const ch = new Set(Object.values(VIDEOS).flat().map((v) => v.channel)).size;
  const a = el("a", "catalogue catalogue--src",
    `<span class="catalogue__t">Sources</span>` +
    `<span class="catalogue__n">The textbook · ${ch} channels · ${n} clips</span>` + mark());
  a.href = "#credits";
  return a;
}
