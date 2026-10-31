---
"@typed-grid-areas/preact": minor
---

Render grids in Preact 11 with a native adapter (no `preact/compat`): `npm i typed-grid-areas @typed-grid-areas/preact`, then `import { createGridComponent } from "@typed-grid-areas/preact"`. Same API as the React adapter: a component per definition, a slot component per area taking `class` or `className` and any other `div` prop, `asChild` to render your own element as a slot or the grid, `nest`, and the development warnings. In the browser each definition's CSS goes into `<head>` once by itself; for server rendering, wrap the app in `createGridStyleSheet().collect(…)` and put the sheet in `<head>`.
