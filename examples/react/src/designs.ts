/**
 * The PreferenceCard from the docs site's Examples page: two definitions,
 * one per grid. The content grid is nested in the card's `content` area.
 */
import { defineLayout } from "typed-grid-areas";

/**
 * PreferenceCard, outer grid: an optional input panel beside the content
 * panel, which is a nested grid (`preferenceContentGrid`).
 */
export const preferenceCardGrid = defineLayout({
  areas: ["input?", "content"],
  // `content` has breakpoints, so it needs a `minmax(0, 1fr)` track, not `auto`.
  layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
});

/**
 * PreferenceCard, content grid: icon and tag above the information on
 * narrow cards, one row from `@sm`; with only one of icon and tag, it sits
 * beside the information at every width.
 */
export const preferenceContentGrid = defineLayout({
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
    // Without an icon, the derived narrow layout would stack the tag above
    // the information; keep them side by side at every width instead.
    {
      when: ["cardTag"],
      unless: ["icon"],
      template: "information cardTag / children children",
      columns: "minmax(0, 1fr) auto",
    },
  ],
});
