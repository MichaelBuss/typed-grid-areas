import { defineLayout } from "./defineLayout";
import { generateCss } from "./generateCss";

/**
 * The two-grid PreferenceCard from issue #4's prototype (variant B): an outer
 * grid for the optional input beside the content, and a nested content grid.
 * 4 + 2 areas, 4 of them optional, one breakpoint, two overrides.
 */
const preferenceCard = defineLayout({
  areas: ["input?", "content"],
  layouts: [
    {
      template: "input content",
      columns: "min-content minmax(0, 1fr)",
      align: { input: { align: "center" } },
    },
  ],
});

const preferenceCardContent = defineLayout({
  areas: ["icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: "icon cardTag / information information / children children",
      columns: "min-content minmax(0, 1fr)",
      align: { cardTag: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: "icon information cardTag / children children children",
          columns: "min-content minmax(0, 1fr) auto",
        },
      },
    },
    {
      unless: ["cardTag"],
      template: "icon information / children children",
      columns: "min-content minmax(0, 1fr)",
    },
    {
      when: ["cardTag"],
      unless: ["icon"],
      template: "information cardTag / children children",
      columns: "minmax(0, 1fr) auto",
      align: { cardTag: { justify: "end" } },
    },
  ],
});

describe("generated CSS size", () => {
  it("keeps the two-grid PreferenceCard within 10 KB", () => {
    const bytes = new TextEncoder().encode(
      generateCss(preferenceCard) + generateCss(preferenceCardContent),
    ).length;

    expect(bytes).toBeLessThanOrEqual(10 * 1024);
  });
});
