---
"typed-grid-areas": minor
---

pr: #21

Draw only the everything-present layout: for every combination of absent optional areas, the library derives a layout that drops their emptied rows and columns, or fills the hole from a neighbouring area. A later layout with a `when` or `unless` condition still overrides a derived one (#15).
