/**
 * The site shows the example designs' definitions as the acceptance package
 * writes them, never a copy.
 */
import { designSource } from "./designs.ts";

describe("a design's source", () => {
  it("is its definition, from `export const` to the end of its `defineLayout` call", () => {
    const source = designSource("preferenceCardGrid");
    expect(source).toMatch(/^export const preferenceCardGrid = defineLayout\(\{\n/);
    expect(source).toMatch(/\n\}\);$/);
    expect(source).toContain('areas: ["input?", "content"],');
    expect(source).not.toContain("preferenceContentGrid");
  });

  it("is found for every design the site shows", () => {
    expect(designSource("preferenceContentGrid")).toContain('"@sm": {');
    expect(designSource("idCardGrid")).toContain("photo+badge");
  });
});
