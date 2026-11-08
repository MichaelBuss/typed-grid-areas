---
"typed-grid-areas": patch
"@typed-grid-areas/react": patch
"@typed-grid-areas/vue": patch
"@typed-grid-areas/svelte": patch
"@typed-grid-areas/solid": patch
"@typed-grid-areas/preact": patch
"@typed-grid-areas/angular": patch
"@typed-grid-areas/lit": patch
"@typed-grid-areas/octane": patch
---

The API reference has a new section, "Accessibility: reading order": keyboard focus follows the DOM while each layout can order the areas differently, and a class with `reading-flow: grid-rows` on the grid makes focus follow the current layout in Chrome and Edge 137+. The agent skill the core ships now suggests it when interactive slots move between layouts. The code is unchanged.
