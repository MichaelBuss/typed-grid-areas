import { generateCss } from "./generateCss.ts";
import { preferenceCardGrid, preferenceContentGrid } from "./test-utils/designs.ts";

describe("generated CSS size", () => {
  /**
   * The two-grid PreferenceCard from issue #4, as the browser acceptance spec
   * renders it: 4 + 2 areas, 4 of them optional, one breakpoint, two
   * overrides.
   */
  it("keeps the two-grid PreferenceCard within 10 KB", () => {
    const bytes = new TextEncoder().encode(
      generateCss(preferenceCardGrid) + generateCss(preferenceContentGrid),
    ).length;

    expect(bytes).toBeLessThanOrEqual(10 * 1024);
  });
});
