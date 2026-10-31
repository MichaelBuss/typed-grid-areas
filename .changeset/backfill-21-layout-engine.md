---
"typed-grid-areas": minor
---

pr: #21

When several layouts match, the one declared last wins, and each applied layout sets tracks, placement and alignment for every area, so nothing leaks in from another match. Areas a layout leaves out are hidden while it applies. Slots are marked with `data-area` and placed by generated CSS in the `typed-grid-areas` cascade layer, so your own classes win over everything but hiding (#14).
