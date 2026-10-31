---
"typed-grid-areas": minor
---

pr: #21

Render a definition in React with `createGridComponent`: `<Card>` is the grid and every area is a typed slot component named after it (`<Card.icon>`), with `asChild` to make your own element the slot and `nest` for nested grids (`<Card.content.icon>`). CSS is emitted once per definition however many instances render, and development builds warn about missing required slots and stray children. Needs React 19 (#18).
