---
"@typed-grid-areas/svelte": minor
---

The Svelte adapter: `npm i typed-grid-areas @typed-grid-areas/svelte`, then `createGridComponent(definition, { nest })` from it, the same API shape as React's. `<Card>` renders the grid and `<Card.icon>` the slot for each area, with misspelled areas caught by `svelte-check`; leave an optional slot out with `{#if}`, render your own element as a slot (or the grid) with a `child` snippet, and nest grids with `nest`. Each definition's CSS lands in `<svelte:head>` once, in server-rendered `head` and in the browser, and in development a grid warns about missing required slots and stray children. Needs Svelte 5.57 or later.
