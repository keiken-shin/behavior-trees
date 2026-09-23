/* Two panes: the graph, repainted every tick, and the world beside it. With
   `cfg.steps` the playground first tells a story: each step runs the sim to
   its moment at 20 ticks a second (or at once, with skip), stops, and shows
   its caption. After the last step the controls unlock: Step, Play, rate,
   Reset, hazards, variants, modes, the editor, the goal. Without steps it is
   unlocked from the start, which is what the checkride uses.

   Nothing here knows it is a drone: `cfg.world` names a WORLDS entry and
   everything comes off that object. Nothing here decides a step's stop either:
   stepDone() is shared with the check that proved every step happens. */
import { start, advance, switchCount } from "../bt/run.js";
import { parse, format, ParseError } from "../bt/parse.js";
import { WORLDS } from "../world/index.js";
import { stepDone, fill } from "../data/scenes.js";
import { graphView } from "./graph-view.js";
import { el } from "../ui/util.js";

const RATES = [1, 2, 5, 10, 30, 60];   // ticks per second on the slider
const STORY_RATE = 20;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");

export function mountPlayground(host, cfg, { onDone } = {}) {
  const world = WORLDS[cfg.world];
  const leaves = { ...world.leaves, ...(cfg.extraLeaves ?? {}) };
  const W = { ...world, leaves };
  const steps = cfg.steps ?? [];
  let text = cfg.tree, sim = null, timer = null, rate = 10, done = false, lastStatus = null;
  let at = 0;                       // steps completed so far
  let story = steps.length > 0;     // locked until the last step has run

  host.innerHTML =
    `<div class="pg${story ? " pg--story" : ""}">` +
      (cfg.brief ? `<p class="pg__brief">${cfg.brief}</p>` : "") +
      `<div class="pg__panes"><div class="pg__tree"></div><div class="pg__world"></div></div>` +
      `<label class="pg__scrub">trace at tick <b>0</b> <input type="range" min="0" max="0" value="0"></label>` +
      (steps.length ? `<div class="pg__story"><div class="pg__steps"></div><p class="pg__say"></p></div>` : "") +
      `<div class="pg__bar">` +
        `<button class="pg__step" type="button">Step</button>` +
        `<button class="pg__play" type="button">Play</button>` +
        `<button class="pg__reset" type="button">Reset</button>` +
        `<label class="pg__rate">rate <input type="range" min="0" max="${RATES.length - 1}" value="3"><b>10</b> ticks/s</label>` +
        `<span class="pg__tick">tick <b>0</b> · root <i>Idle</i></span>` +
        (cfg.counter ? `<span class="pg__count">switches <b>0</b></span>` : "") +
      `</div>` +
      `<div class="pg__switches"></div>` +
      `<div class="pg__hazards"></div>` +
      `<div class="pg__goal" hidden></div>` +
      `<div class="pg__board"><table class="pg__bb"></table><table class="pg__log"></table></div>` +
      (cfg.editor ? `<div class="pg__edit"><textarea spellcheck="false" rows="12"></textarea><p class="pg__err" hidden></p><button type="button" class="pg__apply">Apply tree</button></div>` : "") +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const pg = q(".pg");
  const view = graphView(q(".pg__tree"));

  /* ── the sim ── */
  function boot() {
    stop();
    try { sim = start({ world: W, scenario: cfg.scenario, tree: text }); }
    catch (e) { showErr(e); return; }
    showErr(null);
    cfg.start?.(sim.state);
    view.render(sim.spec, sim.bt);
    lastStatus = null; done = false; at = 0; story = steps.length > 0;
    pg.classList.toggle("pg--story", story);
    if (cfg.counter) q(".pg__count b").textContent = "0";
    paintWorld(null);
    paintScrub();
    paintStory();
  }
  function showErr(e) {
    const p = q(".pg__err"); if (!p) { if (e) console.error(e); return; }
    p.hidden = !e; p.textContent = e ? e.message : "";
  }
  function oneTick(hazard) {
    if (!sim) return;
    const scripted = (cfg.script ?? []).filter((e) => e.at === sim.t + 1).map((e) => W.hazards.find((h) => h.id === e.hazard));
    hazard = [hazard, ...scripted].filter(Boolean);
    const { status, trace } = advance(sim, hazard);
    view.paint({ t: sim.t, status, trace });
    lastStatus = status;
    if (cfg.counter) q(".pg__count b").textContent = String(switchCount(sim.history, sim.bt.root.children.map((c) => c.id)));
    paintWorld(status);
    paintScrub();
    if (!done && cfg.goal?.test(sim.state, sim.history)) {
      done = true;
      const g = q(".pg__goal"); g.hidden = false; g.textContent = cfg.goal.done;
      onDone?.();
    }
  }
  function paintWorld(status) {
    q(".pg__world").innerHTML = W.draw(sim.state);
    q(".pg__tick b").textContent = String(sim.t);
    q(".pg__tick i").textContent = status ?? "Idle";
    const v = W.view(sim.state);
    q(".pg__bb").innerHTML = Object.entries(v).map(([k, x]) => `<tr><th>${k}</th><td>${x}</td></tr>`).join("");
    q(".pg__log").innerHTML = sim.bb.log.length
      ? `<tr><th colspan="4">writes this tick</th></tr>` + sim.bb.log.map((w) => `<tr><td>${w.node}</td><td>${w.key}</td><td>${w.from ?? ""}</td><td>${w.to}</td></tr>`).join("")
      : "";
  }
  /* The scrubber replays stored entries into the graph and the tick readout.
     It never re-simulates, and the map stays at the live state, so nothing on
     screen is invented: the graph shows a tick that happened, the map the one
     that is current. Stepping again snaps it back to the end. */
  function paintScrub() {
    const r = q(".pg__scrub input"); const n = sim.history.length;
    r.max = String(Math.max(0, n - 1)); r.value = String(Math.max(0, n - 1)); r.disabled = n < 2;
    q(".pg__scrub b").textContent = String(sim.t);
  }
  q(".pg__scrub input").oninput = (e) => {
    const i = Number(e.target.value);
    if (!sim.history[i]) return;
    view.replay(sim.history, i);
    q(".pg__scrub b").textContent = String(sim.history[i].t);
    q(".pg__tick b").textContent = String(sim.history[i].t);
    q(".pg__tick i").textContent = sim.history[i].status;
  };

  /* ── the story ── */
  function paintStory() {
    if (!steps.length) return;
    const box = q(".pg__steps"); box.innerHTML = "";
    steps.forEach((s, i) => {
      const b = el("button", "pg__stepbtn", String(i + 1)); b.type = "button";
      b.dataset.at = i < at ? "done" : i === at ? "now" : "todo";
      b.setAttribute("aria-label", `step ${i + 1} of ${steps.length}`);
      b.onclick = () => runTo(i, true);
      box.appendChild(b);
    });
    if (at < steps.length) {
      const next = el("button", "pg__next", at === 0 ? "Start" : "Next"); next.type = "button";
      next.onclick = () => runTo(at, false);
      const skip = el("button", "pg__skip", "skip"); skip.type = "button";
      skip.onclick = () => runTo(at, true);
      box.append(next, skip);
    }
    q(".pg__say").textContent = at === 0 ? "" : q(".pg__say").textContent;
  }
  /* Run step i. A click on an earlier step replays from the start at once;
     the current step animates unless `fast`. */
  function runTo(i, fast) {
    stop();
    if (i < at) { boot(); for (let k = 0; k < i; k++) runStep(k, true); }
    runStep(i, fast || REDUCED.matches);
  }
  function runStep(i, fast) {
    const step = steps[i];
    const cap = sim.t + (step.cap ?? 600);
    let first = true;
    const tick = () => {
      const hz = first && step.hazard ? W.hazards.find((h) => h.id === step.hazard) : undefined;
      first = false;
      oneTick(hz);
    };
    const finish = (ok) => {
      stop();
      at = i + 1;
      q(".pg__say").textContent = ok ? fill(step.say, sim.t) : `This did not happen within ${step.cap ?? 600} ticks.`;
      if (at === steps.length) { story = false; pg.classList.remove("pg--story"); }
      paintStory();
    };
    const predicateAlready = typeof step.to !== "number" && stepDone(sim, step);
    if (predicateAlready) return finish(true);
    if (fast) { while (!stepDone(sim, step) && sim.t < cap) tick(); return finish(stepDone(sim, step)); }
    timer = setInterval(() => {
      tick();
      if (stepDone(sim, step)) finish(true);
      else if (sim.t >= cap) finish(false);
    }, 1000 / STORY_RATE);
  }

  /* ── free play ── */
  function play() {
    if (timer) return;
    q(".pg__play").textContent = "Pause";
    timer = setInterval(() => oneTick(), 1000 / rate);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    const b = q(".pg__play"); if (b) b.textContent = "Play";
  }
  q(".pg__step").onclick = () => { stop(); oneTick(); };
  q(".pg__play").onclick = () => (timer ? stop() : play());
  q(".pg__reset").onclick = boot;
  q(".pg__rate input").oninput = (e) => { rate = RATES[e.target.value]; q(".pg__rate b").textContent = String(rate); if (timer) { stop(); play(); } };

  /* variants and the mode toggle */
  const sw = q(".pg__switches");
  (cfg.variants ?? []).forEach((v, i) => {
    const b = el("button", "pg__var" + (i === 0 ? " on" : ""), v.label); b.type = "button";
    b.onclick = () => {
      sw.querySelectorAll(".pg__var").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      text = v.tree;
      if (q("textarea")) q("textarea").value = text;
      const sel = q(".pg__mode select");
      if (sel) sel.value = parse(text, leaves).mode ?? "reactive";
      boot();
      /* A variant is the reader's own choice, so it opens unlocked: the story was
         told on the scene's own tree. */
      story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory();
    };
    sw.appendChild(b);
  });
  if (cfg.modes) {
    const lab = el("label", "pg__mode", `root mode <select><option>reactive</option><option>memory</option><option>keep</option></select>`);
    const sel = lab.querySelector("select");
    sel.value = parse(text, leaves).mode ?? "reactive";
    sel.onchange = (e) => {
      const spec = parse(text, leaves);
      if (spec.kind === "Sequence" || spec.kind === "Fallback") { spec.mode = e.target.value; text = format(spec); if (q("textarea")) q("textarea").value = text; boot(); story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory(); }
    };
    sw.appendChild(lab);
  }
  /* hazards */
  const hz = q(".pg__hazards");
  (cfg.hazards ?? []).forEach((id) => {
    const h = W.hazards.find((x) => x.id === id); if (!h) return;
    const b = el("button", "pg__hz", h.label); b.type = "button";
    b.onclick = () => { if (!sim) return; h.apply(sim.state); paintWorld(lastStatus); };
    hz.appendChild(b);
  });
  /* editor */
  if (cfg.editor) {
    q("textarea").value = text;
    q(".pg__apply").onclick = () => {
      try { parse(q("textarea").value, leaves); text = q("textarea").value; boot(); story = false; pg.classList.remove("pg--story"); at = steps.length; paintStory(); }
      catch (e) { showErr(e instanceof ParseError ? e : new Error(e.message)); }
    };
  }

  boot();
  return () => { stop(); view.destroy(); sim = null; };
}
