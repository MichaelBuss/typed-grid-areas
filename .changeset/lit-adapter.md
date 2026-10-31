---
"@typed-grid-areas/lit": minor
---

Render grids in Lit 3: `npm i typed-grid-areas @typed-grid-areas/lit`, then `createGrid(definition)` gives a template function per definition. `Card(content, { class, style, ref })` renders the grid in light DOM, and `Card.icon` is the area's name typed as a literal, so `data-area=${Card.icon}` makes any element its slot and a misspelled area is a type error. `nest` reaches a nested grid's areas through its area (`Card.content.icon`). Each definition's CSS is adopted once into the shadow root a grid renders in (or put in `<head>` in the document); `gridStyles(Card)` in `static styles` carries it into `@lit-labs/ssr`'s declarative shadow roots for server rendering and hydration. In development, a missing required slot or a stray direct child warns on the console.
