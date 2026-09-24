/* Two panes: the graph, repainted every tick, and the world beside it. With
   `cfg.steps` the playground first tells a story, as one live run: Play (or
   Step) ticks the scene's own tree, the graph and the map move together, and
   each step is a moment the run passes through without stopping, its caption
   added to the list under the controls as it lands. After the last moment
   the same run goes on and the rest unlocks: hazards, variants, modes, the
   editor, the goal. Reset starts the current tree again from tick 0: the
   story again while it is still being told, the reader's own tree after.
   "Replay story" tells it again on the scene's own tree. Without steps it is
   unlocked from the start, which is what the checkride uses.

   Nothing here knows it is a drone: `cfg.world` names a WORLDS entry and
   everything comes off that object. Nothing here decides a moment either:
   storyCursor() is shared with the check that proved every moment happens,
   so the run a reader watches is the run the build proved. */
import { start, advance, switchCount } from "../bt/run.js";
import { parse, format, ParseError } from "../bt/parse.js";
import { WORLDS } from "../world/index.js";
import { storyCursor, fill } from "../data/scenes.js";
import { graphView } from "./graph-view.js";
import { el } from "../ui/util.js";
import { esc } from "../data/svg.js";

const RATES = [1, 2, 5, 10, 30, 60];   // ticks per second on the slider
const WATCH = 2;                        // up to this rate a run has time to draw each tick's walk in

export function mountPlayground(host, cfg, { onDone } = {}) {
  const world = WORLDS[cfg.world];
  const leaves = { ...world.leaves, ...(cfg.extraLeaves ?? {}) };
  const W = { ...world, leaves };
  const steps = cfg.steps ?? [];
  /* lastStatus is the interpreter's last answer. A hazard press repaints the
     world without ticking, and painting "Idle" there would put a status on the
     screen that the interpreter never returned. */
  let text = cfg.tree, sim = null, timer = null, rate = 10, done = false, lastStatus = null;
  let story = false;                // the run is the scene's story: locked until its last moment lands
  let cursor = null;                // the story's place in its steps, while story is true

  /* A scene's brief sits under its moments, so the brief appearing at
     unlock moves nothing above the graph. The checkride's playground has no
     steps, and its brief is the task, so there it leads. */
  const brief = cfg.brief ? `<p class="pg__brief">${cfg.brief}</p>` : "";
  host.innerHTML =
    `<div class="pg">` +
      (steps.length ? "" : brief) +
      /* The map gets the whole world pane - putting the board beside it (round
         2) squeezed the map to a fifth of the scene's own width, too narrow to
         read. The board is a slim strip below both panes instead: the readout
         as one line of key-value chips, the write log as one inline line, no
         table. It stays visible whether the story is locked or not, because
         the blackboard chapter's steps read it. */
      `<div class="pg__panes"><div class="pg__tree"></div><div class="pg__world"></div></div>` +
      `<div class="pg__board"><p class="pg__bb"></p><p class="pg__log"></p></div>` +
      /* One bar, like a player's: the controls, the trace as its timeline,
         the rate, and the tick readout, which the trace moves too. */
      `<div class="pg__bar">` +
        `<button class="pg__play" type="button">Play</button>` +
        `<button class="pg__step" type="button">Step</button>` +
        `<button class="pg__reset" type="button">Reset</button>` +
        `<label class="pg__scrub">trace <input type="range" name="trace" min="0" max="0" value="0" aria-label="trace at tick"></label>` +
        `<label class="pg__rate">rate <input type="range" name="rate" min="0" max="${RATES.length - 1}" value="3"><b>10</b> ticks/s</label>` +
        `<span class="pg__tick">tick <b>0</b> · root <i>Idle</i></span>` +
        (cfg.counter ? `<span class="pg__count">switches <b>0</b></span>` : "") +
      `</div>` +
      (steps.length ? `<ol class="pg__say" aria-live="polite"></ol><button class="pg__retell" type="button" hidden>Replay story</button>` + brief : "") +
      `<div class="pg__switches"></div>` +
      `<div class="pg__hazards"></div>` +
      `<div class="pg__goal" hidden></div>` +
      (cfg.editor ? `<div class="pg__edit"><textarea name="tree" spellcheck="false" rows="12"></textarea><p class="pg__err" hidden></p><button type="button" class="pg__apply">Apply tree</button></div>` : "") +
    `</div>`;
  const q = (s) => host.querySelector(s);
  const pg = q(".pg");
  const view = graphView(q(".pg__tree"));

  /* ── the sim ── */
  /* The current tree from tick 0. With `tell` it is the story: locked, its
     moments cleared, and the cursor at the first. Without, it is the reader's
     own run, unlocked, and the moments already told stay on the page. A
     variant, a mode and an applied edit all boot without; the story is told
     only on the scene's own tree (see resetToScene). */
  function boot(tell) {
    stop();
    try { sim = start({ world: W, scenario: cfg.scenario, tree: text }); }
    catch (e) { showErr(e); return; }
    showErr(null);
    cfg.start?.(sim.state);
    view.render(sim.spec, sim.bt);
    lastStatus = null; done = false;
    story = tell && steps.length > 0;
    pg.classList.toggle("pg--story", story);
    if (story) { say.textContent = ""; cursor = storyCursor(steps); }
    if (retell) retell.hidden = story;
    if (cfg.counter) q(".pg__count b").textContent = "0";
    const g = q(".pg__goal"); if (g) { g.hidden = true; g.textContent = ""; }
    paintWorld(null);
    paintScrub();
    if (story) cursor.start(sim).forEach(land);
  }
  function showErr(e) {
    const p = q(".pg__err"); if (!p) { if (e) console.error(e); return; }
    p.hidden = !e; p.textContent = e ? e.message : "";
  }
  /* One tick, from Play or Step: the story's next tick while it is being
     told, a free tick after. */
  function tick() {
    if (!sim) return;
    if (!story) return oneTick();
    const landed = cursor.tick(sim);
    paintAfterTick();
    landed.forEach(land);
  }
  function oneTick(hazard) {
    if (!sim) return;
    const scripted = (cfg.script ?? []).filter((e) => e.at === sim.t + 1).map((e) => W.hazards.find((h) => h.id === e.hazard));
    hazard = [hazard, ...scripted].filter(Boolean);
    advance(sim, hazard);
    paintAfterTick();
  }
  /* The paint half of a tick, shared by free play (oneTick) and the story
     (tick): both push one entry onto sim.history before calling this, so it
     always reads the tick that just happened off the live sim rather than
     being handed a status to paint. */
  function paintAfterTick() {
    const last = sim.history[sim.history.length - 1];
    /* The halt flash is a diff against the tick before this one, not against
       whatever graph-view last painted: after a drag on the trace that is a
       tick many ticks back, and would flash a halt the interpreter never
       had, or miss one it did. */
    view.paint({ t: last.t, status: last.status, trace: last.trace }, sim.history[sim.history.length - 2] ?? { trace: [] }, false, !timer || rate <= WATCH);
    lastStatus = last.status;
    if (cfg.counter) q(".pg__count b").textContent = String(switchCount(sim.history, sim.bt.root.children.map((c) => c.id)));
    paintWorld(last.status);
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
    q(".pg__bb").innerHTML = Object.entries(v).map(([k, x]) => `<span class="pg__kv"><b>${esc(k)}</b> ${esc(x)}</span>`).join(" ");
    q(".pg__log").textContent = sim.bb.log.length
      ? "writes this tick: " + sim.bb.log.map((w) => `${w.node} ${w.key} ${w.from == null ? "" : w.from + " > "}${w.to}`).join(", ")
      : "";
  }
  /* The scrubber replays stored entries into the graph and the tick readout.
     It never re-simulates, and the map stays at the live state, so nothing on
     screen is invented: the graph shows a tick that happened, the map the one
     that is current. Stepping again snaps it back to the end. */
  function paintScrub() {
    const r = q(".pg__scrub input"); const n = sim.history.length;
    r.max = String(Math.max(0, n - 1)); r.value = String(Math.max(0, n - 1)); r.disabled = n < 2;
  }
  q(".pg__scrub input").oninput = (e) => {
    if (!sim) return;
    const i = Number(e.target.value);
    if (!sim.history[i]) return;
    view.replay(sim.history, i);
    q(".pg__tick b").textContent = String(sim.history[i].t);
    q(".pg__tick i").textContent = sim.history[i].status;
  };

  /* Back to the scene's own tree: the story it is about to tell again is the
     one the build proved for cfg.tree, not for whatever variant, mode or
     edit the reader last chose. Replay story calls this before booting, so
     the reader can never watch a moment's real caption land on a tree that
     never earned it. */
  function resetToScene() {
    text = cfg.tree;
    sw.querySelectorAll(".pg__var").forEach((x, i) => x.classList.toggle("on", i === 0));
    const sel = q(".pg__mode select");
    if (sel) sel.value = parse(text, leaves).mode ?? "reactive";
    if (q("textarea")) q("textarea").value = text;
  }

  /* ── the story ── */
  /* The moments land in a list, not one line: two of them can land a tick
     apart, a tenth of a second at the default rate, and a caption replaced
     that fast is a caption nobody read. The newest reads in full ink. */
  const say = q(".pg__say"), retell = q(".pg__retell");
  function land({ i, t, ok }) {
    const step = steps[i];
    say.appendChild(el("li", "", esc(ok ? fill(step.say, t) : `This did not happen within ${step.cap ?? 600} ticks.`)));
    if (ok && step.show) view.show(step.show);
    if (!cursor.done) return;
    /* The last moment: the same run goes on, now the reader's. */
    story = false; pg.classList.remove("pg--story"); retell.hidden = false;
    /* A scene with no goal still owes onDone once the story is fully told. */
    if (!cfg.goal && !done) { done = true; onDone?.(); }
  }
  /* The button hides itself while the story is told, so keyboard focus moves
     to the one that now pauses it rather than dropping to the page. */
  if (retell) retell.onclick = () => {
    if (!sim) return;
    const held = retell.matches(":focus-visible");
    resetToScene(); boot(true); play();
    if (held) q(".pg__play").focus({ preventScroll: true });
  };

  /* ── the controls ── */
  function play() {
    if (!sim || timer) return;
    q(".pg__play").textContent = "Pause";
    timer = setInterval(tick, 1000 / rate);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    const b = q(".pg__play"); if (b) b.textContent = "Play";
  }
  q(".pg__step").onclick = () => { if (!sim) return; stop(); tick(); };
  q(".pg__play").onclick = () => (timer ? stop() : play());
  /* Reset starts the tree the reader has now again at tick 0: the story
     again while it is still being told (its hazards are still hidden, so
     there is nothing else to start), the reader's own run once it has been. */
  q(".pg__reset").onclick = () => { if (!sim) return; boot(story); };
  q(".pg__rate input").oninput = (e) => { rate = RATES[e.target.value]; q(".pg__rate b").textContent = String(rate); if (timer) { stop(); play(); } };

  /* variants and the mode toggle */
  const sw = q(".pg__switches");
  (cfg.variants ?? []).forEach((v, i) => {
    const b = el("button", "pg__var" + (i === 0 ? " on" : ""), v.label); b.type = "button";
    b.onclick = () => {
      if (!sim) return;
      sw.querySelectorAll(".pg__var").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      text = v.tree;
      if (q("textarea")) q("textarea").value = text;
      /* The mode select is a view of the root's mode, so a variant that carries
         its own mode has to move it. Chapter 7 is the one chapter with both
         controls, and it could read "memory" over a tree that is reactive. */
      const sel = q(".pg__mode select");
      if (sel) sel.value = parse(text, leaves).mode ?? "reactive";
      boot(false);
    };
    sw.appendChild(b);
  });
  if (cfg.modes) {
    const lab = el("label", "pg__mode", `root mode <select name="mode"><option>reactive</option><option>memory</option><option>keep</option></select>`);
    const sel = lab.querySelector("select");
    sel.value = parse(text, leaves).mode ?? "reactive";
    sel.onchange = (e) => {
      if (!sim) return;
      const spec = parse(text, leaves);
      if (spec.kind !== "Sequence" && spec.kind !== "Fallback") return;
      /* Reactive is the default and is written as no mode at all, as the
         variants write it, so the comparison below can find the match. */
      spec.mode = e.target.value === "reactive" ? undefined : e.target.value; text = format(spec);
      if (q("textarea")) q("textarea").value = text;
      /* The highlighted variant has to be the tree now running, or none. */
      sw.querySelectorAll(".pg__var").forEach((x, i) => x.classList.toggle("on", format(parse(cfg.variants[i].tree, leaves)) === text));
      boot(false);
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
      if (!sim) return;
      try { parse(q("textarea").value, leaves); text = q("textarea").value; boot(false); }
      catch (e) { showErr(e instanceof ParseError ? e : new Error(e.message)); }
    };
  }

  boot(true);
  return () => { stop(); view.destroy(); sim = null; };
}
