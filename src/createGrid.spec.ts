import { createGrid } from "./createGrid";
import { createSlots, generateCss } from "./generateCss";
import { GridConfig } from "./types";

function testGrid<TAreaName extends string>(config: GridConfig<TAreaName>) {
  return {
    slots: createSlots(config.areas),
    css: generateCss(config),
  };
}

describe("generateCss and createSlots", () => {
  describe("slots generation", () => {
    it("should generate slots with a data-area attribute for each area", () => {
      const config = createGrid()
        .areas(["icon", "information", "secondTag"])
        .layout({ layout: [["information"]] })
        .build();

      const result = testGrid(config);

      expect(result.slots).toEqual({
        icon: { "data-area": "icon" },
        information: { "data-area": "information" },
        secondTag: { "data-area": "secondTag" },
      });
    });

    it("should generate slots that can be spread on elements", () => {
      const config = createGrid()
        .areas(["myArea"])
        .layout({ layout: [["myArea"]] })
        .build();

      const result = testGrid(config);

      // Verify the slot object structure is compatible with JSX spreading
      const spreadResult = { ...result.slots.myArea };
      expect(spreadResult).toEqual({ "data-area": "myArea" });
    });
  });

  describe("base layout CSS", () => {
    it("should generate gridTemplateAreas for a single-cell layout", () => {
      const config = createGrid()
        .areas(["information"])
        .layout({ layout: [["information"]] })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'information'");
    });

    it("should generate gridTemplateAreas for a multi-column layout", () => {
      const config = createGrid()
        .areas(["icon", "information", "tag"])
        .layout({ layout: [["icon", "information", "tag"]] })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon information tag'");
    });

    it("should generate gridTemplateAreas for a multi-row layout", () => {
      const config = createGrid()
        .areas(["icon", "tag", "information"])
        .layout({
          layout: [
            ["icon", "tag"],
            ["information", "information"],
          ],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon tag' 'information information'");
    });

    it("should support empty cells with '.' syntax", () => {
      const config = createGrid()
        .areas(["icon", "content", "actions"])
        .layout({
          layout: [
            ["icon", "content", "actions"],
            [".", "content", "."],
          ],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon content actions' '. content .'");
    });
  });

  describe("breakpoint support", () => {
    it("should generate @container queries for base layout breakpoints", () => {
      const config = createGrid()
        .areas(["icon", "information"])
        .layout({
          layout: [["information"]],
          breakpoints: {
            "@sm": { layout: [["icon", "information"]] },
          },
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'information'");
      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'icon information'");
    });

    it("should generate @container queries for conditional layouts", () => {
      const config = createGrid()
        .areas(["icon", "information", "secondTag"])
        .layout({ layout: [["information"]] })
        .layout({
          when: ["icon", "secondTag"],
          layout: [
            ["icon", "secondTag"],
            ["information", "information"],
          ],
          breakpoints: {
            "@sm": { layout: [["icon", "information", "secondTag"]] },
          },
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'icon information secondTag'");
    });

    it("should support multiple breakpoints", () => {
      const config = createGrid()
        .areas(["a", "b"])
        .layout({
          layout: [["a"]],
          breakpoints: {
            "@sm": { layout: [["a", "b"]] },
            "@lg": { layout: [["b", "a"]] },
          },
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'a b'");
      expect(result.css).toContain("(min-width: 32rem)");
      expect(result.css).toContain("grid-template-areas: 'b a'");
    });
  });

  describe("row and column track support", () => {
    it("should generate gridTemplateRows when rows are provided", () => {
      const config = createGrid()
        .areas(["header", "content", "footer"])
        .layout({
          layout: [["header"], ["content"], ["footer"]],
          rows: ["min-content", "1fr", "min-content"],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'header' 'content' 'footer'");
      expect(result.css).toContain("grid-template-rows: min-content 1fr min-content");
    });

    it("should generate gridTemplateColumns when columns are provided", () => {
      const config = createGrid()
        .areas(["sidebar", "main", "aside"])
        .layout({
          layout: [["sidebar", "main", "aside"]],
          columns: ["200px", "1fr", "auto"],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'sidebar main aside'");
      expect(result.css).toContain("grid-template-columns: 200px 1fr auto");
    });

    it("should generate both rows and columns together", () => {
      const config = createGrid()
        .areas(["a", "b", "c", "d"])
        .layout({
          layout: [
            ["a", "b"],
            ["c", "d"],
          ],
          rows: ["min-content", "1fr"],
          columns: ["200px", "auto"],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'a b' 'c d'");
      expect(result.css).toContain("grid-template-rows: min-content 1fr");
      expect(result.css).toContain("grid-template-columns: 200px auto");
    });

    it("should support rows and columns in breakpoint overrides", () => {
      const config = createGrid()
        .areas(["icon", "content"])
        .layout({
          layout: [["icon"], ["content"]],
          rows: ["auto", "1fr"],
          columns: ["1fr"],
          breakpoints: {
            "@sm": {
              layout: [["icon", "content"]],
              rows: ["1fr"],
              columns: ["min-content", "1fr"],
            },
          },
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-rows: auto 1fr");
      expect(result.css).toContain("grid-template-columns: 1fr");
      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-rows: 1fr");
      expect(result.css).toContain("grid-template-columns: min-content 1fr");
    });

    it("should reset base rows when breakpoint does not define rows", () => {
      const config = createGrid()
        .areas(["icon", "information", "secondTag"])
        .layout({
          when: ["icon", "information", "secondTag"],
          layout: [
            ["icon", "secondTag"],
            ["information", "information"],
          ],
          rows: ["min-content", "1fr"],
          columns: ["min-content", "auto"],
          breakpoints: {
            "@sm": {
              layout: [["icon", "information", "secondTag"]],
              columns: ["min-content", "1fr", "auto"],
            },
          },
        })
        .build();

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
      const config = createGrid()
        .areas(["a", "b"])
        .layout({
          layout: [["a"], ["b"]],
          rows: ["auto", "1fr"],
          columns: ["200px"],
          breakpoints: {
            "@md": {
              layout: [["a", "b"]],
              rows: ["1fr"],
            },
          },
        })
        .build();

      const result = testGrid(config);

      // Breakpoint should reset columns to none (since not provided) and have new rows
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 28rem\) \{[^}]*grid-template-rows: 1fr/,
      );
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 28rem\) \{[^}]*grid-template-columns: none/,
      );
    });

    it("should reset rows/columns in breakpoints even when base does not define them", () => {
      const config = createGrid()
        .areas(["a", "b"])
        .layout({
          layout: [["a"], ["b"]],
          breakpoints: {
            "@sm": {
              layout: [["a", "b"]],
            },
          },
        })
        .build();

      const result = testGrid(config);

      // Breakpoints are self-contained: they always explicitly set rows/columns to none
      // This ensures consistent behavior and prevents any inherited values from cascading
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 24rem\) \{[^}]*grid-template-rows: none/,
      );
      expect(result.css).toMatch(
        /@container \S+ \(min-width: 24rem\) \{[^}]*grid-template-columns: none/,
      );
    });

    it("should support rows and columns in conditional layouts", () => {
      const config = createGrid()
        .areas(["icon", "info"])
        .layout({ layout: [["info"]] })
        .layout({
          when: ["icon", "info"],
          layout: [["icon", "info"]],
          rows: ["auto"],
          columns: ["48px", "1fr"],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-areas: 'icon info'");
      expect(result.css).toContain("grid-template-rows: auto");
      expect(result.css).toContain("grid-template-columns: 48px 1fr");
    });
  });

  describe("complex real-world example", () => {
    it("should handle PreferenceCard-like configuration", () => {
      const config = createGrid()
        .areas(["icon", "information", "secondTag"])
        .layout({ layout: [["information"]] })
        .layout({
          when: ["icon", "secondTag"],
          layout: [
            ["icon", "secondTag"],
            [".", "."],
          ],
          breakpoints: {
            "@sm": { layout: [["icon", ".", "secondTag"]] },
          },
        })
        .layout({
          when: ["icon", "information", "secondTag"],
          layout: [
            ["icon", "secondTag"],
            ["information", "information"],
          ],
          breakpoints: {
            "@sm": { layout: [["icon", "information", "secondTag"]] },
          },
        })
        .build();

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
      const config = createGrid()
        .areas(["icon", "title", "tag", "description"])
        .layout({
          layout: [
            ["icon", "title", "tag"],
            ["icon", "description", "description"],
          ],
          rows: ["min-content", "1fr"],
          columns: ["48px", "1fr", "auto"],
        })
        .build();

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
      const build = () =>
        createGrid()
          .areas(["info"])
          .layout({ layout: [["info"]] })
          .build();

      expect(generateCss(build())).toBe(generateCss(build()));
    });

    it("should generate CSS with @container queries", () => {
      const config = createGrid()
        .areas(["a", "b"])
        .layout({
          layout: [["a"]],
          breakpoints: {
            "@sm": { layout: [["a", "b"]] },
          },
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("(min-width: 24rem)");
      expect(result.css).toContain("grid-template-areas: 'a b'");
    });

    it("should generate CSS with rows and columns", () => {
      const config = createGrid()
        .areas(["a", "b"])
        .layout({
          layout: [["a", "b"]],
          rows: ["1fr"],
          columns: ["100px", "auto"],
        })
        .build();

      const result = testGrid(config);

      expect(result.css).toContain("grid-template-rows: 1fr");
      expect(result.css).toContain("grid-template-columns: 100px auto");
    });
  });
});

// =============================================================================
// Builder Pattern Tests (createGrid)
// =============================================================================

describe("createGrid builder pattern", () => {
  describe("basic builder usage", () => {
    it("should create configuration with areas and layouts", () => {
      const config = createGrid()
        .areas(["icon", "info"])
        .layout({ layout: [["icon", "info"]] })
        .build();

      expect(config.areas).toEqual(["icon", "info"]);
      expect(config.layouts).toHaveLength(1);

      const firstLayout = config.layouts[0];
      expect(firstLayout).toBeDefined();
      expect(firstLayout?.layout).toEqual([["icon", "info"]]);
    });

    it("should support chaining multiple layouts", () => {
      const config = createGrid()
        .areas(["a", "b", "c"])
        .layout({ layout: [["a"]] })
        .layout({ layout: [["b"]] })
        .layout({ layout: [["c"]] })
        .build();

      expect(config.layouts).toHaveLength(3);
    });

    it("should work with generateCss and createSlots", () => {
      const config = createGrid()
        .areas(["icon", "info"])
        .layout({ layout: [["icon", "info"]] })
        .build();

      const slots = createSlots(config.areas);
      const css = generateCss(config);

      expect(slots.icon).toEqual({ "data-area": "icon" });
      expect(css).toContain("grid-template-areas: 'icon info'");
    });
  });

  describe("row and column validation", () => {
    it("should accept matching row counts", () => {
      const config = createGrid()
        .areas(["a", "b", "c", "d"])
        .layout({
          layout: [
            ["a", "b"],
            ["c", "d"],
          ],
          rows: ["1fr", "auto"],
        })
        .build();

      expect(config.layouts[0]?.rows).toEqual(["1fr", "auto"]);
    });

    it("should accept matching column counts", () => {
      const config = createGrid()
        .areas(["a", "b", "c"])
        .layout({
          layout: [["a", "b", "c"]],
          columns: ["100px", "1fr", "auto"],
        })
        .build();

      expect(config.layouts[0]?.columns).toEqual(["100px", "1fr", "auto"]);
    });
  });

  describe("when clause validation", () => {
    it("should accept when clause with all items used in layout", () => {
      const config = createGrid()
        .areas(["icon", "info", "tag"])
        .layout({
          when: ["icon", "info"],
          layout: [["icon", "info"]],
        })
        .build();

      expect(config.layouts[0]?.when).toEqual(["icon", "info"]);
    });

    it("should accept empty cell marker in layout", () => {
      const config = createGrid()
        .areas(["icon", "info"])
        .layout({
          when: ["icon", "info"],
          layout: [
            ["icon", "."],
            [".", "info"],
          ],
        })
        .build();

      expect(config.layouts[0]?.layout).toEqual([
        ["icon", "."],
        [".", "info"],
      ]);
    });
  });

  describe("breakpoints support", () => {
    it("should support breakpoint overrides", () => {
      const config = createGrid()
        .areas(["icon", "info"])
        .layout({
          layout: [["icon"], ["info"]],
          breakpoints: {
            "@sm": {
              layout: [["icon", "info"]],
            },
          },
        })
        .build();

      expect(config.layouts[0]?.breakpoints?.["@sm"]?.layout).toEqual([["icon", "info"]]);
    });
  });

  describe("complex real-world example", () => {
    it("should handle PreferenceCard-like configuration", () => {
      const config = createGrid()
        .areas(["icon", "information", "secondTag"])
        .layout({ layout: [["information"]] })
        .layout({
          when: ["icon", "information", "secondTag"],
          layout: [
            ["icon", "secondTag"],
            ["information", "information"],
          ],
          rows: ["min-content", "1fr"],
          columns: ["min-content", "auto"],
          breakpoints: {
            "@sm": {
              layout: [["icon", "information", "secondTag"]],
              columns: ["min-content", "1fr", "auto"],
            },
          },
        })
        .build();

      const slots = createSlots(config.areas);
      const css = generateCss(config);

      expect(slots.icon).toBeDefined();
      expect(slots.information).toBeDefined();
      expect(slots.secondTag).toBeDefined();
      expect(css).toContain("grid-template-areas");
    });
  });
});

// =============================================================================
// Type Safety Documentation
// =============================================================================
//
// The builder pattern provides compile-time type safety:
//
// 1. AREA AUTOCOMPLETE: After .areas(), only those area names are valid in layouts
//    createGrid().areas(["icon", "info"]).layout({
//      layout: [["icon", "info"]]  // Autocomplete suggests: "icon", "info", "."
//    })
//
// 2. ROW COUNT VALIDATION: rows array length must match layout row count
//    .layout({
//      layout: [["a"], ["b"]],         // 2 rows
//      rows: ["1fr", "auto", "1fr"],   // Wrong: 3 items
//    })
//    Error on `rows`: Property '_rowCountError' is missing in type...
//    Hover shows: { _rowCountError: { expected: 2; got: 3 } }
//
// 3. COLUMN COUNT VALIDATION: columns array length must match layout column count
//    .layout({
//      layout: [["a", "b", "c"]],  // 3 columns
//      columns: ["1fr", "auto"],   // Wrong: 2 items
//    })
//    Error on `columns`: Property '_columnCountError' is missing in type...
//    Hover shows: { _columnCountError: { expected: 3; got: 2 } }
//
// 4. WHEN ITEMS MUST BE USED: All items in when must appear in the layout
//    .layout({
//      when: ["icon", "info", "tag"],
//      layout: [["icon", "info"]],  // Missing "tag"
//    })
//    Error on `layout`: Property '_missingFromLayout' is missing in type...
//    Hover shows: { _missingFromLayout: "tag" }
