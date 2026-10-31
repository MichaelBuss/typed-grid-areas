# Qwik adapter

There is no Qwik adapter (`@typed-grid-areas/qwik`). It was planned in #3 alongside seven others, researched with a working prototype, and cancelled.

## Why this is out of scope

The library's adapters stay small because each one leans on what its framework already does well: put a definition's CSS on the page once, and render slots as plain child elements. In Qwik, both of those fight the framework.

- **The CSS needs the optimizer's internals.** A definition's CSS is generated at runtime, but Qwik's `useStyles$` only accepts styles its optimizer can capture at build time. Getting runtime CSS deduplicated per definition took calling `useStylesQrl(inlinedQrl(css, name))` with a computed name, through a namespace import, because the same call as a named import crashes the Qwik 1 optimizer; and the dedupe key depends on it being the component's first hook. Every Qwik release could break that, and nothing in Qwik's public API promises otherwise.
- **The CSS isn't in `<head>`.** Server-rendered styles land inline before the first grid, and Qwik only moves them into `<head>` when it resumes. For nested grids, the inner definition's `<style>` becomes a direct child of the outer grid, so the core's slot check needs a Qwik-only exception.
- **The target is moving.** Qwik 1 was the stable major when this was decided, while Qwik 2 (`@qwik.dev/core`) was a release candidate whose peer ranges conflict with this repo's test setup (Vitest 5). An adapter built on Qwik 1 would need rewriting for Qwik 2, and Qwik 2's tooling didn't yet fit the repo's.

A Qwik user can still use the core directly: `generateCss`, `gridId` and `createSlots` (README, "Without React") give the CSS and the attributes, and Qwik's own `useStyles$` can take the CSS string when it's written into the component's source.

Reconsider when Qwik offers a public way to register runtime-generated styles once per page, and its current major runs on the repo's test tooling.

## Prior requests

- #34: "Qwik adapter: @typed-grid-areas/qwik"
