# @typed-grid-areas/solid

## 0.1.1

### Patch Changes

- Updated dependencies [[`1007398`](https://github.com/MichaelBuss/typed-grid-areas/commit/100739836f3e71b4654310fa377cc82ae78b2690)]:
  - typed-grid-areas@0.3.0

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`0440393`](https://github.com/MichaelBuss/typed-grid-areas/commit/0440393b8238a1700cf22d609f37135c13314c21) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - The Solid adapter: `npm i typed-grid-areas @typed-grid-areas/solid`, then `import { createGridComponent } from "@typed-grid-areas/solid"`. The React adapter's API in Solid: a component per definition, a slot component per area (`<Card.icon>`), `nest` for grids inside areas, and `as` to render a tag, a component or a render function as the slot or grid, with its attributes type-checked. Slots toggled with `<Show>` stay reactive. Each definition's CSS goes in `<head>` once: in the browser as the grid is created, and on the server through Solid's `useAssets`, reused on hydration. In development, grids warn about missing required slots and stray children. Supports Solid 1.x (`solid-js` 1.9 or later).

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
