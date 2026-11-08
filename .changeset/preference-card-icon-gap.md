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

The PreferenceCard example in `REFERENCE.md` and the agent skill now gives its tagless layout (`unless: ["cardTag"]`) its own `columns`. Without them the layout had `grid-template-columns: none`, so its two auto columns shared the free width and the icon drifted away from the title as the card widened. Copy the `columns: "min-content minmax(0, 1fr)"` line if you built on that example; a layout of your own that omits `columns` and sets `template` the same way needs it too. The library code is unchanged.
