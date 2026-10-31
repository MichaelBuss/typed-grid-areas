import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../lib/index.ts";

export const cardGrid = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info", columns: "40px minmax(0, 1fr)" }],
});

/** A grid with an optional area and no breakpoints. */
export const Card = createGridComponent(cardGrid);

export const responsiveGrid = defineLayout({
  areas: ["icon", "info"],
  layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
});

/** A grid with breakpoints, so it renders inside its own size container. */
export const Responsive = createGridComponent(responsiveGrid);

export const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "icon title", columns: "24px minmax(0, 1fr)" }],
});

/** A grid nesting a flat grid into `content` and one with breakpoints into `aside`. */
export const Nested = createGridComponent(
  defineLayout({
    areas: ["input?", "content", "aside"],
    layouts: [{ template: "input content aside", columns: "40px minmax(0, 1fr) 100px" }],
  }),
  { nest: { content: createGridComponent(contentGrid), aside: Responsive } },
);
