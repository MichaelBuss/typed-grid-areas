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

## Conditions: `when` and `unless`

A layout without a condition is the **base** layout — always applied. A
layout's condition is `when` (areas that must be present) plus `unless`
(areas that must be absent); areas named in neither don't affect it. It is
checked with `:has()` / `:not(:has())` on the grid's direct children:

```ts
createGrid()
  .areas(["icon", "info", "tag"])
  .layout({ layout: [["info", "tag"]] })
  .layout({
    when: ["icon"],
    unless: ["tag"],
    layout: [["icon", "info"]],
    align: { icon: { justify: "center", align: "start" } },
  })
  .build();
```

So layouts react to _which optional children are actually rendered_, without
any JS layout logic. When several layouts match, the one declared **last**
wins, however many areas each one mentions.

Every layout is self-contained: while it applies it sets the tracks, the
placement and the alignment (`justify` / `align`: `start`, `center`, `end`,
`stretch`, `baseline`) of every area, so nothing leaks in from another
matching layout. An area a layout's template leaves out is **hidden**
(`display: none`) while that layout applies.

`breakpoints` give a layout different arrangements under `@container`
queries. Keys are Tailwind's default `@container` sizes (`@xs` through
`@7xl`) or an arbitrary length in Tailwind's arbitrary-value syntax
(`"@[27rem]"`). A breakpoint arrangement beats its own layout's base
arrangement, but a later layout still beats an earlier layout's breakpoints.
Breakpoint arrangements take their own `rows`, `columns` and `align`;
nothing is inherited from the layout.

## Optional areas and derived layouts

Mark an area optional with a `?` suffix in `.areas()`; everywhere else it is
named without the `?`. Draw each layout with every area present, and the
library derives a layout for every combination of absent optional areas that
the layout uses and its condition doesn't mention:

```ts
createGrid()
  .areas(["icon?", "information", "cardTag?", "children?"])
  .layout({
    layout: [
      ["icon", "cardTag"],
      ["information", "information"],
      ["children", "children"],
    ],
  })
  .build();
// without children: icon cardTag / information information
// without cardTag:  icon / information / children
```

A derived layout is the authored one (and each of its breakpoint
arrangements) with the absent areas taken out:

1. A row or column is dropped, with its track size, when it held an absent
   area and everything else in it is also absent or continues into a
   neighbouring track (a spanning area just gets one track shorter).
2. A hole that can't be dropped is filled by a neighbouring area (left, then
   right, up, down) if that area stays a rectangle; otherwise it stays empty.
3. Cells written as `"."` are never dropped or filled.

Where a derived layout isn't what you want, declare an override after the
layout, for example `{ unless: ["cardTag"], layout: [...] }`: the later
layout wins.

All generated CSS sits in the `typed-grid-areas` cascade layer, so your own
unlayered classes on a slot (say `justify-self`) always win. The one
exception is hiding: it is `!important`, so a `display` class on a slot
can't bring back an area the current layout leaves out.

```ts
createGrid()
  .areas(["icon", "info"])
  .layout({
    layout: [["info"]],
    breakpoints: {
      "@sm": { layout: [["icon", "info"]] },
      "@[40rem]": { layout: [["info", "icon"]] },
    },
  })
  .build();
```

A breakpoint measures the space the grid itself is given, never a container
somewhere above it. A container query can't measure the element it styles,
so a grid with breakpoints renders inside its own size container: a wrapper
`div` with `container-type: inline-size` and a container name unique to that
grid, which its `@container` queries target by name (see
[ADR 0002](docs/adr/0002-grid-owns-its-size-container.md)). Grids without
breakpoints get no wrapper and are not size containers.

Because of inline-size containment, a grid with breakpoints can't take its
width from its content. That's fine in a `1fr` or stretched track, but it
collapses to zero width in an `auto` or `min-content` track of a parent grid.

## Slots and CSS

`createSlots(areas)`, `generateCss(config)` and `gridId(config)` turn a
built `GridConfig` into what you actually render:

```ts
import { createSlots, generateCss, gridId } from "typed-grid-areas";

const slots = createSlots(cardGrid.areas);
// { icon: { "data-area": "icon" }, ... }

const css = generateCss(cardGrid);
// CSS string, scoped to [data-grid-id="<gridId(cardGrid)>"]
```

Spread the relevant slot object onto each child (`{...slots.icon}`) and put
the CSS in a `<style>` tag alongside a container carrying
`data-grid-id={gridId(cardGrid)}`. Placement lives in the CSS, not on the
slots. The CSS depends only on the definition, so every instance of it
shares the same CSS and it only needs emitting once.
`validateGridSlots(container, areas)` can then check a real DOM container's
direct children for missing or unrecognized slot props, returning warning
strings.

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

- `useGridAreas(config)` memoizes
  `{ slots, css, containerProps, sizeContainerProps }`, scoped by the
  definition's `gridId` (`sizeContainerProps` only when the definition has
  breakpoints). In development it also runs
  `validateGridConfig` and logs any warnings.
- `<GridAreas>` renders the `<style>` tag plus the container (a `div` by
  default), spreads `containerProps` and your `style`/`className` onto it,
  and calls your render prop with `slots`. In development, its ref callback
  runs `validateGridSlots` against the mounted container's direct children
  and warns on the console for any that aren't wired up correctly — did you
  forget to spread `{...slots.name}` somewhere?
- The container's own layout style (`display: grid`) is set inline and
  merged with any `style` you pass; nothing here depends on Tailwind or any
  other CSS framework being present.
- When the definition has breakpoints, the container is wrapped in its own
  size container (a `div`, even with `asChild`). `className`, `ref`,
  `data-testid` and `style` still go on the grid itself.
- A nested grid fills an area of an outer grid by spreading that grid's slot
  props onto it: `<GridAreas {...inner} {...slots.main}>`. The area
  (`data-area`) goes on the outermost element, so on the
  wrapper when there is one.

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
