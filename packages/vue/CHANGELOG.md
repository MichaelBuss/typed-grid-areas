# @typed-grid-areas/vue

## 0.1.1

### Patch Changes

- Updated dependencies [[`1007398`](https://github.com/MichaelBuss/typed-grid-areas/commit/100739836f3e71b4654310fa377cc82ae78b2690)]:
  - typed-grid-areas@0.3.0

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`e7f2482`](https://github.com/MichaelBuss/typed-grid-areas/commit/e7f248205d5532756e644d264371c52861827c40) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The Vue adapter: `npm i typed-grid-areas @typed-grid-areas/vue`, then `createGridComponent(definition, { nest })` in `<script setup>` gives the grid's component with a member component per area, used as tags in templates (`<Card>`, `<Card.input>`, `<Card.content.icon>`), all checked by `vue-tsc`. `as-child` renders your own element as a slot or grid, with the attributes merged in. Each definition's CSS goes into `<head>` once in the browser; when server rendering, put `renderGridStyles(ctx)` in your page's `<head>` after `renderToString(app, ctx)`. In development, grids warn about missing required slots and stray children. Needs Vue 3.5 or later.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
