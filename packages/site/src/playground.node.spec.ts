/**
 * What the Try it page's playground offers for each design: its optional
 * areas, every combination of them, and the CSS the core generates for it.
 */
import { combinations, playgroundDesigns } from "./playground.ts";

describe("the playground's designs", () => {
  it("offers the PreferenceCard's optional areas, across both its grids, and the ID card's", () => {
    expect(playgroundDesigns["preference-card"].optional).toEqual([
      "input",
      "icon",
      "cardTag",
      "children",
    ]);
    expect(playgroundDesigns["id-card"].optional).toEqual(["logo", "qr", "badge"]);
  });

  it("shows each design's CSS as the core generates it, one block per definition", () => {
    const [outer, content] = playgroundDesigns["preference-card"].css;
    expect(outer?.name).toBe("preferenceCardGrid");
    expect(outer?.css).toMatch(/^@layer typed-grid-areas \{\n/);
    expect(outer?.css).toContain("[data-area=input]");
    expect(content?.name).toBe("preferenceContentGrid");
    expect(content?.css).toMatch(/@container grid-tga-\w+ \(min-width: 24rem\)/);
    expect(playgroundDesigns["id-card"].css.map(block => block.name)).toEqual(["idCardGrid"]);
    expect(playgroundDesigns["id-card"].css[0]?.css).toContain("--tga-over: photo;");
  });
});

describe("every combination of optional areas", () => {
  it("is each subset once, from everything present to nothing", () => {
    expect(combinations(["a", "b"])).toEqual([["a", "b"], ["a"], ["b"], []]);
  });

  it("is sixteen for the PreferenceCard and eight for the ID card", () => {
    const preference = combinations(playgroundDesigns["preference-card"].optional);
    expect(preference).toHaveLength(16);
    expect(new Set(preference.map(present => present.join())).size).toBe(16);
    expect(combinations(playgroundDesigns["id-card"].optional)).toHaveLength(8);
  });
});
