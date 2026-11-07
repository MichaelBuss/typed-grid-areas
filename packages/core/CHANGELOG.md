# typed-grid-areas

## 0.3.1

### Patch Changes

- [#71](https://github.com/MichaelBuss/typed-grid-areas/pull/71) [`972d48f`](https://github.com/MichaelBuss/typed-grid-areas/commit/972d48f20f46f8b763d52b8d768a1024e078af15) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The package's description on npm now says what it does: describe a grid once, and every combination of slots lays itself out. The agent skill sends your agent to `node_modules/typed-grid-areas/REFERENCE.md` for your adapter's section of the API reference.

- [#71](https://github.com/MichaelBuss/typed-grid-areas/pull/71) [`972d48f`](https://github.com/MichaelBuss/typed-grid-areas/commit/972d48f20f46f8b763d52b8d768a1024e078af15) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The npm page is now a short overview: what CSS grid template areas are and why they're hard to use with slots that come and go, a before and after, one example, why one grid beats nested flexboxes, that the core has no dependencies and is a few kB gzipped, and a table of every framework's package with its install command. The full API reference, every adapter's section included, moved unchanged to `REFERENCE.md`, which ships in the package next to the README: read it at `node_modules/typed-grid-areas/REFERENCE.md` (or your adapter's package) for the version you installed. The code is unchanged.

## 0.3.0

### Minor Changes

- [#43](https://github.com/MichaelBuss/typed-grid-areas/pull/43) [`1007398`](https://github.com/MichaelBuss/typed-grid-areas/commit/100739836f3e71b4654310fa377cc82ae78b2690) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Ship the typed-grid-areas agent skill in the package, versioned with each release. Run `npx @tanstack/intent@latest install` in your project to let your coding agent load it: it walks the agent through writing a layout, converting hand-written `:has()` CSS or layout JavaScript, and debugging type errors and development warnings.

### Patch Changes

- [`63db22d`](https://github.com/MichaelBuss/typed-grid-areas/commit/63db22d3cfffcd59025461e86a8d79bd56d7673d) Thanks [@man-trackunit](https://github.com/man-trackunit)! - The npm page links to the docs site, which explains how layouts are derived and lets you try the library in your browser: the package's homepage is now https://michaelbuss.github.io/typed-grid-areas/, and the README opens with links to the docs and the Try it page. Every link in the README works on npm, and the package is easier to find by searching for CSS grid layouts and your framework. The code is unchanged.

- [#51](https://github.com/MichaelBuss/typed-grid-areas/pull/51) [`cb8e633`](https://github.com/MichaelBuss/typed-grid-areas/commit/cb8e6336f59fdd3def054ac0b7586c622c01fcd9) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Production builds no longer include the development-only checks. The config validation `defineLayout` runs and each grid's slot check, with their warning messages, are now dropped when your bundler (such as Vite or esbuild) builds for production, so they cost nothing in your app's bundle. In development they warn as before, and importing the library without a bundler, where `process` doesn't exist, still works and logs nothing.

## 0.2.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Build an adapter for another framework on `typed-grid-areas/adapter`. `gridMarkup(definition)` gives the attributes and styles of the grid, its size container and each slot (including where a nested grid's `data-area` goes), plus the CSS and a key to emit it once by. `insertGridStyle` and `gridStyleTags` put that CSS in `<head>` in the browser and on the server (`insertServerGridStyle` for a server DOM that is serialized, such as Angular's), and `createSlotCheck` returns the development warnings about a mounted grid's slots, worded for your framework. The React adapter now renders through it, unchanged.

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - **Breaking:** the React adapter has moved to its own package, and `typed-grid-areas/react` is gone. Install `@typed-grid-areas/react` and import `createGridComponent` from it instead; its API is unchanged. `typed-grid-areas` is now framework-free: no `react` peer dependency and no Radix dependency, just the `.` and `./adapter` entries.

## 0.1.0

### Minor Changes

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Describe a grid once with `defineLayout({ areas, layouts })`: area names (`"name?"` marks an optional one), text templates, `rows`/`columns` track lists, per-area `align`, `when`/`unless` conditions and `breakpoints`. Unknown areas, ragged rows, mismatched track counts and unknown `align`, `when` or `unless` names are compile-time errors on the offending property ([#17](https://github.com/MichaelBuss/typed-grid-areas/issues/17)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Draw only the everything-present layout: for every combination of absent optional areas, the library derives a layout that drops their emptied rows and columns, or fills the hole from a neighbouring area. A later layout with a `when` or `unless` condition still overrides a derived one ([#15](https://github.com/MichaelBuss/typed-grid-areas/issues/15)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Stack areas in a template cell with `base+layer`, for example a badge over the corner of a photo. A layer is drawn over the cells it appears in, a missing optional layer leaves no hole, and `--tga-over` names the area underneath so layered content can restyle itself ([#16](https://github.com/MichaelBuss/typed-grid-areas/issues/16)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - When several layouts match, the one declared last wins, and each applied layout sets tracks, placement and alignment for every area, so nothing leaks in from another match. Areas a layout leaves out are hidden while it applies. Slots are marked with `data-area` and placed by generated CSS in the `typed-grid-areas` cascade layer, so your own classes win over everything but hiding ([#14](https://github.com/MichaelBuss/typed-grid-areas/issues/14)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The README covers defining a grid, optional areas and derived layouts, overrides, breakpoints, layers and their effect on track sizing, rendering with React, and complete PreferenceCard and ID card examples ([#18](https://github.com/MichaelBuss/typed-grid-areas/issues/18)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Breakpoints measure the grid's own width: a grid with breakpoints gets its own size container, so it switches layouts on the room it actually has, whatever containers sit above it ([#6](https://github.com/MichaelBuss/typed-grid-areas/issues/6)).

- [#21](https://github.com/MichaelBuss/typed-grid-areas/pull/21) [`819b12b`](https://github.com/MichaelBuss/typed-grid-areas/commit/819b12be0f0b33654806deb6afcf72182b1f6c69) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Render a definition in React with `createGridComponent`: `<Card>` is the grid and every area is a typed slot component named after it (`<Card.icon>`), with `asChild` to make your own element the slot and `nest` for nested grids (`<Card.content.icon>`). CSS is emitted once per definition however many instances render, and development builds warn about missing required slots and stray children. Needs React 19 ([#18](https://github.com/MichaelBuss/typed-grid-areas/issues/18)).

- [#23](https://github.com/MichaelBuss/typed-grid-areas/pull/23) [`f3764d2`](https://github.com/MichaelBuss/typed-grid-areas/commit/f3764d2fdb6b802b5c506561f0e87ab6cda14d7b) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - Install from npm with `npm i typed-grid-areas`. The package ships compiled ES modules with type declarations for both `typed-grid-areas` and `typed-grid-areas/react`.
