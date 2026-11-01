---
"typed-grid-areas": minor
---

Build an adapter for another framework on `typed-grid-areas/adapter`. `gridMarkup(definition)` gives the attributes and styles of the grid, its size container and each slot (including where a nested grid's `data-area` goes), plus the CSS and a key to emit it once by. `insertGridStyle` and `gridStyleTags` put that CSS in `<head>` in the browser and on the server (`insertServerGridStyle` for a server DOM that is serialized, such as Angular's), and `createSlotCheck` returns the development warnings about a mounted grid's slots, worded for your framework. The React adapter now renders through it, unchanged.
