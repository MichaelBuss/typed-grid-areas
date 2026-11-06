import { Show, type JSX } from "solid-js";
import { createGridComponent } from "@typed-grid-areas/solid";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

const Content = createGridComponent(preferenceContentGrid);
const Card = createGridComponent(preferenceCardGrid, { nest: { content: Content } });

/** Optional areas are absent when their slot isn't rendered: leave out a prop to see the layout change. */
export function PreferenceCard(props: {
  input?: JSX.Element;
  icon?: JSX.Element;
  title: JSX.Element;
  tag?: JSX.Element;
  children?: JSX.Element;
}) {
  return (
    <Card class="card">
      <Show when={props.input}>
        <Card.input as="label" class="panel input">
          {props.input}
        </Card.input>
      </Show>
      <Card.content class="panel content">
        {/* Misspell an area, say <Card.content.iconn>, and `npm run typecheck` reports it. */}
        <Show when={props.icon}>
          <Card.content.icon>{props.icon}</Card.content.icon>
        </Show>
        <Card.content.information>{props.title}</Card.content.information>
        <Show when={props.tag}>
          <Card.content.cardTag class="tag">{props.tag}</Card.content.cardTag>
        </Show>
        <Show when={props.children}>
          <Card.content.children>{props.children}</Card.content.children>
        </Show>
      </Card.content>
    </Card>
  );
}
