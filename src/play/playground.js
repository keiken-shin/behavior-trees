/* Two panes: the tree, repainted every tick, and the world beside it. The
   reader steps ticks, plays them at a chosen rate, flips variants and modes,
   injects hazards, and (in the checkride and chapter 12) edits the tree as
   text. Nothing here knows it is a drone: `cfg.world` names a WORLDS entry
   and everything the playground needs comes off that object. */
import { start, advance } from "../bt/run.js";
import { parse, format, ParseError } from "../bt/parse.js";
import { WORLDS } from "../data/plays.js";
import { treeView } from "./tree-view.js";
import { el } from "../ui/util.js";

const RATES = [1, 2, 5, 10, 30, 60];   // ticks per second on the slider

export function mountPlayground(host, cfg, { onDone } = {}) {
  const world = WORLDS[cfg.world];
  const leaves = { ...world.leaves, ...(cfg.extraLeaves ?? {}) };
  const W = { ...world, leaves };
  let text = cfg.tree, sim = null, timer = null, rate = 10, done = false, lastPick = null, switches = 0;

  host.innerHTML =
    `<div class="pg">` +
      `<p class="pg__brief">${cfg.brief}</p>` +
      `<div class="pg__panes"><div class="pg__tree"></div><div class="pg__world"></div></div>` +
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
  const view = treeView(q(".pg__tree"));

  function boot() {
    stop();
    try { sim = start({ world: W, scenario: cfg.scenario, tree: text }); }
    catch (e) { showErr(e); return; }
    showErr(null);
    cfg.start?.(sim.state);
    view.render(sim.spec);
    view.clear();
    lastPick = null; switches = 0; done = false;
    if (cfg.counter) q(".pg__count b").textContent = "0";
    paintWorld(null);
  }
  function showErr(e) {
    const p = q(".pg__err"); if (!p) { if (e) console.error(e); return; }
    p.hidden = !e; p.textContent = e ? e.message : "";
  }
  function oneTick(hazard) {
    if (!sim) return;
    const { status, trace } = advance(sim, hazard);
    view.paint(trace);
    if (cfg.counter) {
      /* The trace is post-order (a node is pushed after its children), so the
         LAST root child in it is the branch that decided the root's answer. */
      const kids = new Set(sim.bt.root.children.map((c) => c.id));
      const pick = [...trace].reverse().find((t) => kids.has(t.id))?.id ?? null;
      if (lastPick !== null && pick !== lastPick) switches++;
      lastPick = pick;
      q(".pg__count b").textContent = String(switches);
    }
    paintWorld(status);
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
    b.onclick = () => { sw.querySelectorAll(".pg__var").forEach((x) => x.classList.remove("on")); b.classList.add("on"); text = v.tree; if (q("textarea")) q("textarea").value = text; boot(); };
    sw.appendChild(b);
  });
  if (cfg.modes) {
    const lab = el("label", "pg__mode", `root mode <select><option>reactive</option><option>memory</option><option>keep</option></select>`);
    lab.querySelector("select").onchange = (e) => {
      const spec = parse(text, leaves);
      if (spec.kind === "Sequence" || spec.kind === "Fallback") { spec.mode = e.target.value; text = format(spec); if (q("textarea")) q("textarea").value = text; boot(); }
    };
    sw.appendChild(lab);
  }
  /* hazards */
  const hz = q(".pg__hazards");
  (cfg.hazards ?? []).forEach((id) => {
    const h = W.hazards.find((x) => x.id === id); if (!h) return;
    const b = el("button", "pg__hz", h.label); b.type = "button";
    b.onclick = () => { if (!sim) return; h.apply(sim.state); paintWorld(null); };
    hz.appendChild(b);
  });
  /* editor */
  if (cfg.editor) {
    q("textarea").value = text;
    q(".pg__apply").onclick = () => {
      try { parse(q("textarea").value, leaves); text = q("textarea").value; boot(); }
      catch (e) { showErr(e instanceof ParseError ? e : new Error(e.message)); }
    };
  }

  boot();
  return () => { stop(); sim = null; };
}
