# @typed-grid-areas/angular

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`477c9db`](https://github.com/MichaelBuss/typed-grid-areas/commit/477c9db6dcdaadd2db19b12f5e5c4c1e955ac38e) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The Angular adapter: `npm i typed-grid-areas @typed-grid-areas/angular`. `createGrid(definition, { nest })` gives a typed reference per definition, and three standalone directives go on your own elements: `[tgaGrid]="Card"` for the grid, `[tgaArea]="Card.icon"` for each slot, and `tgaSizeContainer` around a grid with breakpoints. With `strictTemplates`, a misspelled area or a grid passed where an area belongs doesn't compile. Each definition's CSS goes into `<head>` once, with your `CSP_NONCE`, including in server-rendered pages, which hydrate without a second copy; in development, misplaced or missing slots warn on the console. Needs Angular 22.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
