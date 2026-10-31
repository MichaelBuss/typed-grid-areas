import { defineLayout } from "./defineLayout.ts";
import { generateCss } from "./generateCss.ts";
import { createSlots } from "./markup.ts";
import { GridConfig } from "./types.ts";

function testGrid<TAreaName extends string>(config: GridConfig<TAreaName>) {
  return {
    slots: createSlots(config.areas),
    css: generateCss(config),
  };
}

describe("generateCss and createSlots", () => {
  describe("slots generation", () => {
    it("should generate slots with a data-area attribute for each area", () => {
      const config = defineLayout({
        areas: ["icon", "information", "secondTag"],
        layouts: [{ template: "information" }],
      });

      const result = testGrid(config);

      expect(result.slots).toEqual({
        icon: { "data-area": "icon" },
        information: { "data-area": "information" },
        secondTag: { "data-area": "secondTag" },
      });
    });

    it("should generate slots that can be spread on elements", () => {
      const config = defineLayout({ areas: ["myArea"], layouts: [{ template: "myArea" }] });

      const result = testGrid(config);

      // Verify the slot object structure is compatible with JSX spreading
      const spreadResult = { ...result.slots.myArea };
      expect(spreadResult).toEqual({ "data-area": "myArea" });
    });
  });

  describe("base layout CSS", () => {
    it("should generate gridTemplateAreas for a single-cell layout", () => {
      const config = defineLayout({
        areas: ["information"],
        layouts: [{ template: "information" }],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'information'");
    });

    it("should generate gridTemplateAreas for a multi-column layout", () => {
      const config = defineLayout({
        areas: ["icon", "information", "tag"],
        layouts: [{ template: "icon information tag" }],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon information tag'");
    });

    it("should generate gridTemplateAreas for a multi-row layout", () => {
      const config = defineLayout({
        areas: ["icon", "tag", "information"],
        layouts: [
          {
            template: "icon tag / information information",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon tag' 'information information'");
    });

    it("should support empty cells with '.' syntax", () => {
      const config = defineLayout({
        areas: ["icon", "content", "actions"],
        layouts: [
          {
            template: "icon content actions / . content .",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon content actions' '. content .'");
    });
  });

  describe("breakpoint support", () => {
    it("should generate @container queries for base layout breakpoints", () => {
      const config = defineLayout({
        areas: ["icon", "information"],
        layouts: [
          {
            template: "information",
            breakpoints: {
              "@sm": { template: "icon information" },
            },
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'information'");
      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'icon information'");
    });

    it("should generate @container queries for conditional layouts", () => {
      const config = defineLayout({
        areas: ["icon", "information", "secondTag"],
        layouts: [
          { template: "information" },
          {
            when: ["icon", "secondTag"],
            template: "icon secondTag / information information",
            breakpoints: {
              "@sm": { template: "icon information secondTag" },
            },
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'icon information secondTag'");
    });

    it("should support multiple breakpoints", () => {
      const config = defineLayout({
        areas: ["a", "b"],
        layouts: [
          {
            template: "a",
            breakpoints: {
              "@sm": { template: "a b" },
              "@lg": { template: "b a" },
            },
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'a b'");
      expect(result.css).toContain("(min-width: 32rem)");
      expect(result.css).toContain("grid-template-areas: 'b a'");
    });
  });

  describe("row and column track support", () => {
    it("should generate gridTemplateRows when rows are provided", () => {
      const config = defineLayout({
        areas: ["header", "content", "footer"],
        layouts: [
          {
            template: "header / content / footer",
            rows: "min-content 1fr min-content",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'header' 'content' 'footer'");
      expect(result.css).toContain("grid-template-rows: min-content 1fr min-content");
    });

    it("should generate gridTemplateColumns when columns are provided", () => {
      const config = defineLayout({
        areas: ["sidebar", "main", "aside"],
        layouts: [
          {
            template: "sidebar main aside",
            columns: "200px 1fr auto",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'sidebar main aside'");
      expect(result.css).toContain("grid-template-columns: 200px 1fr auto");
    });

    it("should generate both rows and columns together", () => {
      const config = defineLayout({
        areas: ["a", "b", "c", "d"],
        layouts: [
          {
            template: "a b / c d",
            rows: "min-content 1fr",
            columns: "200px auto",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'a b' 'c d'");
      expect(result.css).toContain("grid-template-rows: min-content 1fr");
      expect(result.css).toContain("grid-template-columns: 200px auto");
    });

    it("should support rows and columns in breakpoint overrides", () => {
      const config = defineLayout({
        areas: ["icon", "content"],
        layouts: [
          {
            template: "icon / content",
            rows: "auto 1fr",
            columns: "1fr",
            breakpoints: {
              "@sm": {
                template: "icon content",
                rows: "1fr",
                columns: "min-content 1fr",
              },
            },
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-rows: auto 1fr");
      expect(result.css).toContain("grid-template-columns: 1fr");
      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-rows: 1fr");
      expect(result.css).toContain("grid-template-columns: min-content 1fr");
    });

    it("should reset base rows when breakpoint does not define rows", () => {
      const config = defineLayout({
        areas: ["icon", "information", "secondTag"],
        layouts: [
          {
            when: ["icon", "information", "secondTag"],
            template: "icon secondTag / information information",
            rows: "min-content 1fr",
            columns: "min-content auto",
            breakpoints: {
              "@sm": {
                template: "icon information secondTag",
                columns: "min-content 1fr auto",
              },
            },
          },
        ],
      });

      const result = testGrid(config);

      // Base layout should have rows and columns
      expect(result.css).toContain("grid-template-rows: min-content 1fr");
      expect(result.css).toContain("grid-template-columns: min-content auto");

      // Breakpoint should reset rows to none (since not provided) and have new columns
      // This ensures base rows don't cascade into the breakpoint
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 24rem\) \{[^}]*grid-template-rows: none/,
      );
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 24rem\) \{[^}]*grid-template-columns: min-content 1fr auto/,
      );
    });

    it("should reset base columns when breakpoint does not define columns", () => {
      const config = defineLayout({
        areas: ["a", "b"],
        layouts: [
          {
            template: "a / b",
            rows: "auto 1fr",
            columns: "200px",
            breakpoints: {
              "@md": {
                template: "a b",
                rows: "1fr",
              },
            },
          },
        ],
      });

      const result = testGrid(config);

      // Breakpoint should reset columns to none (since not provided) and have new rows
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 28rem\) \{[^}]*grid-template-rows: 1fr/,
      );
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 28rem\) \{[^}]*grid-template-columns: none/,
      );
    });

    it("should not emit row/column resets when no earlier rule sets tracks", () => {
      const config = defineLayout({
        areas: ["a", "b"],
        layouts: [
          {
            template: "a / b",
            breakpoints: {
              "@sm": {
                template: "a b",
              },
            },
          },
        ],
      });

      const result = testGrid(config);

      // Nothing sets tracks, so there is nothing that could leak into the
      // breakpoint and no reset is needed (keeps the CSS small).
      expect(result.css).not.toContain("grid-template-rows");
      expect(result.css).not.toContain("grid-template-columns");
    });

    it("should support rows and columns in conditional layouts", () => {
      const config = defineLayout({
        areas: ["icon", "info"],
        layouts: [
          { template: "info" },
          {
            when: ["icon", "info"],
            template: "icon info",
            rows: "auto",
            columns: "48px 1fr",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon info'");
      expect(result.css).toContain("grid-template-rows: auto");
      expect(result.css).toContain("grid-template-columns: 48px 1fr");
    });
  });

  describe("complex real-world example", () => {
    it("should handle PreferenceCard-like configuration", () => {
      const config = defineLayout({
        areas: ["icon", "information", "secondTag"],
        layouts: [
          { template: "information" },
          {
            when: ["icon", "secondTag"],
            template: "icon secondTag / . .",
            breakpoints: {
              "@sm": { template: "icon . secondTag" },
            },
          },
          {
            when: ["icon", "information", "secondTag"],
            template: "icon secondTag / information information",
            breakpoints: {
              "@sm": { template: "icon information secondTag" },
            },
          },
        ],
      });

      const { slots, css } = testGrid(config);

      expect(slots.icon).toEqual({ "data-area": "icon" });

      // Verify base layout
      expect(css).toContain("grid-template-areas: 'information'");
      expect(css).toContain("grid-template-areas: 'icon secondTag' 'information information'");

      // Verify breakpoint override for conditional layout
      expect(css).toContain("(min-width: 24rem)");
      expect(css).toContain("grid-template-areas: 'icon information secondTag'");
    });

    it("should handle complex layout with track sizes", () => {
      const config = defineLayout({
        areas: ["icon", "title", "tag", "description"],
        layouts: [
          {
            template: "icon title tag / icon description description",
            rows: "min-content 1fr",
            columns: "48px 1fr auto",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain(
        "grid-template-areas: 'icon title tag' 'icon description description'",
      );
      expect(result.css).toContain("grid-template-rows: min-content 1fr");
      expect(result.css).toContain("grid-template-columns: 48px 1fr auto");
    });
  });

  describe("CSS scoping", () => {
    it("should generate identical CSS for the same definition", () => {
      const build = () => defineLayout({ areas: ["info"], layouts: [{ template: "info" }] });

      expect(generateCss(build())).toBe(generateCss(build()));
    });

    it("should generate CSS with @container queries", () => {
      const config = defineLayout({
        areas: ["a", "b"],
        layouts: [
          {
            template: "a",
            breakpoints: {
              "@sm": { template: "a b" },
            },
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'a b'");
    });

    it("should generate CSS with rows and columns", () => {
      const config = defineLayout({
        areas: ["a", "b"],
        layouts: [
          {
            template: "a b",
            rows: "1fr",
            columns: "100px auto",
          },
        ],
      });

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-rows: 1fr");
      expect(result.css).toContain("grid-template-columns: 100px auto");
    });
  });
});
