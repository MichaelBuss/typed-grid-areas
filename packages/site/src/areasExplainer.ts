/**
 * The grid template areas explainer on the Introduction page (and, as a
 * screenshot, in the README): a small card's definition, the template its
 * areas are drawn in, and how to read a grid's applied template back.
 */
import { defineLayout } from "typed-grid-areas";

/**
 * A notification-style card: an optional icon down the left, a title with an
 * optional tag beside it, and a body under both.
 */
export const explainerGrid = defineLayout({
  areas: ["icon?", "title", "tag?", "body"],
  layouts: [
    {
      template: `
        icon title tag
        icon body  body`,
      columns: "auto minmax(0, 1fr) auto",
    },
  ],
});

export type ExplainerArea = "icon" | "title" | "tag" | "body";

/** The explainer's template, as written: one array of cells per row. */
export const authoredRows: ReadonlyArray<ReadonlyArray<ExplainerArea>> = [
  ["icon", "title", "tag"],
  ["icon", "body", "body"],
];

/**
 * The rows of a computed `grid-template-areas` value, such as
 * `"icon title" "icon body"`, each split into its cells. `none` has none.
 */
export function templateRows(computed: string): Array<Array<string>> {
  return Array.from(computed.matchAll(/"([^"]*)"/g), match => match[1]!.trim().split(/\s+/));
}
