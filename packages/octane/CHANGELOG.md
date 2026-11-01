# @typed-grid-areas/octane

## 0.1.0

### Minor Changes

- [#38](https://github.com/MichaelBuss/typed-grid-areas/pull/38) [`51dbfb5`](https://github.com/MichaelBuss/typed-grid-areas/commit/51dbfb5b68ee288b8c9267feac65ea969e987f68) Thanks [@MichaelBuss](https://github.com/MichaelBuss)! - An experimental Octane adapter: `npm i typed-grid-areas @typed-grid-areas/octane`, then `import { createGridComponent } from "@typed-grid-areas/octane"`. The React adapter's API, natively in Octane: a component per definition, a slot component per area (member tags work in `.tsx` and `.tsrx`, including inside `@if`), `nest`, and the development warnings. Make your own element the slot, or the grid, with `render={<el />}`. Each definition's CSS goes on the page once through Octane's `injectStyle`; with server rendering it arrives in `renderToString`'s `css` (put it before your markup) and leads a stream's shell. Ships as source for your app's Octane bundler plugin to compile. Supports Octane 0.16 only; experimental until Octane 1.0.

### Patch Changes

- Updated dependencies [[`5ed302b`](https://github.com/MichaelBuss/typed-grid-areas/commit/5ed302b2e827d291c3949c75aa1105ef9834baff), [`cdab124`](https://github.com/MichaelBuss/typed-grid-areas/commit/cdab12422cb0bb9d1fb6f6d7ff28ddbaa1de6962)]:
  - typed-grid-areas@0.2.0
