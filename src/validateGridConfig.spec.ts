import { GridConfig } from "./types";
import { validateGridConfig } from "./validateGridConfig";

describe("validateGridConfig", () => {
  describe("empty config validation", () => {
    it("should warn when areas array is empty", () => {
      const config: GridConfig<string> = {
        areas: [],
        layouts: [{ layout: [["test"]] }],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("no areas defined"));
    });

    it("should warn when layouts array is empty", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("no layouts defined"));
    });
  });

  describe("area name validation", () => {
    it("should warn when layout contains unknown area name", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [{ layout: [["icon", "unknown" as any]] }],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining('Unknown area name "unknown"'));
    });

    it("should allow empty cell marker '.'", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [{ layout: [["icon", "."]] }],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });

    it("should warn when 'when' clause contains unknown area name", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [
          {
            when: ["icon", "unknown" as "icon"],
            layout: [["icon"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(
        expect.stringContaining("Unknown area \"unknown\" in 'when' clause"),
      );
    });

    it("should warn when 'unless' clause contains unknown area name", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [{ unless: ["unknown" as "icon"], layout: [["icon"]] }],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(
        expect.stringContaining("Unknown area \"unknown\" in 'unless' clause"),
      );
    });
  });

  describe("dimension validation", () => {
    it("should warn when rows array length doesn't match layout row count", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            layout: [
              ["icon", "info"],
              ["icon", "info"],
            ],
            rows: ["auto"], // Only 1 row specified, but layout has 2
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(
        expect.stringContaining("rows array length (1) doesn't match layout row count (2)"),
      );
    });

    it("should warn when columns array length doesn't match layout column count", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            layout: [["icon", "info"]],
            columns: ["48px"], // Only 1 column specified, but layout has 2
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(
        expect.stringContaining("columns array length (1) doesn't match layout column count (2)"),
      );
    });

    it("should warn when rows have inconsistent column counts", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          {
            layout: [
              ["icon", "info"],
              ["tag"], // Only 1 column, first row has 2
            ],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(
        expect.stringContaining("Row 1 has 1 columns, but row 0 has 2"),
      );
    });
  });

  describe("when-clause validation", () => {
    it("should accept a 'when' area the layout leaves out, which it hides", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [{ layout: [["icon", "info"]] }, { when: ["icon", "info"], layout: [["icon"]] }],
      };

      expect(validateGridConfig(config)).toHaveLength(0);
    });
  });

  describe("breakpoint validation", () => {
    it("should validate breakpoint layouts for dimension mismatches", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            layout: [["icon", "info"]],
            breakpoints: {
              "@md": {
                layout: [
                  ["icon", "info"],
                  ["icon", "info"],
                ],
                rows: ["auto"], // Mismatch: 1 row size for 2 rows
              },
            },
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining('breakpoint "@md"'));
      expect(errors).toContainEqual(expect.stringContaining("rows array length (1) doesn't match"));
    });

    it("should validate breakpoint layouts for unknown area names", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            layout: [["icon", "info"]],
            breakpoints: {
              "@lg": {
                layout: [["icon", "unknown" as "info"]],
              },
            },
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining('breakpoint "@lg"'));
      expect(errors).toContainEqual(expect.stringContaining('Unknown area name "unknown"'));
    });
  });

  describe("duplicate when-clause validation", () => {
    it("should warn when two layouts have the same when-clause", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            when: ["icon", "info"],
            layout: [["icon", "info"]],
          },
          {
            when: ["icon", "info"],
            layout: [["info", "icon"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("same 'when' clause"));
      expect(errors).toContainEqual(expect.stringContaining("Layout 1"));
      expect(errors).toContainEqual(expect.stringContaining("Layout 0"));
      expect(errors).toContainEqual(expect.stringContaining("will override"));
    });

    it("should warn when when-clauses have same areas in different order", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          {
            when: ["icon", "info", "tag"],
            layout: [["icon", "info", "tag"]],
          },
          {
            when: ["tag", "info", "icon"],
            layout: [["tag", "info", "icon"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("same 'when' clause"));
    });

    it("should not warn for different when-clauses", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          {
            when: ["icon", "info"],
            layout: [["icon", "info"]],
          },
          {
            when: ["icon", "tag"],
            layout: [["icon", "tag"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });

    it("should not warn when the same when-clause has a different unless-clause", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          { when: ["icon"], layout: [["icon", "info"]] },
          { when: ["icon"], unless: ["tag"], layout: [["info", "icon"]] },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });

    it("should not warn for multiple base layouts without when-clause", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [{ layout: [["icon"]] }, { layout: [["info"]] }],
      };

      const errors = validateGridConfig(config);

      // Base layouts don't have when-clauses, so no duplicate warning
      expect(errors.filter(e => e.includes("same 'when' clause"))).toHaveLength(0);
    });
  });

  describe("cell validation", () => {
    it.each(["photo+", "+badge", "photo++badge", ".+badge", "photo+photo"])(
      "should warn about the malformed cell %s",
      cell => {
        const config: GridConfig<string> = {
          areas: ["photo", "badge"],
          layouts: [{ layout: [[cell]] }],
        };

        expect(validateGridConfig(config)).toEqual([
          expect.stringContaining(`Malformed cell "${cell}" at row 0, column 0`),
        ]);
      },
    );

    it("should warn about an unknown area in a layered cell", () => {
      const config: GridConfig<string> = {
        areas: ["photo", "badge"],
        layouts: [{ layout: [["photo+badgee"]] }],
      };

      expect(validateGridConfig(config)).toEqual([
        expect.stringContaining('Unknown area name "badgee" at row 0, column 0'),
      ]);
    });

    it("should warn about areas that aren't rectangles in a breakpoint", () => {
      const config: GridConfig<string> = {
        areas: ["a", "b"],
        layouts: [
          {
            layout: [["a", "b"]],
            breakpoints: {
              "@sm": {
                layout: [
                  ["a", "a"],
                  ["a", "b"],
                ],
              },
            },
          },
        ],
      };

      expect(validateGridConfig(config)).toEqual([
        expect.stringContaining(`Layout 0, breakpoint "@sm": Area "a" isn't a rectangle`),
      ]);
    });

    it("should accept a layer that is also an area in another layout", () => {
      const config: GridConfig<string> = {
        areas: ["photo", "logo"],
        layouts: [
          { layout: [["photo+logo", "photo"]] },
          { when: ["logo"], layout: [["photo", "logo"]] },
        ],
      };

      expect(validateGridConfig(config)).toHaveLength(0);
    });
  });

  describe("valid configurations", () => {
    it("should return empty array for valid config", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          { layout: [["info"]] },
          {
            when: ["icon", "info"],
            layout: [["icon", "info"]],
            columns: ["48px", "1fr"],
          },
          {
            when: ["icon", "info", "tag"],
            layout: [
              ["icon", "tag"],
              ["icon", "info"],
            ],
            rows: ["auto", "1fr"],
            columns: ["48px", "1fr"],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });
  });
});
