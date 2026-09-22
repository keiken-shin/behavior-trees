/* Draws a tree as SVG and repaints it from a trace. Layout comes from
   layout.js, shapes from svg.js, so this is the plate primitives made live. */
import { layout } from "../bt/layout.js";
import { node, edge } from "../data/svg.js";

const ST = { Success: "ok", Failure: "fail", Running: "run" };

export function treeView(host) {
  let svg = null, byId = new Map();
  return {
    render(spec) {
      const L = layout(spec, { nodeW: 104, nodeH: 34, hGap: 8, vGap: 44 });
      host.innerHTML =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.w} ${L.h}" class="figure tree-live" role="img" aria-label="The tree, repainted every tick">` +
        `<defs><pattern id="hatch-live" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>` +
        L.edges.map((e) => edge(e.x1, e.y1, e.x2, e.y2)).join("") +
        L.nodes.map((d) => node(d.kind, d.x, d.y, d.label, { w: d.w, h: d.h }).replace("<g class=", `<g data-id="${d.id}" class=`)).join("") +
        `</svg>`;
      svg = host.firstElementChild;
      byId = new Map([...svg.querySelectorAll("g[data-id]")].map((g) => [g.dataset.id, g]));
    },
    paint(trace) {
      for (const g of byId.values()) { g.classList.remove("st-ok", "st-fail", "st-run", "dirty", "err"); g.classList.add("st-idle"); }
      for (const t of trace) {
        const g = byId.get(t.id);
        if (!g) continue;
        g.classList.remove("st-idle");
        g.classList.add(`st-${ST[t.status] ?? "idle"}`);
        if (t.dirty) g.classList.add("dirty");
        if (t.error) { g.classList.add("err"); g.querySelector("title")?.remove(); g.insertAdjacentHTML("afterbegin", `<title>${t.error}</title>`); }
      }
    },
    clear() { this.paint([]); },
  };
}
