# Errors and warnings

Every message typed-grid-areas produces, what it means and the fix. In the code below, `// @ts-expect-error` marks the line the type-checker reports the error on.

## Type errors

Each comes from `defineLayout`, on the property at fault. A template reports one problem at a time: fix it and re-run to see the next. The first line of the message echoes your string; read the second:

```text
error TS2322: Type '"icon iconn / information information"' is not assignable to type '"icon iconn / information information" & { _unknownArea: "iconn"; }'.
  Type 'string' is not assignable to type '{ _unknownArea: "iconn"; }'.
```

### `{ _unknownArea: "…" }` on `template`

A cell names an area that isn't in `areas`, including inside a layered cell (`photo+badgee`). Usually a typo, or an optional area named with its `?`: declare `"icon?"`, then write `icon` in templates. Fix the cell, or add the area to `areas`.

```ts
import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon?", "information"],
  layouts: [
    {
      // @ts-expect-error -- { _unknownArea: "iconn" }
      template: "iconn information",
    },
  ],
});
```

### `{ _raggedRow: { row: 2; cells: 1; expected: 2 } }` on `template`

Row 2 (counting from 1) has a different number of cells from row 1. Every row needs one cell per column: repeat a spanning area's name in each column it covers, or write `.` for an empty cell.

```ts
import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon", "information", "cardTag"],
  layouts: [
    {
      // @ts-expect-error -- { _raggedRow: { row: 2; cells: 1; expected: 2 } }
      template: "icon cardTag / information",
    },
  ],
});
```

### `{ _columnCountError: { expected: 2; got: 3 } }` on `columns`, `{ _rowCountError: … }` on `rows`

The track list has a different number of tracks from the template's columns (or rows). Give one track per column. Whitespace inside parentheses doesn't split a track, so `minmax(0, 1fr)` is one. The check is skipped for `repeat(` and for strings that aren't literals.

```ts
import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon", "information"],
  layouts: [
    {
      template: "icon information",
      // @ts-expect-error -- { _columnCountError: { expected: 2; got: 3 } }
      columns: "min-content minmax(0, 1fr) auto",
    },
  ],
});
```

A breakpoint arrangement inherits nothing: when its template has a different shape, it needs its own `columns` and `rows`.

### `Type '"iconn"' is not assignable to type '"icon" | …'` on `when` or `unless`

A condition names an area that isn't in `areas`. Name areas without their `?`.

```ts
import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon?", "information"],
  layouts: [
    { template: "icon information" },
    {
      // @ts-expect-error -- Type '"iconn"' is not assignable
      unless: ["iconn"],
      template: "information",
    },
  ],
});
```

### `Object literal may only specify known properties, but 'iconn' does not exist in type …` on `align`

`align` names an area that isn't in `areas`. Its keys are area names; each value is `{ justify?, align? }`, one of `start`, `center`, `end`, `stretch`, `baseline`.

```ts
import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon", "information"],
  layouts: [
    {
      template: "icon information",
      // @ts-expect-error -- 'iconn' does not exist in type
      align: { iconn: { justify: "end" } },
    },
  ],
});
```

### Errors on a slot component, such as `Property 'iconn' does not exist on type …`

A slot names an area the grid doesn't have, or reaches a nested grid's area through the wrong outer area. Slot members are named exactly like the areas (`<Card.icon>`, `<Card.content.icon>` through `nest`). The adapter's README section lists how its framework reports this (Vue through `vue-tsc`, Svelte through `svelte-check`, Angular with `strictTemplates`).

## Development warnings

Logged with `console.warn` in development only (`process.env.NODE_ENV === "development"`, or the framework's own development mode); production builds and server rendering log nothing. Layouts, rows and columns are counted from 0: `Layout 1` is the second entry of `layouts`.

### From `defineLayout`, once per definition

`validateGridConfig(definition)` returns the same messages as strings, for definitions assembled at runtime.

- **`defineLayout: Layout 0: Area "photo" isn't a rectangle, so it will cover rows 0-3, columns 0-2 (its bounding box).`** (or `Layer "…"`) An area's cells form an L or another non-rectangular shape, and the browser places it over their bounding box, on top of whatever else is there. Redraw the template so each area's cells, and each layer's, form one rectangle. `Layout 0, breakpoint "@md":` names a breakpoint arrangement.
- **`Malformed cell "…" at row …, column …`**: a cell that isn't `.`, an area name, or a base (an area name or `.`) and layers (area names) joined by `+`, each name at most once: a stray `+`, `photo+.`, `photo+photo`. Fix the cell.
- **`Unknown area name "…"`**, **`Unknown area "…" in 'when' clause`**, **`Row 1 has 1 columns, but row 0 has 2`**, **`columns array length (3) doesn't match layout column count (2)`**: the type errors above, for templates, conditions and track lists that aren't literals, so the types couldn't check them.
- **`Layout 2 has the same condition as Layout 1 (unless: cardTag). Layout 2 will override Layout 1 since it appears later.`** Two layouts have the same `when` and `unless`; the earlier one never applies. Merge them, or delete the earlier one.

### From a grid, after it renders

Prefixed `typed-grid-areas:`, once per distinct set of problems.

- **`no slot for the required area "information". Render its slot component, or declare the area optional ("information?").`** A required area's slot isn't a direct child of the grid. Render it, also while a layout hides the area. If the component really can render without it, mark the area optional and walk the derived layouts for its absence.
- **`<div> at index 2 is a direct child of the grid but not one of its slots (icon, information, cardTag). Put it inside a slot, or …`** Only slots may be direct children of a grid. The usual causes: content placed straight in the grid, a wrapper element around a slot, or a component that renders its own root around the slot. Move the element into a slot, or make it the slot with the adapter's own-element option (the message ends with the one for your framework).
- **`a grid with breakpoints needs its own size container as its parent element. Wrap the grid in an element marked tgaSizeContainer.`** (Angular only): a `[tgaGrid]` whose definition has breakpoints isn't the only child of a `tgaSizeContainer` element. Wrap it in one; when the grid is nested, the wrapper is what fills the outer area.
