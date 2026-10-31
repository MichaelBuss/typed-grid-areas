# typed-grid-areas

Type-safe, declarative CSS grid layouts for components whose slots come and
go. Describe a grid once, as its areas and a few text templates, and the
library works out the layout for every combination of present slots, at
every breakpoint, as generated CSS: no `:has()` rules or layout JavaScript
of your own. Everything that names an area is checked at compile time.

Framework-free at the core (`typed-grid-areas`); each UI framework's adapter
is a package of its own. The React adapter, `@typed-grid-areas/react`,
renders a definition as typed slot components (`<Card>`, `<Card.icon>`).

## Install

```sh
npm i typed-grid-areas @typed-grid-areas/react
```

`@typed-grid-areas/react` needs `react` 19 or later. The core on its own
(`npm i typed-grid-areas`) has no framework dependency.

Moving from `typed-grid-areas/react` (0.1)? Install `@typed-grid-areas/react`
and import `createGridComponent` from it instead; nothing else changes.

## At a glance

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

An area a layout's template leaves out is **hidden** (`display: none
!important`) while that layout applies.

All generated CSS sits in the `typed-grid-areas` cascade layer, so your own
unlayered classes on the grid or a slot (say `justify-self`) always win. The
one exception is hiding: it is `!important`, so a `display` class on a slot
can't bring back an area the current layout leaves out
([ADR 0003](docs/adr/0003-hidden-areas-are-important.md)).

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

| Browser | Supported since |
| ------- | --------------- |
| Chrome  | 111             |
| Safari  | 18              |
| Firefox | 151             |

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
import { createGridComponent } from "@typed-grid-areas/react";

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

- **`<Card>`** renders the grid: a `div` with the definition's
  `data-grid-id`, which the generated CSS gives `display: grid` (layered, so
  your own class can change it), taking `className`, `style`, `ref`,
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
import { createGridComponent } from "@typed-grid-areas/react";

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
import { createGridComponent } from "@typed-grid-areas/react";

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
children. With both an icon and a tag, the two share the top row above
the information on narrow cards, and from `@sm` all three share one row.
With only one of them, it sits beside the information at every width (the
second override: the derived layout without an icon would stack the tag
above the information). Children always take a full-width last row. The
library's browser acceptance tests render this design in every combination.

```tsx
import type { ReactNode } from "react";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "@typed-grid-areas/react";

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
      {
        when: ["cardTag"],
        unless: ["icon"],
        template: "information cardTag / children children",
        columns: "minmax(0, 1fr) auto",
      },
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
import { createGridComponent } from "@typed-grid-areas/react";

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

## Rendering with Vue: `@typed-grid-areas/vue`

```sh
npm i typed-grid-areas @typed-grid-areas/vue
```

`@typed-grid-areas/vue` needs `vue` 3.5 or later. It has the React
adapter's shape: `createGridComponent(definition, { nest })` returns the
grid's component, with a member component per area that templates use as a
tag (`<Card.input>`):

```vue
<script setup lang="ts">
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "@typed-grid-areas/vue";

defineProps<{ selectable: boolean }>();

const Content = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
const Card = createGridComponent(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);
</script>

<template>
  <Card class="gap-4" aria-label="Card">
    <Card.input v-if="selectable" as-child>
      <label><input type="checkbox" /></label>
    </Card.input>
    <Card.content class="p-4">
      <Card.content.icon>★</Card.content.icon>
      <Card.content.title>Title</Card.content.title>
    </Card.content>
  </Card>
</template>
```

- **`<Card>`** renders the grid, a `div` taking `class`, `style` and any other
  attribute (inside its own size container when the definition has
  breakpoints; your attributes still go on the grid). **`<Card.input>`** is
  the slot for the `input` area, a `div` marked `data-area="input"`.
  **`<Card.content>`** is both the `content` slot and the nested grid, so
  `<Card.content.icon>` is one of its slots. Leave an optional area out with
  `v-if`; slots must be direct children of their grid.
- **Bind grid components in `<script setup>`** (or return them from
  `setup()`): Vue resolves member tags like `<Card.input>` only from there.
  Registering them under `components:` (Options API) and in-DOM templates
  aren't supported. Run `vue-tsc` to type-check templates: `<Card.inputt>`
  and `<Card.content.iconn>` are type errors.
- **`as-child`** (on slots and on the grid) renders your own single child
  element instead of a `div`, the way Reka UI's `as-child` does: the slot's
  attributes are merged into the child's (the child's own win, classes and
  styles combine, event handlers both run), it always gets the slot's
  `data-area` (or the grid's `data-grid-id`), and its own `ref` still
  reaches it.
- **Area names Vue reserves** on a component (`length`, `props`, `emits`,
  `slots`, `inheritAttrs`, `displayName`, `compatConfig`, and any starting
  with `__`) can't be members: `createGridComponent` rejects them, as a type
  error and at runtime.

**CSS.** In the browser, each grid puts its definition's CSS into `<head>`
once (a `<style data-typed-grid-areas>`), however many instances render, and
leaves it there. Vue has no API for `<head>` on the server, so when you
server-render, add the grids' style tags to your page's `<head>` in your
server entry with `renderGridStyles`:

```js
import { renderToString } from "vue/server-renderer";
import { renderGridStyles } from "@typed-grid-areas/vue";

/** @param {import("vue").App} app the app from `createSSRApp` */
export async function render(app) {
  const ctx = {};
  const html = await renderToString(app, ctx);
  return { html, head: renderGridStyles(ctx) };
}
```

It returns one tag per definition rendered with that `ctx`, and hydration
reuses them instead of adding a second. Without it, server-rendered grids
still work: their CSS is inserted on hydration, so the page lays out once
the app's script runs.

**Development warnings.** In development (`process.env.NODE_ENV ===
"development"`), a grid warns on the console after it mounts and after each
update when a required area's slot isn't rendered, or when it has a direct
child that isn't one of its slots. Production builds and server rendering
log nothing.

## Rendering with Svelte: `@typed-grid-areas/svelte`

```sh
npm i typed-grid-areas @typed-grid-areas/svelte
```

Needs Svelte 5.57.0 or later, in runes mode. The package ships `.svelte`
files under the `svelte` export condition, so build with a Svelte-aware
bundler (Vite with `@sveltejs/vite-plugin-svelte`, or SvelteKit).

`createGridComponent(definition, { nest })` turns a definition into a
component with one member per area, like the React adapter. A `.svelte`
file can't be a generic factory, so create grid components in a module: a
`.ts` file, or a component's `<script module>`:

```svelte
<script module lang="ts">
  import { defineLayout } from "typed-grid-areas";
  import { createGridComponent } from "@typed-grid-areas/svelte";

  const Content = createGridComponent(
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

  const Card = createGridComponent(
    defineLayout({
      areas: ["input?", "content"],
      layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
    }),
    { nest: { content: Content } },
  );
</script>

<script lang="ts">
  let { selectable = false, tag }: { selectable?: boolean; tag?: string } = $props();
</script>

<Card class="gap-2" aria-label="Card">
  {#if selectable}
    <Card.input>
      {#snippet child({ props })}
        <label {...props}><input type="checkbox" /></label>
      {/snippet}
    </Card.input>
  {/if}
  <Card.content class="p-4">
    <Card.content.icon>★</Card.content.icon>
    <Card.content.information>Weekly digest</Card.content.information>
    {#if tag}
      <Card.content.cardTag>{tag}</Card.content.cardTag>
    {/if}
  </Card.content>
</Card>
```

- **`<Card>`** renders the grid, and **`<Card.icon>`** the slot for the
  `icon` area, exactly as in React: the same DOM, the same size container
  for a definition with breakpoints (your attributes still go on the grid),
  and `<Card.iconn>` is an error in `svelte-check`. Both take any attribute
  a `div` takes (`class`, `style`, `aria-*`, event handlers) and children.
- **Optional areas:** leave a slot out with an ordinary `{#if}`; the
  derived layout for its absence applies. Slots must be direct children of
  their grid (`{#if}`, `{#each}` and snippets rendered in place are fine).
- **Your own element as a slot (or the grid):** pass a `child` snippet
  instead of children, and spread its `props` onto your element, Bits UI's
  convention: `{#snippet child({ props })}<label {...props}>…</label>{/snippet}`.
  `props` carries the slot's `data-area` (or the grid's attributes) and
  every attribute you gave the component.
- **Nesting:** `nest: { content: Content }` makes `<Card.content>` both the
  `content` slot and the `Content` grid, reaching its slots as
  `<Card.content.icon>`.

**Where the CSS goes.** Each definition's CSS is a
`<style data-typed-grid-areas="<grid id>">` in `<svelte:head>`, rendered by
exactly one instance of the definition, however many render:

- **With server rendering**, `render()` from `svelte/server` puts it in
  `head` once per render; SvelteKit puts `head` into the page for you, and
  with plain `svelte/server` you put it in your HTML's `<head>`. Hydration
  reuses the server's tag.
- **Without server rendering**, the first mounted instance adds it to
  `document.head`; when that instance unmounts another one takes it over,
  and it goes away with the last instance.

**Development warnings.** Under the `development` export condition (Vite's
dev server, Vitest), a grid warns on the console when a required area's
slot isn't rendered or it has a direct child that isn't one of its slots,
once per distinct set of problems, after mount and after each update.
Production builds and server rendering log nothing.

## Without React: `typed-grid-areas/adapter`

The core has no React dependency. To render grids in another framework, build
on `typed-grid-areas/adapter`: it says exactly what to render for a
definition, so your adapter renders the same DOM the React one does.

```ts
import { defineLayout } from "typed-grid-areas";
import {
  createSlotCheck,
  gridMarkup,
  gridStyleTags,
  insertGridStyle,
  isDevelopment,
} from "typed-grid-areas/adapter";

const cardGrid = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info", breakpoints: { "@sm": { template: "info icon" } } }],
});

// Once per definition.
const markup = gridMarkup(cardGrid);

// Per instance. Pass the outer grid's area when this grid fills one.
const { sizeContainer, grid } = markup.elements("content");
// sizeContainer: undefined without breakpoints; otherwise the element that
//   wraps the grid: { attributes: { "data-area": "content" }, style, styleText }
// grid.attributes: { "data-grid-id": markup.id }, plus the outer "data-area"
//   when there's no size container

markup.slot("info"); // { "data-area": "info" }, for each direct child of the grid

// The CSS, once per page: in the browser...
insertGridStyle(document, cardGrid);
// ...or in server-rendered <head>.
const head = gridStyleTags([cardGrid]);

// In development, after each render: what to warn about the grid's slots.
const checkSlots = createSlotCheck(cardGrid, {
  strayChildRemedy: "make it a slot with asChild",
});
const gridElement = document.querySelector(`[data-grid-id="${markup.id}"]`);
if (isDevelopment() && gridElement !== null) {
  checkSlots(gridElement).forEach(warning => console.warn(warning));
}
```

- **Elements.** Render the size container (when there is one) with its
  attributes and style, the grid inside it with its attributes, and each slot
  as a direct child of the grid with its attributes. The CSS makes the grid a
  grid and places the slots (see [Breakpoints](#breakpoints) for why a grid
  with breakpoints has its own size container).
- **CSS.** `markup.css` belongs on the page once per definition, before its
  grids lay out. `insertGridStyle` puts a `<style data-typed-grid-areas="<grid
id>">` in `<head>` (ahead of the page's other styles, reusing a tag the
  server rendered), and `gridStyleTags` renders those tags as an HTML string.
  A framework with its own way to emit a style once can key it by
  `markup.cssKey` instead.
- **Slot check.** One check per grid instance; it reports a set of problems
  once. `strayChildRemedy` says how your framework makes an element a slot.
  Gate it on your framework's development flag, or on `isDevelopment()`.

The main entry's `createSlots`, `generateCss` and `gridId` remain for
rendering by hand.

## Development

An npm-workspaces monorepo: one folder per package under `packages/`
(`core` is `typed-grid-areas`, `react` is `@typed-grid-areas/react`, and the
private `acceptance` holds the browser acceptance tests every adapter runs).
`npm install` at the root sets them all up.

```sh
just test          # unit tests (happy-dom), the release scripts and the packed packages
just test-browser  # in-browser layout tests (Chromium via Playwright)
just typecheck     # tsc --noEmit, including the type tests
just build         # compile each package's src/ into its dist/, as npm pack does
```

Each runs every package's own script of that name (or via npm directly:
`npm test`, `npm run typecheck`, `npm run build`). Each package owns its
toolchain, down to its TypeScript version; see
[docs/agents/workspaces.md](docs/agents/workspaces.md) for adding an adapter
and pinning its own TypeScript.

A change to a package carries a changeset (`npm run changeset`); see
[docs/agents/release.md](docs/agents/release.md) for how releases ship.
