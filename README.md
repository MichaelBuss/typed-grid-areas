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

## Defining a grid: `defineLayout()`

Describe a grid once: its areas, and the layouts that arrange them, drawn as
text templates. Everything that names an area is checked against `areas` at
the type level.

```ts
import { defineLayout } from "typed-grid-areas";

const cardGrid = defineLayout({
  areas: ["icon?", "information", "cardTag?"],
  layouts: [
    {
      template: `
        icon        cardTag
        information information`,
      columns: "min-content minmax(0, 1fr)",
      align: { cardTag: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: "icon information cardTag",
          columns: "min-content minmax(0, 1fr) auto",
        },
      },
    },
    { unless: ["cardTag"], template: "icon information" },
  ],
});
```

- **Areas:** a trailing `?` marks an area optional (its slot may be absent);
  the area is still called `icon`.
- **Templates:** rows are separated by newlines or `/`, cells by whitespace.
  `.` is an empty cell, and `base+layer` draws `layer` over `base`.
- **Track lists:** `rows` and `columns` are one CSS track list each.
  Whitespace inside parentheses doesn't split a track, so
  `"min-content minmax(0, 1fr)"` is two tracks.

Compile-time checks, each reported on the offending property:

- an unknown area in a cell (also inside `a+b`): `{ _unknownArea: "iconn" }`
  on `template`
- rows with different cell counts:
  `{ _raggedRow: { row: 2; cells: 1; expected: 2 } }` on `template`
- a track count that doesn't match the template:
  `{ _columnCountError: { expected: 2; got: 3 } }` on `columns` (and
  `_rowCountError` on `rows`); skipped for `repeat(` and non-literal strings
- unknown `align` keys and unknown `when`/`unless` values

There is no autocomplete inside a template string, and each template reports
one problem at a time.

In development, `defineLayout` also runs `validateGridConfig()` once per
definition and logs what types can't check: areas and layers that aren't
rectangles, and malformed cells. `validateGridConfig()` returns those
warnings as strings, so it is also useful for definitions assembled
dynamically.

## Conditions: `when` and `unless`

A layout without a condition is the **base** layout — always applied. A
layout's condition is `when` (areas that must be present) plus `unless`
(areas that must be absent); areas named in neither don't affect it. It is
checked with `:has()` / `:not(:has())` on the grid's direct children:

```ts
defineLayout({
  areas: ["icon", "info", "tag"],
  layouts: [
    { template: "info tag" },
    {
      when: ["icon"],
      unless: ["tag"],
      template: "icon info",
      align: { icon: { justify: "center", align: "start" } },
    },
  ],
});
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

All generated CSS sits in the `typed-grid-areas` cascade layer, so your own
unlayered classes on a slot (say `justify-self`) always win. The one
exception is hiding: it is `!important`, so a `display` class on a slot
can't bring back an area the current layout leaves out.

```ts
defineLayout({
  areas: ["icon", "info"],
  layouts: [
    {
      template: "info",
      breakpoints: {
        "@sm": { template: "icon info" },
        "@[40rem]": { template: "info icon" },
      },
    },
  ],
});
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
definition into what you actually render:

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
import { defineLayout } from "typed-grid-areas";
import { GridAreas, useGridAreas } from "typed-grid-areas/react";

const cardGrid = defineLayout({
  areas: ["icon", "info"],
  layouts: [{ template: "icon info" }],
});

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
  breakpoints).
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
just test          # unit tests (happy-dom), including the compile-budget check
just test-browser  # in-browser layout tests (Chromium via Playwright)
just typecheck     # tsc --noEmit, including the type tests
```

or via npm directly: `npm test`, `npm run typecheck`.
