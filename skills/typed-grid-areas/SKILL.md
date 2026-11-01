---
name: typed-grid-areas
description: typed-grid-areas (`defineLayout`) grids with optional areas. Use when writing or changing a component layout, converting hand-written `:has()` CSS or layout JavaScript, or debugging its type errors and development warnings.
---

# typed-grid-areas

You describe a **grid** once: its **areas**, and **layouts** drawn as text templates. The library derives the layout for every combination of absent optional areas, at every breakpoint, as generated CSS. Your job is to draw the picture with everything present and correct only the cases where a derived layout isn't the design.

## Vocabulary

Use these terms, in code comments and in what you tell the user:

- **Grid**: one layout surface, one `defineLayout({ areas, layouts })`.
- **Area**: a named region that exactly one slot fills. **Optional area**: declared with a trailing `?` (`"icon?"`), named without it everywhere else; its slot may be absent. Every other area is required.
- **Slot**: the rendered element that fills an area, present or absent. A slot is always a direct child of its grid.
- **Layout**: one arrangement of the areas (`template`, `rows`, `columns`, `align`), with optional `breakpoints`. An area a layout leaves out is hidden while it applies.
- **Base layout**: the layout without a condition, which applies when no other layout's condition matches. **Override**: a layout with a **condition** (`when`: areas that must be present, `unless`: areas that must be absent). Areas a condition doesn't name don't affect it.
- **Derived layout**: what the library makes of an authored layout when some optional areas are absent, by leaving them out.
- **Breakpoint**: a width at which a layout switches arrangement, measured against the space the grid itself is given.
- **Layer**: an area drawn over cells another area owns, written `base+layer` in a cell.
- **Nested grid**: a grid that is the slot of an area in another grid.
- **Adapter**: the package that renders grids in one UI framework (`@typed-grid-areas/react`, `/vue`, `/svelte`, `/solid`, `/preact`, `/angular`, `/lit`, `/octane`).

## Pick the branch

- **Writing or changing a layout**: [Write a layout](#write-a-layout). For a change, start at the first step it touches and walk again from step 6.
- **Converting** a layout built from hand-written `:has()` classes, class toggles or layout JavaScript: [Convert a layout](#convert-a-layout).
- **Responsive or layered designs**: [Write a layout](#write-a-layout), with [Breakpoints](#breakpoints) and [Layers](#layers) open beside it.
- **Debugging** a type error, a development warning or a layout that lands wrong: [Debug](#debug).

Worked examples of the whole process, a nested card and a layered ID card, are in [examples.md](examples.md). Read them before your first definition.

## Write a layout

1. **Decide whether a grid fits.** A grid earns its place when pieces of the design appear and disappear, move between arrangements at different widths, or overlap. Pieces that simply flow in a row or column (a title beside its tag, a row of buttons, a label above a value) are plain flex inside one slot. _Done when_ you have a list of the pieces that move, appear or overlap (each becomes an area), and every other piece is assigned to some slot's content.

2. **Decide nested or flat.** Nest where the design has a panel with its own padding, background or border: the panel is one area of the outer grid and a grid of its own. Nesting also keeps the optional areas per grid few, which keeps the generated CSS small (it grows with 2ⁿ for n optional areas in one grid). Stay flat when areas must overlap or line up across what would be the panel's edge: a layer covers cells of its own grid only. _Done when_ every area from step 1 belongs to exactly one grid.

3. **Name the areas and mark the optional ones.** An area is optional when the component may render without its slot (a prop left out, a feature switched off). _Done when_ each grid has an `areas` list with every optional area ending in `?`.

4. **Draw the everything-present layout.** One base layout per grid, with every area present, at the narrowest width the design has. Rows go on new lines (or are separated by `/`), cells by whitespace; `.` is a deliberately empty cell. Give `rows` and `columns` one CSS track per template row and column (`"min-content minmax(0, 1fr)"` is two tracks); leave either out and the browser sizes those tracks to their content. Size every track that holds a nested grid with breakpoints `minmax(0, 1fr)`, `1fr` or a fixed length (see [Breakpoints](#breakpoints)). A grid has no height of its own unless you give it one, so `1fr` rows grow with their content: give rows a photo or other image spans fixed lengths.

   **Alignment.** A slot's box is what the grid places, and every slot stretches to fill the cells it covers (unless it has a fixed size of its own, such as an `<svg>` with `width` and `height`, which sits at the start of its cells), so a slot whose cells already sit in a corner or along an edge is there with no `align`. Add `align: { area: { justify, align } }` (`start`, `center`, `end`, `stretch`, `baseline`) only for a slot whose box should be smaller than its cells, such as a layer pinned to one corner of the area it covers. To move content within its box (text to the right, an icon to the middle), style the content (`text-align`, flex): `align` moves the box itself.

   _Done when_ each grid has a base layout whose template places every area, and every track list has one track per template row or column.

5. **Add the wider arrangements as breakpoints.** Each breakpoint key gets a complete arrangement of its own: `template`, `rows`, `columns` and `align` are never inherited from the layout. _Done when_ every wider arrangement in the design is a breakpoint with its own template and tracks.

6. **Walk the derived layouts.** For every combination of absent optional areas, in every arrangement (the base and each breakpoint), apply the [derivation rules](#derivation-rules) and write the derived layout's template down. Then check every present slot's box in it against the design: which cells the slot covers, with its alignment. An area the design puts in a corner of another must cover a corner of that area's cells and less than all of them, so watch for a layer that grows to the host's full width or height once a neighbouring track is dropped. Mark each one _as designed_ or _wrong_. _Done when_ every combination of every arrangement of every layout, overrides included, has a derived layout and a mark: for a grid with three optional areas and one breakpoint, the base layout alone has 8 × 2 = 16.

7. **Write an override for each _wrong_ case, and only those.** Its condition names just the areas that decide the case (`unless: ["cardTag"]`, or `when: ["cardTag"], unless: ["icon"]`), and it is declared after the layout it replaces. When most cases come out _wrong_ and a few share one arrangement, swap the roles: draw the arrangement most combinations share as the base layout, and make the few the override. Two traps:
   - An override replaces every arrangement of the earlier layout, its breakpoints included: an override without `breakpoints` applies at every width. Give it its own breakpoints when it should still change with width.
   - An override is itself derived for the optional areas its condition doesn't name. Walk those too (step 6), and repeat until nothing is marked _wrong_.

8. **Render it with the adapter** for the project's framework. Its section of the README ("Rendering with React", "Rendering with Vue", …) is in `node_modules/typed-grid-areas/README.md`. Across adapters:
   - Each slot is a direct child of its grid (fragments and conditionals are fine). Use the adapter's own-element option (`asChild`, `as`, `render`, a `child` snippet, `[tgaArea]` or Lit's `data-area=${Card.icon}` on your element) instead of wrapping a `<label>` or `<img>` in a slot.
   - Leave a slot out only to make an optional area absent. Render a slot whose area the current layout hides, and every required slot, always.
   - A nested grid is the outer area's slot (`nest: { content: Content }`, then `<Card.content.icon>`).
   - Put the component's gap, padding and border classes on the grid and the slots; placement comes from the generated CSS.

   _Done when_ every area has its slot in the markup: required ones always rendered, optional ones under the condition that makes them absent.

9. **Check.** Run the type-checker and render the component in development. A type error or warning sends you to [Debug](#debug); a case that still lands wrong gets an override (step 7). _Done when_ the type-checker passes with no `@ts-expect-error` or cast around a definition, the browser console shows no `typed-grid-areas` or `defineLayout` warning in development (with no page to render, `validateGridConfig(definition)` from `typed-grid-areas`, given what `defineLayout` returned, lists the definition's warnings: it must return `[]`), every combination you walked in step 6 renders as designed, and placement comes from the definition alone, with no `:has()` rule, `grid-template-*` CSS or layout JavaScript in the component.

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "@typed-grid-areas/react";

const Card = createGridComponent(
  defineLayout({
    areas: ["icon?", "information", "cardTag?"],
    layouts: [
      {
        template: "icon information cardTag",
        columns: "min-content minmax(0, 1fr) auto",
      },
    ],
  }),
);

// Without a tag, the derived layout `icon information` applies; no override needed.
export function Example({ tag }: { tag?: string }) {
  return (
    <Card className="gap-2">
      <Card.icon>★</Card.icon>
      <Card.information>Weekly digest</Card.information>
      {tag && <Card.cardTag>{tag}</Card.cardTag>}
    </Card>
  );
}
```

### Derivation rules

A derived layout is the authored arrangement with the absent areas taken out of their cells, then:

1. **Drop.** A row or column is dropped, with its track size, when it holds a cell an absent area owned (an absent layer owns none) and everything else in it is also absent or continues into a neighbouring track. An area spanning into a dropped track just gets one track shorter. Tracks go one at a time, re-checking after each: first a track whose cells are all absent (rows before columns, top and left first), then a track that only shortens spanning areas. A grid's only remaining row or column is never dropped.
2. **Fill.** A hole left after dropping is filled by a neighbouring area, trying left, then right, up, down, if that area stays a rectangle. Otherwise the hole stays empty.
3. **Keep `.`.** Cells written as `.` are never dropped or filled.
4. **Layers vanish.** An absent layer just disappears from its cells and never leaves a hole, so it never makes a track droppable. A row or column holding a present layer is dropped only if that layer also continues into a neighbouring track.

For example:

- `icon cardTag / information information` without `icon`: the first column holds `icon`'s cell, and `information` continues into the second, so the column is dropped with its track, giving `cardTag / information`. Without `cardTag`, the second column goes the same way: `icon / information`. Without both, the first row is all absent and goes first; then no column holds an absent cell, so both stay: `information information`, on both tracks.
- `title tag / body actions` without `tag`: the hole can't be dropped (`title` still needs the row, `actions` the column), so `title` grows into it from the left, giving `title title / body actions`. Without both `tag` and `actions`, the second column is dropped: `title / body`.

Work each derived layout through the rules, cell by cell, from the template. A present layer can hold a track that would otherwise drop, so a combination with a layer absent can derive different tracks from the same combination with it present: walk both.

The fill order is a convention. When a different neighbour should grow, or the result is a different picture altogether, write an override.

### Conditions and precedence

- A layout applies when every `when` area is present and every `unless` area is absent. Name only the areas that decide the case; areas left unnamed keep being derived.
- The last applicable layout wins, however many areas each one names, so declare the base layout first and narrower overrides after the ones they refine.
- A breakpoint arrangement beats its own layout's base arrangement; a later layout beats an earlier layout's breakpoints.
- Every layout sets all tracks, placement and alignment while it applies: nothing leaks in from a layout it beats.
- Leave a required area out of a template to hide it at that width or in that case (`display: none !important`, which the slot's own `display` can't undo). Its slot is still rendered.

## Breakpoints

- **A breakpoint applies from its width up**: the arrangement under `"@md"` replaces the layout's own once the grid is given at least 28rem, so the layout's own arrangement is the narrowest.
- **Keys** are Tailwind's `@container` sizes, `@xs` (20rem), `@sm` (24rem), `@md` (28rem), `@lg` (32rem), `@xl` (36rem), `@2xl` (42rem) up to `@7xl` (80rem), or an arbitrary length: `"@[27rem]"`, `"@[448px]"`. Named keys are in `rem`, so they move with the root font size; use a `px` key when the design gives its threshold in pixels.

```ts
defineLayout({
  areas: ["media", "title", "body"],
  layouts: [
    {
      template: `
        media
        title
        body`,
      breakpoints: {
        "@md": {
          template: `
            media title
            media body`,
          columns: "12rem minmax(0, 1fr)",
        },
      },
    },
  ],
});
```

- **They measure the space the grid itself is given**, never the viewport or a container above it. Choose each threshold from the width of the area the grid fills, the grid's own padding and border included: a nested grid switches at a wider card width than a flat one, because it measures only its own area. A design spec that gives the switch as a card width needs translating to the nested grid's own width.
- **Size containment.** A grid with breakpoints renders inside its own size container (a wrapper element with `container-type: inline-size`), so it can't size to its content: in an `auto` or `min-content` track of an outer grid it collapses to zero width. Give its area a `1fr` or `minmax(0, 1fr)` track, or a fixed one.
- Grids without breakpoints get no wrapper and are no size container.

## Layers

- **Cells.** `cover+price` is owned by `cover` and has `price` drawn on top. A layer covers the bounding rectangle of the cells it appears in and is drawn above its base. Several layers can share a host, in cells of their own (`cover+sale cover cover+price`) or in the same cells (`cover+sale+price`). An area can be a layer in one arrangement and own cells in another.
- **Placing a layer.** Either draw the host with edge rows and columns sized for the layers (`cover+sale cover cover+price` over an `80px 1fr 80px` column list), so each layer fills its cell and stays stretched; or let the layers share the host's cells and pin each with `align` (`align: { price: { justify: "end", align: "start" } }`). An absent layer never makes a track droppable, so either way the host keeps its size.
- **Track sizing.** Layers sit in grid tracks, so their content sizes those tracks like the base's does. Give the host area's tracks fixed lengths, or a large layer stretches the area it sits on.
- **Restyling layered content: `--tga-over`.** Every layered slot gets `--tga-over` set to the area underneath it (the one owning its top-left cell); every other slot gets `none`. Restyle content _inside_ the slot with a container style query; write the unlayered look as the default, since older browsers never match the query:

```css
@container style(--tga-over: photo) {
  .identity-name {
    color: white;
  }
}
```

## Convert a layout

1. **Inventory the existing layout.** For every `:has()` rule, class toggle, media or container query and piece of layout JavaScript, write down the arrangement it produces and what triggers it. Sort each trigger: _a slot is present or absent_ (an optional area), _a width_ (a breakpoint; a media query measured the viewport, a breakpoint measures the grid's space, so translate its threshold), or _something else_ (a state such as expanded: render different slots for it, or keep it outside the grid). _Done when_ every rule, toggle and branch of layout code is on the list with its trigger and arrangement.
2. **Run [Write a layout](#write-a-layout)**, with the inventory as the design. _Done when_ every inventoried arrangement turns up in step 6 as a derived layout or as an override.
3. **Delete the old machinery**: the `:has()` rules, `grid-template-*` and `grid-area` CSS, the class toggles and the layout JavaScript, and any wrapper that existed only to be a container. Keep gaps, padding and other styling. _Done when_ a search of the component for `:has(`, `grid-template` and `grid-area` finds no layout rule of its own, and step 9 of Write a layout passes.

## Debug

1. **Type errors.** Fix errors in `when`, `unless` and `align` first: while those fail, the definition's template errors may not be reported at all. Fix one, re-run, and repeat until the definition is clean. Look up each error in [errors.md](errors.md), which also shows how to read the message.
2. **Development warnings.** Look up each `defineLayout:` or `typed-grid-areas:` warning in [errors.md](errors.md).
3. **A layout lands wrong with no error.** Find which layout applies ([Conditions and precedence](#conditions-and-precedence)). Walk its derived layout with the [derivation rules](#derivation-rules) for the slots actually rendered. Then check, in this order: slots that aren't direct children of the grid, a nested grid with breakpoints in an `auto` or `min-content` track, a layer stretching its host's tracks, and a breakpoint measuring a smaller area than you assumed.

_Done when_ the type-checker is clean, the console shows no warning from the library, and the case that landed wrong renders as designed.
