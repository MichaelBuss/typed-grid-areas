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

`REFERENCE.md` has a new section, "Accessibility: reading order": keyboard focus follows the DOM while layouts and breakpoints change the visual order, and a class on the grid with `reading-flow: grid-rows` makes focus follow the current layout in Chrome and Edge 137+ (other browsers keep DOM order). It covers how layers tie with their base, why `order` doesn't help, and how each adapter takes the class. The agent skill in `typed-grid-areas` now tells your agent to do this when the layouts reorder interactive slots. The code and generated CSS are unchanged.
