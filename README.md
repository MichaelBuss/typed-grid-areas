# typed-grid-areas

Type-safe CSS `grid-template-areas` with automatic `:has()` selector generation
for conditional layouts. Define your grid's areas once, get autocomplete and
compile-time checks everywhere else.

Framework-free at the core; ships an optional React adapter.

## Install

Not published. Consume it as a local path or git dependency:

```json
{
  "dependencies": {
    "typed-grid-areas": "github:MichaelBuss/typed-grid-areas"
  }
}
```

`react` is an optional peer dependency, only needed for the `typed-grid-areas/react` entry point.

## The factory: `createGrid()`

Build a grid configuration with a fluent builder. Define the area names once
with `.areas()`, then everything after that — `.layout()` calls, `when`
clauses, row/column tracks — is checked against that set at the type level.

```ts
import { createGrid } from "typed-grid-areas";

const cardGrid = createGrid()
  .areas(["icon", "info", "tag"])
  .layout({ layout: [["info"]] })
  .layout({
    when: ["icon", "info"],
    layout: [["icon", "info"]],
    columns: ["48px", "1fr"],
  })
  .build();
```

Each cell in a `layout` must be one of the declared area names or `"."` for
an empty cell. Mistype an area name and TypeScript flags it right on the
`layout` property.

Compile-time checks the builder gives you:

- **Area autocomplete** — after `.areas()`, only those names (plus `"."`) are
  valid layout cells.
- **Row/column count validation** — `rows`/`columns` array length must match
  the layout's row/column count, or you get a `_rowCountError` /
  `_columnCountError` type error on that property.
- **`when` completeness** — every area listed in `when` must actually appear
  somewhere in that layout's cells, or you get a `_missingFromLayout` type
  error on `layout`.

`validateGridConfig()` runs the equivalent checks at runtime (used
automatically by the React hook in development) and returns human-readable
warning strings instead of type errors — useful for configs assembled
dynamically, where the type-level checks can't reach.

## `when` and the generated `:has()` selectors

A layout without `when` is the **base** layout — always applied. A layout
with `when` only applies while every area listed in `when` is present _and_
every other declared area is absent, expressed as a chained `:has()` /
`:not(:has())` selector on direct children:

```ts
createGrid()
  .areas(["icon", "info", "tag"])
  .layout({ layout: [["info"]] })
  .layout({
    when: ["icon", "info"],
    layout: [["icon", "info"]],
  })
  .build();
```

produces roughly:

```css
[data-grid-id="…"] {
  grid-template-areas: "info";
}
[data-grid-id="…"]:has(> [data-slot="icon"]):has(> [data-slot="info"]):not(
    :has(> [data-slot="tag"])
  ) {
  grid-template-areas: "icon info";
}
```

So layouts react to _which optional children are actually rendered_, without
any JS layout logic — omit the `icon` slot's element and the grid falls back
to the base layout automatically.

`breakpoints` nests the same idea under `@container` queries (using
Tailwind's default `@container` breakpoints — `@xs` through `@7xl`), and are
self-contained: a breakpoint always explicitly sets `grid-template-rows`/
`-columns` (to a value, or to `none`) so a base layout's tracks never leak
into it.

```ts
createGrid()
  .areas(["icon", "info"])
  .layout({
    layout: [["info"]],
    breakpoints: {
      "@sm": { layout: [["icon", "info"]] },
    },
  })
  .build();
```

## Slots and CSS

`createSlots(areas)` and `generateCss(id, config)` turn a built `GridConfig`
into what you actually render:

```ts
import { createSlots, generateCss } from "typed-grid-areas";

const slots = createSlots(cardGrid.areas);
// { icon: { "data-slot": "icon", style: { gridArea: "icon" } }, ... }

const css = generateCss("card-1", cardGrid);
// CSS string, scoped to [data-grid-id="card-1"]
```

Spread the relevant slot object onto each child (`{...slots.icon}`) and put
the CSS in a `<style>` tag alongside a container carrying
`data-grid-id="card-1"`. `validateGridSlots(container, areas)` can then check
a real DOM container's direct children for missing, incomplete, mismatched,
or unrecognized slot props, returning warning strings.

The React adapter below wires all of this up for you.

## React adapter: `useGridAreas` + `<GridAreas>`

```tsx
import { createGrid } from "typed-grid-areas";
import { GridAreas, useGridAreas } from "typed-grid-areas/react";

const cardGrid = createGrid()
  .areas(["icon", "info"])
  .layout({ layout: [["icon", "info"]] })
  .build();

function Card() {
  const gridAreas = useGridAreas(cardGrid);

  return (
    <GridAreas {...gridAreas} className="gap-4">
      {slots => (
        <>
          <Icon {...slots.icon} />
          <Info {...slots.info} />
        </>
      )}
    </GridAreas>
  );
}
```

- `useGridAreas(config)` generates a unique id (`useId`) and memoizes
  `{ slots, css, containerProps }`. In development it also runs
  `validateGridConfig` and logs any warnings.
- `<GridAreas>` renders the `<style>` tag plus the container (a `div` by
  default), spreads `containerProps` and your `style`/`className` onto it,
  and calls your render prop with `slots`. In development, its ref callback
  runs `validateGridSlots` against the mounted container's direct children
  and warns on the console for any that aren't wired up correctly — did you
  forget to spread `{...slots.name}` somewhere?
- The container's own layout styles (`display: grid`, `containerType:
inline-size` for the `@container` queries) are set inline and merged with
  any `style` you pass; nothing here depends on Tailwind or any other CSS
  framework being present.

### `asChild`

Pass `asChild` to render as the single element your render prop returns,
instead of wrapping it in an extra `div`. This uses Radix's `Slot`, which
clones the container's props (`ref`, `className`, `style`, `data-grid-id`,
...) onto that element — so the element goes _inside_ the render prop, not
around the whole `<GridAreas>`:

```tsx
function Card() {
  const gridAreas = useGridAreas(cardGrid);

  return (
    <GridAreas {...gridAreas} asChild className="gap-4">
      {slots => (
        <section aria-label="Card content">
          <Icon {...slots.icon} />
          <Info {...slots.info} />
        </section>
      )}
    </GridAreas>
  );
}
```

## Development

```sh
just test       # vitest run
just typecheck   # tsc --noEmit
```

or via npm directly: `npm test`, `npm run typecheck`.
