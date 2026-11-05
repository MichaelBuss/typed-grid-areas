---
"@typed-grid-areas/react": patch
---

Grid components work with React Compiler and in Strict Mode. If your app compiles this package's source with React Compiler, nested grids (`nest`) now render as the inner grid instead of an unknown `<nested>` element, and the compiler optimizes every grid, slot and nested-grid component instead of skipping the grid's root. Rendered markup and types are unchanged.
