# @typed-grid-areas/preact

## 0.1.2

### Patch Changes

- [#71](https://github.com/MichaelBuss/typed-grid-areas/pull/71) [`972d48f`](https://github.com/MichaelBuss/typed-grid-areas/commit/972d48f20f46f8b763d52b8d768a1024e078af15) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The npm page is now a short overview: what CSS grid template areas are and why they're hard to use with slots that come and go, a before and after, one example, why one grid beats nested flexboxes, that the core has no dependencies and is a few kB gzipped, and a table of every framework's package with its install command. The full API reference, every adapter's section included, moved unchanged to `REFERENCE.md`, which ships in the package next to the README: read it at `node_modules/typed-grid-areas/REFERENCE.md` (or your adapter's package) for the version you installed. The code is unchanged.
- Updated dependencies [[`972d48f`](https://github.com/MichaelBuss/typed-grid-areas/commit/972d48f20f46f8b763d52b8d768a1024e078af15), [`972d48f`](https://github.com/MichaelBuss/typed-grid-areas/commit/972d48f20f46f8b763d52b8d768a1024e078af15)]:
  - typed-grid-areas@0.3.1

## 0.1.1

### Patch Changes

- [`63db22d`](https://github.com/MichaelBuss/typed-grid-areas/commit/63db22d3cfffcd59025461e86a8d79bd56d7673d) Thanks [@man-trackunit](https://github.com/man-trackunit)! - The npm page links to the docs site, which explains how layouts are derived and lets you try the library in your browser: the package's homepage is now https://michaelbuss.github.io/typed-grid-areas/, and the README opens with links to the docs and the Try it page. Every link in the README works on npm, and the package is easier to find by searching for CSS grid layouts and your framework. The code is unchanged.

- [#51](https://github.com/MichaelBuss/typed-grid-areas/pull/51) [`cb8e633`](https://github.com/MichaelBuss/typed-grid-areas/commit/cb8e6336f59fdd3def054ac0b7586c622c01fcd9) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Production builds no longer include the development-only checks. The config validation `defineLayout` runs and each grid's slot check, with their warning messages, are now dropped when your bundler (such as Vite or esbuild) builds for production, so they cost nothing in your app's bundle. In development they warn as before, and importing the library without a bundler, where `process` doesn't exist, still works and logs nothing.
- Updated dependencies [[`1007398`](https://github.com/MichaelBuss/typed-grid-areas/commit/100739836f3e71b4654310fa377cc82ae78b2690), [`63db22d`](https://github.com/MichaelBuss/typed-grid-areas/commit/63db22d3cfffcd59025461e86a8d79bd56d7673d), [`cb8e633`](https://github.com/MichaelBuss/typed-grid-areas/commit/cb8e6336f59fdd3def054ac0b7586c622c01fcd9)]:
  - typed-grid-areas@0.3.0

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`fd9607c`](https://github.com/MichaelBuss/typed-grid-areas/commit/fd9607c730a8b0dbe711ab410ca0b70fea3f0683) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Render grids in Preact 11 with a native adapter (no `preact/compat`): `npm i typed-grid-areas @typed-grid-areas/preact`, then `import { createGridComponent } from "@typed-grid-areas/preact"`. Same API as the React adapter: a component per definition, a slot component per area taking `class` or `className` and any other `div` prop, `asChild` to render your own element as a slot or the grid, `nest`, and the development warnings. In the browser each definition's CSS goes into `<head>` once by itself; for server rendering, wrap the app in `createGridStyleSheet().collect(…)` and put the sheet in `<head>`.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
