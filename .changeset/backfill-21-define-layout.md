---
"typed-grid-areas": minor
---

pr: #21

Describe a grid once with `defineLayout({ areas, layouts })`: area names (`"name?"` marks an optional one), text templates, `rows`/`columns` track lists, per-area `align`, `when`/`unless` conditions and `breakpoints`. Unknown areas, ragged rows, mismatched track counts and unknown `align`, `when` or `unless` names are compile-time errors on the offending property (#17).
