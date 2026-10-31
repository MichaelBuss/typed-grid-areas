---
"@typed-grid-areas/octane": minor
---

An experimental Octane adapter: `npm i typed-grid-areas @typed-grid-areas/octane`, then `import { createGridComponent } from "@typed-grid-areas/octane"`. The React adapter's API, natively in Octane: a component per definition, a slot component per area (member tags work in `.tsx` and `.tsrx`, including inside `@if`), `nest`, and the development warnings. Make your own element the slot, or the grid, with `render={<el />}`. Each definition's CSS goes on the page once through Octane's `injectStyle`; with server rendering it arrives in `renderToString`'s `css` (put it before your markup) and leads a stream's shell. Ships as source for your app's Octane bundler plugin to compile. Supports Octane 0.16 only; experimental until Octane 1.0.
