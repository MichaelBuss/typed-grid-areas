# @typed-grid-areas/preact

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`fd9607c`](https://github.com/MichaelBuss/typed-grid-areas/commit/fd9607c730a8b0dbe711ab410ca0b70fea3f0683) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Render grids in Preact 11 with a native adapter (no `preact/compat`): `npm i typed-grid-areas @typed-grid-areas/preact`, then `import { createGridComponent } from "@typed-grid-areas/preact"`. Same API as the React adapter: a component per definition, a slot component per area taking `class` or `className` and any other `div` prop, `asChild` to render your own element as a slot or the grid, `nest`, and the development warnings. In the browser each definition's CSS goes into `<head>` once by itself; for server rendering, wrap the app in `createGridStyleSheet().collect(…)` and put the sheet in `<head>`.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
