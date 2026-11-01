import { GridConfig } from "./types.ts";
import { validateGridConfig } from "./validateGridConfig.ts";

describe("validateGridConfig", () => {
  describe("empty config validation", () => {
    it("should warn when areas array is empty", () => {
      const config: GridConfig<string> = {
        areas: [],
        layouts: [{ cells: [["test"]] }],
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
        layouts: [{ cells: [["icon", "unknown" as any]] }],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining('Unknown area name "unknown"'));
    });

    it("should allow empty cell marker '.'", () => {
      const config: GridConfig<"icon"> = {
        areas: ["icon"],
        layouts: [{ cells: [["icon", "."]] }],
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
            cells: [["icon"]],
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
        layouts: [{ unless: ["unknown" as "icon"], cells: [["icon"]] }],
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
            cells: [
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
            cells: [["icon", "info"]],
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
            cells: [
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

  describe("condition validation", () => {
    it("should accept a 'when' area the layout leaves out, which it hides", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [{ cells: [["icon", "info"]] }, { when: ["icon", "info"], cells: [["icon"]] }],
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
            cells: [["icon", "info"]],
            breakpoints: {
              "@md": {
                cells: [
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
            cells: [["icon", "info"]],
            breakpoints: {
              "@lg": {
                cells: [["icon", "unknown" as "info"]],
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

  describe("duplicate condition validation", () => {
    it("should report the whole condition two layouts share", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          { cells: [["info"]] },
          { when: ["icon"], unless: ["tag"], cells: [["icon", "info"]] },
          { when: ["icon"], unless: ["tag"], cells: [["info", "icon"]] },
        ],
      };

      expect(validateGridConfig(config)).toEqual([
        "Layout 2 has the same condition as Layout 1 (when: icon; unless: tag). " +
          "Layout 2 will override Layout 1 since it appears later.",
      ]);
    });

    it("should warn when two layouts have the same condition", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [
          {
            when: ["icon", "info"],
            cells: [["icon", "info"]],
          },
          {
            when: ["icon", "info"],
            cells: [["info", "icon"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("same condition"));
      expect(errors).toContainEqual(expect.stringContaining("Layout 1"));
      expect(errors).toContainEqual(expect.stringContaining("Layout 0"));
      expect(errors).toContainEqual(expect.stringContaining("will override"));
    });

    it("should warn when conditions have the same areas in a different order", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          {
            when: ["icon", "info", "tag"],
            cells: [["icon", "info", "tag"]],
          },
          {
            when: ["tag", "info", "icon"],
            cells: [["tag", "info", "icon"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toContainEqual(expect.stringContaining("same condition"));
    });

    it("should not warn for different conditions", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          {
            when: ["icon", "info"],
            cells: [["icon", "info"]],
          },
          {
            when: ["icon", "tag"],
            cells: [["icon", "tag"]],
          },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });

    it("should not warn when the same 'when' has a different 'unless'", () => {
      const config: GridConfig<"icon" | "info" | "tag"> = {
        areas: ["icon", "info", "tag"],
        layouts: [
          { when: ["icon"], cells: [["icon", "info"]] },
          { when: ["icon"], unless: ["tag"], cells: [["info", "icon"]] },
        ],
      };

      const errors = validateGridConfig(config);

      expect(errors).toHaveLength(0);
    });

    it("should not warn for multiple base layouts without a condition", () => {
      const config: GridConfig<"icon" | "info"> = {
        areas: ["icon", "info"],
        layouts: [{ cells: [["icon"]] }, { cells: [["info"]] }],
      };

      const errors = validateGridConfig(config);

      // Base layouts have no condition, so no duplicate warning
      expect(errors.filter(e => e.includes("same condition"))).toHaveLength(0);
    });
  });

  describe("cell validation", () => {
    it("should accept a layer over empty cells", () => {
      const config: GridConfig<string> = {
        areas: ["photo", "badge"],
        layouts: [{ cells: [["photo", ".+badge"]] }],
      };

      expect(validateGridConfig(config)).toHaveLength(0);
    });

    it("should report a layer over empty cells that isn't a rectangle as a layer", () => {
      const config: GridConfig<string> = {
        areas: ["photo", "badge"],
        layouts: [
          {
            cells: [
              [".+badge", ".+badge"],
              ["photo", ".+badge"],
            ],
          },
        ],
      };

      expect(validateGridConfig(config)).toEqual([
        expect.stringContaining(`Layer "badge" isn't a rectangle`),
      ]);
    });

    it.each(["photo+", "+badge", "photo++badge", "photo+.", "photo+photo"])(
      "should warn about the malformed cell %s",
      cell => {
        const config: GridConfig<string> = {
          areas: ["photo", "badge"],
          layouts: [{ cells: [[cell]] }],
        };

        expect(validateGridConfig(config)).toEqual([
          expect.stringContaining(`Malformed cell "${cell}" at row 0, column 0`),
        ]);
      },
    );

    it("should warn about an unknown area in a layered cell", () => {
      const config: GridConfig<string> = {
        areas: ["photo", "badge"],
        layouts: [{ cells: [["photo+badgee"]] }],
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
            cells: [["a", "b"]],
            breakpoints: {
              "@sm": {
                cells: [
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
          { cells: [["photo+logo", "photo"]] },
          { when: ["logo"], cells: [["photo", "logo"]] },
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
          { cells: [["info"]] },
          {
            when: ["icon", "info"],
            cells: [["icon", "info"]],
            columns: ["48px", "1fr"],
          },
          {
            when: ["icon", "info", "tag"],
            cells: [
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
