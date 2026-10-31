---
"typed-grid-areas": minor
---

**Breaking:** the React adapter has moved to its own package, and `typed-grid-areas/react` is gone. Install `@typed-grid-areas/react` and import `createGridComponent` from it instead; its API is unchanged. `typed-grid-areas` is now framework-free: no `react` peer dependency and no Radix dependency, just the `.` and `./adapter` entries.
