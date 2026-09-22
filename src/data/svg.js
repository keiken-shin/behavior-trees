export function craft(cx, cy, heading, { landed = false } = {}) {
  return `<g class="craft${landed ? " craft--landed" : ""}" transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${heading.toFixed(2)})"><path d="M0 -6 L4 5 L0 3 L-4 5 Z"/></g>`;
}
