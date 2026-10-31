---
"@typed-grid-areas/solid": minor
---

The Solid adapter: `npm i typed-grid-areas @typed-grid-areas/solid`, then `import { createGridComponent } from "@typed-grid-areas/solid"`. The React adapter's API in Solid: a component per definition, a slot component per area (`<Card.icon>`), `nest` for grids inside areas, and `as` to render a tag, a component or a render function as the slot or grid, with its attributes type-checked. Slots toggled with `<Show>` stay reactive. Each definition's CSS goes in `<head>` once: in the browser as the grid is created, and on the server through Solid's `useAssets`, reused on hydration. In development, grids warn about missing required slots and stray children. Supports Solid 1.x (`solid-js` 1.9 or later).
