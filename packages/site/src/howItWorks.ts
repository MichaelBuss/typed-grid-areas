/**
 * What the How it works page shows: the CSS and markup the core generates
 * for the ID card, at build time, so the page can't drift from the library.
 */
import { idCardGrid } from "@typed-grid-areas/acceptance/designs";
import { gridMarkup } from "typed-grid-areas/adapter";

const markup = gridMarkup(idCardGrid);
const { sizeContainer, grid } = markup.elements();

/** The page's headline definition, the ID card: its generated CSS and the markup of one grid. */
export const headline = {
  css: markup.css,
  markup: [
    `<div style="${sizeContainer?.styleText}">`,
    `  <div data-grid-id="${grid.attributes["data-grid-id"]}">`,
    ...idCardGrid.areas.map(
      area => `    <div data-area="${markup.slot(area)["data-area"]}">…</div>`,
    ),
    "  </div>",
    "</div>",
  ].join("\n"),
};
