---
status: accepted
---

# Derived layouts for optional areas

Areas can be marked optional. Authors draw the layout with every area present, and the library generates a derived layout for each combination of absent optional areas, so authors only write overrides where a derived layout isn't what they want. We accept that the generated CSS grows exponentially with the number of optional areas in one grid (2ⁿ combinations, each with its own rules). In exchange, definitions stay roughly the length of the picture they describe. Splitting a design into nested grids keeps n small per grid. Emitting only rules that differ from their neighbours keeps the constant small.

## Considered options

- **Exact-match conditions (the original `when`)**: every combination is written out by hand. Adding one more optional area doubles the layouts, so in practice optional content was kept out of the grid altogether.
- **Partial conditions (`when`/`unless`, later layout wins) with no derivation**: far fewer layouts than exact match, but each new optional area still means rewriting every layout that mentions it. Kept as the mechanism for overrides.

## Consequences

- A grid with many optional areas produces a lot of CSS. Prototyping issue #4: one flat grid with 4 optional areas emitted 66 KB before any deduplication; the same card split into two nested grids emitted 25 KB.
- Leaving an area out of a layout drops any row or column that held only that area, plus the empty space it leaves. Areas spanning into that track become one track shorter. Cells written as `"."` are never dropped.
- If a hole can't be dropped (another area still needs that track), a neighbouring area grows into it: left first, then right, up, down, but only if it stays a rectangle. Otherwise the hole stays empty. This order is a convention, not something that follows from the layout; use an override when another neighbour should grow.
- A missing layer just disappears from the cells it was drawn over. It never leaves a hole.
