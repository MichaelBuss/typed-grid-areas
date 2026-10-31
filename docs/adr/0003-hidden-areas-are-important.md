---
status: accepted
---

# Hidden areas are hidden with `!important`

All generated CSS sits in the `typed-grid-areas` cascade layer at zero specificity, so a consumer's own classes win over it. Hiding is the one exception: an area the current layout leaves out gets `display: none !important`. Slots often set their own `display` (a `flex` row of an icon and a label, say), and an unlayered `display` on the slot beats a layered `display: none`, which would bring the area back while the layout has no place for it. We chose to make hiding win over the consumer, because a layout that leaves an area out has to be able to rely on it being gone.

## Considered options

- **Plain `display: none` in the layer**: consumers can override it, but every slot with its own `display` un-hides itself, so hiding only works for slots without one.
- **Hide with `!important`, and un-hide with a later `display: revert-layer !important`**: `revert-layer` rolls back to the previous layer, and unlayered styles aren't one, so the slot falls back to the browser default (`block`) instead of the consumer's `display`.
- **Hide with `!important`, made exclusive of the later rules that show the area** (chosen): nothing ever has to undo a hide, so the consumer's `display` applies untouched whenever the area is shown.

## Consequences

- A consumer can't un-hide an area with their own styles, not even with `!important` (an important declaration in a layer beats an unlayered important one). To show an area, put it in the layout's template.
- Each hide rule carries a `:not(…)` for every later rule that shows the area (engine/hiding.ts), split by width range when those rules have breakpoints, so hiding costs more CSS than a single declaration would.
- Everything else the library emits, the grid's own `display: grid` included, stays overridable by a consumer's class.
