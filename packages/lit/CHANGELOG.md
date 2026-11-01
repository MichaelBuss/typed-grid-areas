# @typed-grid-areas/lit

## 0.1.1

### Patch Changes

- Updated dependencies [[`1007398`](https://github.com/MichaelBuss/typed-grid-areas/commit/100739836f3e71b4654310fa377cc82ae78b2690)]:
  - typed-grid-areas@0.3.0

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`f191dd2`](https://github.com/MichaelBuss/typed-grid-areas/commit/f191dd21f8583af3061f7e5740989cb721edc329) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Render grids in Lit 3: `npm i typed-grid-areas @typed-grid-areas/lit`, then `createGrid(definition)` gives a template function per definition. `Card(content, { class, style, ref })` renders the grid in light DOM, and `Card.icon` is the area's name typed as a literal, so `data-area=${Card.icon}` makes any element its slot and a misspelled area is a type error. `nest` reaches a nested grid's areas through its area (`Card.content.icon`). Each definition's CSS is adopted once into the shadow root a grid renders in (or put in `<head>` in the document); `gridStyles(Card)` in `static styles` carries it into `@lit-labs/ssr`'s declarative shadow roots for server rendering and hydration. In development, a missing required slot or a stray direct child warns on the console.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
