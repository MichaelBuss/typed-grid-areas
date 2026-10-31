/** A `.tsrx` caller that leaves an optional area out with `@if`, for the browser specs. */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../gridComponent";

const Card = createGridComponent(
  defineLayout({
    areas: ["icon?", "info"],
    layouts: [{ template: "icon info", columns: "48px 1fr" }],
  }),
);

export function OptionalIcon(props: { icon: boolean }) @{
  <Card data-testid="card">
    @if (props.icon) {
      <Card.icon>{'★'}</Card.icon>
    }
    <Card.info>{'Information'}</Card.info>
  </Card>
}
