# @typed-grid-areas/svelte

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`479f0da`](https://github.com/MichaelBuss/typed-grid-areas/commit/479f0daa425198beff41a2c1066fc47e53ec67e9) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The Svelte adapter: `npm i typed-grid-areas @typed-grid-areas/svelte`, then `createGridComponent(definition, { nest })` from it, the same API shape as React's. `<Card>` renders the grid and `<Card.icon>` the slot for each area, with misspelled areas caught by `svelte-check`; leave an optional slot out with `{#if}`, render your own element as a slot (or the grid) with a `child` snippet, and nest grids with `nest`. Each definition's CSS lands in `<svelte:head>` once, in server-rendered `head` and in the browser, and in development a grid warns about missing required slots and stray children. Needs Svelte 5.57 or later.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
