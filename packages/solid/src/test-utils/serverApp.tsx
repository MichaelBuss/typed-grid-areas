/**
 * An app rendered on the server by the server specs, and hydrated by the
 * hydration spec: several instances of three definitions, one nested into
 * another and one with breakpoints.
 */
import { JSX } from "solid-js";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "../gridComponent.tsx";

const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "icon title", breakpoints: { "@sm": { template: "title icon" } } }],
});
const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
});
const badgeGrid = defineLayout({ areas: ["label"], layouts: [{ template: "label" }] });

/** The grid ids of the app's definitions. */
export const appGridIds = [contentGrid, cardGrid, badgeGrid].map(gridId);

const Content = createGridComponent(contentGrid);
const Card = createGridComponent(cardGrid, { nest: { content: Content } });
const Badge = createGridComponent(badgeGrid);

export function App(): JSX.Element {
  return (
    <main>
      {["One", "Two", "Three"].map((title, index) => (
        <Card class="card">
          {index > 0 && (
            <Card.input as="label" for={`toggle-${index}`}>
              <input id={`toggle-${index}`} type="checkbox" />
            </Card.input>
          )}
          <Card.content>
            {index !== 1 && <Card.content.icon>★</Card.content.icon>}
            <Card.content.title>{title}</Card.content.title>
          </Card.content>
        </Card>
      ))}
      <Badge>
        <Badge.label>New</Badge.label>
      </Badge>
    </main>
  );
}

/** The whole document, as an app rendering its own `<html>` does. */
export function Document(): JSX.Element {
  return (
    <html lang="en">
      <head>
        <title>Grids</title>
      </head>
      <body>
        <App />
      </body>
    </html>
  );
}

/** An app whose grid is missing a required slot and has a stray child. */
export function Miswired(): JSX.Element {
  return (
    <Card>
      <span>stray</span>
    </Card>
  );
}
