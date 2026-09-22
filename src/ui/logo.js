/* The mark: a root and two children on hairline edges, the smallest drawing
   that is unmistakably a tree being ticked. Square blocks, because every other
   container in this system has square corners. Drawn from geometry so it
   inherits ink and survives the negative plate. */
const BLOCKS = [
  { x: 9, y: 2, w: 6, h: 5 },      // root
  { x: 2, y: 15, w: 6, h: 5 },     // left child
  { x: 16, y: 15, w: 6, h: 5 },    // right child
];
const rects = (p) => p.map((r) =>
  `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="currentColor"/>`).join("");
const EDGES = `<path d="M12 7 L12 11 L5 11 L5 15 M12 11 L19 11 L19 15" stroke="currentColor"
    stroke-width="1" fill="none" opacity=".7"/>`;

/** @param {{size?:number, cls?:string}} opts */
export function logoSvg({ size = 22, cls = "logo" } = {}) {
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" aria-hidden="true" focusable="false">${EDGES}${rects(BLOCKS)}</svg>`;
}

/* A favicon renders outside the page, so currentColor has nothing to inherit. */
export function faviconDataUri() {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<style>.m{fill:#14171c;stroke:#14171c}@media(prefers-color-scheme:dark){.m{fill:#eceae5;stroke:#eceae5}}</style>` +
    `<path class="m" fill="none" d="M12 7 L12 11 L5 11 L5 15 M12 11 L19 11 L19 15" stroke-width="1.3"/>` +
    rects(BLOCKS).replace(/fill="currentColor"/g, 'class="m" stroke="none"') +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
