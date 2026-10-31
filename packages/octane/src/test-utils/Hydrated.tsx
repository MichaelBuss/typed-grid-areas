/** @jsxImportSource octane */
/**
 * A page of grids for the hydration spec, rendered on the server (via the
 * `renderOnServer` browser command) and hydrated in the browser.
 */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../gridComponent";

export const hydratedGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "icon title", columns: "21px 1fr" }],
});

const Card = createGridComponent(hydratedGrid);

export function Hydrated() {
  return (
    <main>
      {[1, 2].map(index => (
        <Card key={index} data-testid={`card-${index}`}>
          <Card.icon>★</Card.icon>
          <Card.title>Title</Card.title>
        </Card>
      ))}
    </main>
  );
}
