/**
 * The two target designs from issue #4, defined with the public API only.
 * Every adapter's browser acceptance tests render them; the CSS budget check
 * measures them. Keep the README's examples in step with these.
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

/**
 * ID card: on narrow cards the logo, badge and identity sit in the photo's
 * corners; from `@md` (448px) the photo is a column of its own and only the
 * badge stays on it.
 */
export const idCardGrid = defineLayout({
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
});
