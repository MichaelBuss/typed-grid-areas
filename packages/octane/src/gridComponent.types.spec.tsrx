/**
 * What a `.tsrx` caller may write, checked by `tsrx-tsc` in `just typecheck`.
 * `@ts-expect-error` doesn't reach into templates, so what it must not write
 * is checked by `tsrx.node.spec.ts`.
 */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent";

const ContentGrid = createGridComponent(
  defineLayout({
    areas: ["icon?", "information"],
    layouts: [{ template: "icon information" }],
  }),
);

const Card = createGridComponent(
  defineLayout({
    areas: ["input?", "content"],
    layouts: [{ template: "input content" }],
  }),
  { nest: { content: ContentGrid } },
);

export function Accepted(props: { selectable: boolean }) @{
  <Card class="card" render={<section />}>
    @if (props.selectable) {
      <Card.input render={<label for="notify" />}>
        <input id="notify" type="checkbox" />
      </Card.input>
    }
    <Card.content style={{ padding: 8 }}>
      <Card.content.icon aria-hidden>{'★'}</Card.content.icon>
      <Card.content.information>{'info'}</Card.content.information>
    </Card.content>
  </Card>
}
