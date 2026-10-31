# typed-grid-areas

Type-safe, declarative CSS grid layouts for components whose parts come and
go. Describe a grid once, as its areas and a few text templates, and the
library works out the layout for every combination of rendered parts, at
every breakpoint, as generated CSS: no `:has()` rules or layout JavaScript
of your own. Everything that names an area is checked at compile time.

Framework-free at the core; ships a React adapter that renders a definition
as typed slot components (`<Card>`, `<Card.icon>`).

## Install

Not published. Consume it as a local path or git dependency:

```json
{
  "dependencies": {
    "typed-grid-areas": "github:MichaelBuss/typed-grid-areas"
  }
}
```

`react` (19 or later) is an optional peer dependency, only needed for the
`typed-grid-areas/react` entry point.

## At a glance

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

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

function Example({ tag }: { tag?: string }) {
  return (
    <Card className="gap-2">
      <Card.icon>★</Card.icon>
      <Card.information>Weekly digest</Card.information>
      {tag && <Card.cardTag>{tag}</Card.cardTag>}
    </Card>
  );
}
```

Without a tag, the library's derived layout for "no `cardTag`" applies:
`icon information`, with the tag's column gone. See
[the examples](#examples-preferencecard-and-id-card) for complete cards.

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

## Optional areas and derived layouts

Mark an area optional with a `?` suffix in `areas`; everywhere else it is
named without the `?`. Every other area is required: its slot is always
expected to be rendered. Draw each layout with every area present, and the
library derives a layout for every combination of absent optional areas that
the layout uses and its condition doesn't mention:

```ts
defineLayout({
  areas: ["icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: `
        icon        cardTag
        information information
        children    children`,
    },
  ],
});
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

The generated CSS grows with the number of combinations (2ⁿ for n optional
areas in one grid), so it is deduplicated, and nesting grids keeps n small
per grid: the two-grid PreferenceCard below stays under 10 KB.

## Overrides: `when` and `unless`

Where a derived layout isn't what you want, write an **override**: a layout
with a **condition**, declared after the layout it replaces. A condition is
`when` (areas that must be present) plus `unless` (areas that must be
absent); areas named in neither don't affect it. A layout without a
condition is a **base** layout, which always applies.

```ts
defineLayout({
  areas: ["icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: `
        icon        cardTag
        information information
        children    children`,
      columns: "min-content minmax(0, 1fr)",
    },
    // The derived layout without a tag would stack icon and information in
    // the min-content column; put them side by side instead.
    { unless: ["cardTag"], template: "icon information / children children" },
  ],
});
```

Conditions are checked with `:has()` / `:not(:has())` on the grid's direct
children, so layouts react to which slots are actually rendered, without any
layout JavaScript. When several layouts match, the one declared **last**
wins, however many areas each one mentions. An override gets derived layouts
of its own for the optional areas its condition doesn't mention.

Every layout is self-contained: while it applies it sets the tracks, the
placement and the alignment (`justify` / `align`: `start`, `center`, `end`,
`stretch`, `baseline`) of every area, so nothing leaks in from another
matching layout:

```ts
defineLayout({
  areas: ["icon", "info", "tag"],
  layouts: [
    { template: "info tag", align: { tag: { justify: "end" } } },
    {
      when: ["icon"],
      unless: ["tag"],
      template: "icon info",
      align: { icon: { justify: "center", align: "start" } },
    },
  ],
});
```

An area a layout's template leaves out is **hidden** (`display: none`) while
that layout applies.

All generated CSS sits in the `typed-grid-areas` cascade layer, so your own
unlayered classes on a slot (say `justify-self`) always win. The one
exception is hiding: it is `!important`, so a `display` class on a slot
can't bring back an area the current layout leaves out.

## Breakpoints

`breakpoints` give a layout different arrangements once the grid is given
at least a certain width. Keys are Tailwind's default `@container` sizes
(`@xs` through `@7xl`) or an arbitrary length in Tailwind's arbitrary-value
syntax (`"@[40rem]"`):

```ts
defineLayout({
  areas: ["icon", "info"],
  layouts: [
    {
      template: "info",
      breakpoints: {
        "@sm": { template: "icon info" },
        "@[40rem]": { template: "info icon", columns: "1fr auto" },
      },
    },
  ],
});
```

A breakpoint arrangement beats its own layout's base arrangement, but a
later layout still beats an earlier layout's breakpoints. Breakpoint
arrangements take their own `rows`, `columns` and `align`; nothing is
inherited from the layout. Derived layouts apply to each breakpoint
arrangement too.

**A breakpoint measures the space the grid itself is given**, never the
viewport or a container somewhere above it, so a grid behaves the same
wherever it's placed. A container query can't measure the element it
styles, so a grid with breakpoints renders inside its own size container: a
wrapper `div` with `container-type: inline-size` and a container name unique
to the definition, which its `@container` queries target by name (see
[ADR 0002](docs/adr/0002-grid-owns-its-size-container.md)). Grids without
breakpoints get no wrapper and are not size containers.

Inline-size containment has a cost: **a grid with breakpoints can't size to
its content.** That's fine in a `1fr`, `minmax(0, 1fr)` or stretched track,
but in an `auto` or `min-content` track of a parent grid it collapses to zero
width. A nested grid with breakpoints also switches at a wider outer width
than a flat one would, since it measures only its own area.

## Layers: `base+layer`

A cell written `base+layer` (or `base+layer+layer…`) is owned by `base` as
usual, and also has `layer` drawn on top of it. A layer covers the bounding
rectangle of the cells it appears in and is drawn above its base, whatever
their order in the DOM. Several layers can share a host, each in its own
cells, and an area can be a layer in one layout and own cells in another:

```ts
defineLayout({
  areas: ["photo", "identity", "details", "logo?", "qr?", "badge?"],
  layouts: [
    {
      template: `
        photo+logo     photo          photo+badge
        photo          photo          photo
        photo+identity photo+identity photo+identity
        details        details        qr`,
      rows: "40px 80px 40px 60px",
      columns: "60px 1fr 60px",
      breakpoints: {
        "@md": {
          template: `
            photo photo+badge identity logo
            photo photo       details  qr`,
          rows: "40px 120px",
          columns: "100px 40px 1fr 80px",
        },
      },
    },
  ],
});
```

On narrow cards `logo`, `badge` and `identity` sit in the photo's corners;
from `@md` the photo is a column of its own and only `badge` stays on it.
Use `align` to pin a layer within its cells.

In derived layouts, a missing optional layer just disappears from its cells:
it never leaves a hole for a neighbour to fill. A row or column is only
dropped if every layer in it also continues into a neighbouring track.

**Track sizing.** Layers sit in grid tracks, so their content takes part in
sizing those tracks just like the base's does. Give the host area's tracks
fixed or `minmax()` sizes, or a large layer can stretch the area it sits on.

### Restyling layered content: `--tga-over`

Every layered slot gets the custom property `--tga-over`, set to the name of
the area underneath it (the one owning its top-left cell); every other slot
gets `none`. Content inside a slot can restyle itself with a container style
query, for example white text while it sits over a photo:

```css
@container style(--tga-over: photo) {
  .identity-name {
    color: white;
  }
}
```

Every element is a style container, so the query reads the nearest
ancestor's value: put the rule on the slot's content, not the slot itself.

Browser support for style queries on custom properties
([MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/css/at-rules/container.json)
`css.at-rules.container.style_queries_for_custom_properties`, and
[caniuse](https://caniuse.com/css-container-queries-style), checked
2026-10-31):

| Browser | Supported since    |
| ------- | ------------------ |
| Chrome  | 111                |
| Safari  | 18                 |
| Firefox | 151                |

All on by default. Only custom-property queries are supported (which is all
`--tga-over` needs); the range syntax (`style(--x > 1)`) isn't in Safari.
The library's own tests only run in Chromium. In older browsers the query
simply never matches, so write the unlayered look as the default and the
layered look inside the query.

## Rendering with React: grid components

`createGridComponent(definition)` turns a definition into the component it
renders as. Create it once, at module level:

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const Card = createGridComponent(
  defineLayout({
    areas: ["icon", "info"],
    layouts: [{ template: "icon info", columns: "48px 1fr" }],
  }),
);

function Example() {
  return (
    <Card className="gap-4" aria-label="Card">
      <Card.icon>★</Card.icon>
      <Card.info className="truncate">Information</Card.info>
    </Card>
  );
}
```

- **`<Card>`** renders the grid: a `div` with `display: grid` and the
  definition's `data-grid-id`, taking `className`, `style`, `ref`,
  `children` and any other `div` props. When the definition has breakpoints
  the grid sits inside its own size container (a wrapper `div`); your props
  still go on the grid itself.
- **`<Card.icon>`** is the slot for the `icon` area: a static component per
  area, named exactly like the area, so `<Card.iconn>` is a type error. It
  takes the same props and renders a `div` marked `data-area="icon"`.
  Placement lives in the generated CSS, not on the slot.
- **`asChild`** (on slots and on the grid) renders your own single child
  element instead of a `div`, with the props merged onto it (Radix `Slot`),
  so it needs no extra wrapper:

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const Row = createGridComponent(
  defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
);

function Example() {
  return (
    <Row>
      <Row.input asChild>
        <label htmlFor="notify">
          <input id="notify" type="checkbox" />
        </label>
      </Row.input>
      <Row.content>Notify me</Row.content>
    </Row>
  );
}
```

Slots must be **direct children** of their grid (fragments and conditionals
are fine). Render an area's slot even while the current layout hides it;
leave it out only to make an optional area absent.

### Nesting: `nest`

A grid can fill another grid's area. `nest` makes the area's slot the root
of the nested grid, and reaches that grid's slots through it:

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const Content = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);

const Card = createGridComponent(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);

function Example() {
  return (
    <Card>
      <Card.content className="p-4">
        <Card.content.icon>★</Card.content.icon>
        <Card.content.title>Title</Card.content.title>
      </Card.content>
    </Card>
  );
}
```

`<Card.content>` is both the `content` slot of `Card` and the root of
`Content`. If the nested grid has breakpoints, the outer grid's area goes on
its size container, the outermost element. Nest where the design has panels
of their own (padding, background, border): it also keeps each grid's
optional areas, and so its CSS, small.

### CSS and development warnings

Each definition's CSS goes into a `<style href precedence>` element, which
React 19 hoists into `<head>` and emits once, however many instances render.

In development (`process.env.NODE_ENV === "development"`), a grid warns on
the console when:

- a required area's slot isn't rendered, or
- it has a direct child that isn't one of its slots.

`defineLayout` also warns, once per definition, about areas and layers that
aren't rectangles.

## Examples: PreferenceCard and ID card

**PreferenceCard:** an optional input panel (a checkbox, as a `<label>`)
beside a content panel with its own padding. The content panel is a nested
grid of an optional icon, the information, an optional tag and optional
children. From `@sm` the tag moves up beside the information; without a
tag, the information sits beside the icon at every width.

```tsx
import type { ReactNode } from "react";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const PreferenceContent = createGridComponent(
  defineLayout({
    areas: ["icon?", "information", "cardTag?", "children?"],
    layouts: [
      {
        template: `
          icon        cardTag
          information information
          children    children`,
        columns: "min-content minmax(0, 1fr)",
        align: { cardTag: { justify: "end" } },
        breakpoints: {
          "@sm": {
            template: "icon information cardTag / children children children",
            columns: "min-content minmax(0, 1fr) auto",
          },
        },
      },
      { unless: ["cardTag"], template: "icon information / children children" },
    ],
  }),
);

const Card = createGridComponent(
  defineLayout({
    areas: ["input?", "content"],
    // `content` has breakpoints, so it needs a `minmax(0, 1fr)` track, not `auto`.
    layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
  }),
  { nest: { content: PreferenceContent } },
);

type PreferenceCardProps = {
  input?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  tag?: ReactNode;
  children?: ReactNode;
};

export function PreferenceCard({ input, icon, title, tag, children }: PreferenceCardProps) {
  return (
    <Card className="rounded-lg border">
      {input && (
        <Card.input asChild className="border-r p-4">
          <label>{input}</label>
        </Card.input>
      )}
      <Card.content className="gap-2 p-4">
        {icon && <Card.content.icon>{icon}</Card.content.icon>}
        <Card.content.information>{title}</Card.content.information>
        {tag && <Card.content.cardTag>{tag}</Card.content.cardTag>}
        {children && <Card.content.children>{children}</Card.content.children>}
      </Card.content>
    </Card>
  );
}
```

**ID card:** the layered card from [Layers](#layers-baselayer). On narrow
cards the logo, badge and identity sit in the photo's corners, and the name
turns white over the photo; from `@md` the photo is a column of its own and
everything else moves beside it.

```tsx
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const Card = createGridComponent(
  defineLayout({
    areas: ["photo", "identity", "details", "logo?", "qr?", "badge?"],
    layouts: [
      {
        template: `
          photo+logo     photo          photo+badge
          photo          photo          photo
          photo+identity photo+identity photo+identity
          details        details        qr`,
        rows: "40px 80px 40px 60px",
        columns: "60px 1fr 60px",
        breakpoints: {
          "@md": {
            template: `
              photo photo+badge identity logo
              photo photo       details  qr`,
            rows: "40px 120px",
            columns: "100px 40px 1fr 80px",
          },
        },
      },
    ],
  }),
);

type Person = { name: string; role: string; photoUrl: string; verified?: boolean };

export function IdCard({ person, qrUrl }: { person: Person; qrUrl?: string }) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <Card.photo asChild>
        <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
      </Card.photo>
      <Card.logo>ACME</Card.logo>
      {person.verified && <Card.badge>✓</Card.badge>}
      <Card.identity>
        {/* White over the photo, through `@container style(--tga-over: photo)`. */}
        <span className="identity-name">{person.name}</span>
      </Card.identity>
      <Card.details>{person.role}</Card.details>
      {qrUrl && (
        <Card.qr asChild>
          <img src={qrUrl} alt="QR code" />
        </Card.qr>
      )}
    </Card>
  );
}
```

## Without React: `createSlots` and `generateCss`

The core has no React dependency. `createSlots(areas)`,
`generateCss(definition)` and `gridId(definition)` are what a renderer for
another framework builds on:

```ts
import { createSlots, defineLayout, generateCss, gridId } from "typed-grid-areas";

const cardGrid = defineLayout({
  areas: ["icon", "info"],
  layouts: [{ template: "icon info" }],
});

const slots = createSlots(cardGrid.areas);
// { icon: { "data-area": "icon" }, info: { "data-area": "info" } }

const css = generateCss(cardGrid);
// CSS string, scoped to [data-grid-id="<gridId(cardGrid)>"]

const gridAttributes = { "data-grid-id": gridId(cardGrid) };
```

Put the CSS in a `<style>` element once per definition, give the grid
element `display: grid` and the `data-grid-id` attribute, and spread a
slot's attributes onto each of its direct children. A definition with
breakpoints also needs the grid wrapped in its own size container (see
[Breakpoints](#breakpoints)), named `grid-<gridId>`.

## Development

```sh
just test          # unit tests (happy-dom), including the compile-budget check
just test-browser  # in-browser layout tests (Chromium via Playwright)
just typecheck     # tsc --noEmit, including the type tests
```

or via npm directly: `npm test`, `npm run typecheck`.
