import { createGrid } from "./createGrid";
import { generateCss } from "./generateCss";

/**
 * The two-grid PreferenceCard from issue #4's prototype (variant B): an outer
 * grid for the optional input beside the content, and a nested content grid.
 * 4 + 2 areas, 4 of them optional, one breakpoint, two overrides.
 */
const preferenceCard = createGrid()
  .areas(["input?", "content"])
  .layout({
    layout: [["input", "content"]],
    columns: ["min-content", "minmax(0, 1fr)"],
    align: { input: { align: "center" } },
  })
  .build();

const preferenceCardContent = createGrid()
  .areas(["icon?", "information", "cardTag?", "children?"])
  .layout({
    layout: [
      ["icon", "cardTag"],
      ["information", "information"],
      ["children", "children"],
    ],
    columns: ["min-content", "minmax(0, 1fr)"],
    align: { cardTag: { justify: "end" } },
    breakpoints: {
      "@sm": {
        layout: [
          ["icon", "information", "cardTag"],
          ["children", "children", "children"],
        ],
        columns: ["min-content", "minmax(0, 1fr)", "auto"],
      },
    },
  })
  .layout({
    unless: ["cardTag"],
    layout: [
      ["icon", "information"],
      ["children", "children"],
    ],
    columns: ["min-content", "minmax(0, 1fr)"],
  })
  .layout({
    when: ["cardTag"],
    unless: ["icon"],
    layout: [
      ["information", "cardTag"],
      ["children", "children"],
    ],
    columns: ["minmax(0, 1fr)", "auto"],
    align: { cardTag: { justify: "end" } },
  })
  .build();

describe("generated CSS size", () => {
  it("keeps the two-grid PreferenceCard within 10 KB", () => {
    const bytes = new TextEncoder().encode(
      generateCss(preferenceCard) + generateCss(preferenceCardContent),
    ).length;

    expect(bytes).toBeLessThanOrEqual(10 * 1024);
  });
});
