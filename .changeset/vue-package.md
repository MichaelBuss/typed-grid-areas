---
"@typed-grid-areas/vue": minor
---

The Vue adapter: `npm i typed-grid-areas @typed-grid-areas/vue`, then `createGridComponent(definition, { nest })` in `<script setup>` gives the grid's component with a member component per area, used as tags in templates (`<Card>`, `<Card.input>`, `<Card.content.icon>`), all checked by `vue-tsc`. `as-child` renders your own element as a slot or grid, with the attributes merged in. Each definition's CSS goes into `<head>` once in the browser; when server rendering, put `renderGridStyles(ctx)` in your page's `<head>` after `renderToString(app, ctx)`. In development, grids warn about missing required slots and stray children. Needs Vue 3.5 or later.
