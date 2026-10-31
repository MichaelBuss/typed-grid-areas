---
"@typed-grid-areas/angular": minor
---

The Angular adapter: `npm i typed-grid-areas @typed-grid-areas/angular`. `createGrid(definition, { nest })` gives a typed reference per definition, and three standalone directives go on your own elements: `[tgaGrid]="Card"` for the grid, `[tgaArea]="Card.icon"` for each slot, and `tgaSizeContainer` around a grid with breakpoints. With `strictTemplates`, a misspelled area or a grid passed where an area belongs doesn't compile. Each definition's CSS goes into `<head>` once, with your `CSP_NONCE`, including in server-rendered pages, which hydrate without a second copy; in development, misplaced or missing slots warn on the console. Needs Angular 22.
