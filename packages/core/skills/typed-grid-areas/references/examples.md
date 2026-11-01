# Worked examples

Two designs taken through [Write a layout](../SKILL.md#write-a-layout), step by step: the PreferenceCard (nested grids, two overrides) and the ID card (one flat grid, layers, no overrides). Both render with the React adapter here; other adapters spell the slots differently but take the same definitions.

## PreferenceCard

**The design.** A card with an optional input panel (a checkbox, as a `<label>`) on the left, spanning the card's height, beside a content panel with its own padding. The content holds an optional icon, the information (a title with a title tag, then a description), an optional card tag and optional children:

- With both an icon and a tag, they share the top row above the information on narrow cards; from `@sm` the icon, information and tag share one row.
- With only an icon, or only a tag, it sits beside the information at every width.
- With neither, the information is alone.
- Children always take a full-width last row.

**1. Does a grid fit?** Yes: four slots come and go and the top row rearranges with width. The title and its tag just flow in a row, and the description sits under them: plain flex inside the `information` slot.

**2. Nested or flat?** The content panel has its own padding, so it is a nested grid: the outer grid holds `input` and `content`. Each grid then has few optional areas (one outside, three inside), and the content's `@sm` measures the content panel, not the whole card.

**3. Areas.** Outer: `["input?", "content"]`. Content: `["icon?", "information", "cardTag?", "children?"]`.

**4–5. The everything-present layout, and its breakpoint.** Narrow: `icon cardTag / information information / children children`, with the tag pushed to the right (`align: { cardTag: { justify: "end" } }`). From `@sm`: `icon information cardTag / children children children`. The outer grid's `content` track is `minmax(0, 1fr)`, since the content grid has breakpoints and can't size to its content.

**6. The walk.** The outer grid without `input` derives `content` alone: as designed. The content grid, leaving out the `children` row: present, it stays a full-width last row as drawn; absent, that row is dropped.

| Absent         | Narrow                                   | Mark        | From `@sm`                 | Mark        |
| -------------- | ---------------------------------------- | ----------- | -------------------------- | ----------- |
| nothing        | `icon cardTag / information information` | as designed | `icon information cardTag` | as designed |
| `icon`         | `cardTag / information`                  | **wrong**   | `information cardTag`      | as designed |
| `cardTag`      | `icon / information`                     | **wrong**   | `icon information`         | as designed |
| `icon cardTag` | `information information`                | as designed | `information`              | as designed |

Without `icon`, the first column is dropped (`information` continues into the second), so the tag stacks above the information. Without `cardTag`, the second column is dropped, so the icon stacks above it, in the `min-content` column.

**7. Overrides.** One per wrong case, naming only the areas that decide it:

- `unless: ["cardTag"]`: `icon information / children children`. It has no breakpoints, so it applies at every width, which is what the design wants (and what `@sm` derived anyway). Its own derived layouts: without `icon`, `information / children`; as designed.
- `when: ["cardTag"], unless: ["icon"]`: `information cardTag / children children`, with the tag's column `auto`. Declared last, so it wins over the base layout's `@sm` too; `@sm` derived the same picture.

**8. Rendering.**

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
  titleTag?: ReactNode;
  description: ReactNode;
  tag?: ReactNode;
  children?: ReactNode;
};

export function PreferenceCard(props: PreferenceCardProps) {
  const { input, icon, title, titleTag, description, tag, children } = props;
  return (
    <Card className="rounded-lg border">
      {input && (
        <Card.input asChild className="flex items-center border-r p-4">
          <label>{input}</label>
        </Card.input>
      )}
      <Card.content className="gap-2 p-4">
        {icon && <Card.content.icon>{icon}</Card.content.icon>}
        {/* The title row and the description are plain flex, inside one slot. */}
        <Card.content.information className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <strong>{title}</strong>
            {titleTag && <span>{titleTag}</span>}
          </div>
          <p>{description}</p>
        </Card.content.information>
        {tag && <Card.content.cardTag>{tag}</Card.content.cardTag>}
        {children && <Card.content.children>{children}</Card.content.children>}
      </Card.content>
    </Card>
  );
}
```

## ID card

**The design.** Areas `photo`, `identity`, `details`, and optional `logo`, `qr` and `badge`. Checked at a 300px and a 560px card:

- Narrow: the logo sits in the photo's top-left corner, the badge in its top-right and the identity along its bottom; the identity's name turns white over the photo. The details are below the photo with the QR code to their right; without the QR code, the details are full width.
- From `@md` (28rem, 448px): the photo is a full-height left column with the badge over its top-right corner. The identity is at the top of the middle column with the logo in the card's top-right corner, and the details below the identity, with the QR code bottom right. Without the logo, the identity extends to the right edge; without the QR code, the details do.

**1–2. Grid, flat.** Three areas overlap the photo, and a layer covers cells of its own grid only, so this is one flat grid. The card's own width is what the breakpoint measures, so `@md` is the 448px in the design.

**3. Areas.** `["photo", "identity", "details", "logo?", "qr?", "badge?"]`.

**4–5. The everything-present layout.** Narrow, three columns around the photo's corners and four rows, with the logo, badge and identity as layers over the photo:

```text
photo+logo     photo          photo+badge
photo          photo          photo
photo+identity photo+identity photo+identity
details        details        qr
```

The photo hosts layers, so every track it spans is fixed (`60px 1fr 60px` across a stretched card, `40px 80px 40px 60px` down) and the layers can't stretch it. From `@md`: `photo photo+badge identity logo / photo photo details qr`, with `100px 40px 1fr 80px` and `40px 120px`. The badge is a layer in both arrangements; the logo and identity are layers on narrow cards and own cells from `@md`.

**6. The walk.** Every combination is as designed, so there are no overrides:

| Absent     | Narrow                                              | From `@md`                                     |
| ---------- | --------------------------------------------------- | ---------------------------------------------- |
| `logo`     | the logo layer vanishes from the photo              | `identity` fills the hole: `identity identity` |
| `badge`    | the badge layer vanishes                            | the badge layer vanishes                       |
| `qr`       | `details` fills the hole: `details details details` | `details` fills the hole: `details details`    |
| `qr badge` | the third column is dropped (`60px 1fr`)            | as for `qr`                                    |
| `logo qr`  | as for `qr`                                         | the last column is dropped (`100px 40px 1fr`)  |

Narrow without `qr`, the third column can't be dropped while the badge layer is in it (the badge doesn't continue into another column), so `details` grows into the hole; once the badge is absent too, the column goes.

**8. Rendering**, with the name restyling itself over the photo through `--tga-over` (in the stylesheet: `@container style(--tga-over: photo) { .identity-name { color: white; } }`):

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

export function IdCard({ person, logo, qrUrl }: { person: Person; logo?: string; qrUrl?: string }) {
  return (
    <Card className="overflow-hidden rounded-xl">
      <Card.photo asChild>
        <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
      </Card.photo>
      {logo && <Card.logo className="p-1">{logo}</Card.logo>}
      {person.verified && (
        <Card.badge className="p-1 text-right">
          <span aria-label="Verified">✓</span>
        </Card.badge>
      )}
      <Card.identity className="p-1">
        <strong className="identity-name">{person.name}</strong>
      </Card.identity>
      <Card.details className="p-1">{person.role}</Card.details>
      {qrUrl && (
        <Card.qr asChild>
          <img src={qrUrl} alt="QR code" className="h-full w-full object-contain" />
        </Card.qr>
      )}
    </Card>
  );
}
```
