import { generateCss, type GridConfig } from "typed-grid-areas";
import { idCardGrid, preferenceCardGrid, preferenceContentGrid } from "./designs.ts";

describe("generated CSS size", () => {
  /**
   * The two-grid PreferenceCard from issue #4, as the browser acceptance tests
   * render it: 4 + 2 areas, 4 of them optional, one breakpoint, two
   * overrides.
   */
  it("keeps the two-grid PreferenceCard within 10 KB", () => {
    const bytes = new TextEncoder().encode(
      generateCss(preferenceCardGrid) + generateCss(preferenceContentGrid),
    ).length;

    expect(bytes).toBeLessThanOrEqual(10 * 1024);
  });

  const designs: Array<[string, Array<GridConfig<string>>]> = [
    ["PreferenceCard", [preferenceCardGrid, preferenceContentGrid]],
    ["ID card", [idCardGrid]],
  ];

  it.each(designs)("reports its size for the %s", (name, grids) => {
    const bytes = new TextEncoder().encode(grids.map(grid => generateCss(grid)).join("")).length;
    console.info(`${name}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB) of generated CSS`);
    expect(bytes).toBeGreaterThan(0);
  });
});
