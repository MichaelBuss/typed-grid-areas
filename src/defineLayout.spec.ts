import { defineLayout } from "./defineLayout.ts";
import { generateCss } from "./generateCss.ts";

describe("defineLayout", () => {
  it("replaces the createGrid builder in the public exports", async () => {
    const exports = await import("./index.ts");

    expect(exports).toHaveProperty("defineLayout");
    expect(exports).not.toHaveProperty("createGrid");
  });

  it("renders a text template whose rows are separated by '/'", () => {
    const layout = defineLayout({
      areas: ["icon", "tag", "information"],
      layouts: [{ template: "icon tag / information information" }],
    });

    expect(generateCss(layout)).toContain(
      "grid-template-areas: 'icon tag' 'information information';",
    );
  });

  it("renders a multi-line template exactly like the same template written with '/'", () => {
    const multiLine = defineLayout({
      areas: ["icon", "tag", "information"],
      layouts: [
        {
          template: `
            icon        tag
            information information`,
        },
      ],
    });
    const slashed = defineLayout({
      areas: ["icon", "tag", "information"],
      layouts: [{ template: "icon tag / information information" }],
    });

    expect(generateCss(multiLine)).toBe(generateCss(slashed));
  });

  it("reads track lists as one string, keeping whitespace inside parentheses in one track", () => {
    const layout = defineLayout({
      areas: ["icon", "information"],
      layouts: [
        {
          template: "icon information / icon information",
          rows: "auto  1fr",
          columns: "min-content minmax(0, 1fr)",
        },
      ],
    });

    expect(layout.layouts[0]?.rows).toEqual(["auto", "1fr"]);
    expect(layout.layouts[0]?.columns).toEqual(["min-content", "minmax(0, 1fr)"]);
    expect(generateCss(layout)).toContain("grid-template-columns: min-content minmax(0, 1fr);");
  });

  it("marks areas written with '?' as optional and names them without it", () => {
    const layout = defineLayout({
      areas: ["icon?", "information", "cardTag?"],
      layouts: [{ template: "icon information cardTag" }],
    });

    expect(layout.areas).toEqual(["icon", "information", "cardTag"]);
    expect(layout.optionalAreas).toEqual(["icon", "cardTag"]);
  });

  it("keeps each layout's condition, alignment and breakpoint arrangements", () => {
    const layout = defineLayout({
      areas: ["icon?", "information", "cardTag?"],
      layouts: [
        {
          template: "icon cardTag / information information",
          align: { cardTag: { justify: "end" } },
          breakpoints: {
            "@sm": {
              template: "icon information cardTag",
              columns: "min-content minmax(0, 1fr) auto",
              align: { icon: { align: "center" } },
            },
          },
        },
        { when: ["icon"], unless: ["cardTag"], template: "icon information" },
      ],
    });

    expect(layout.layouts).toEqual([
      {
        cells: [
          ["icon", "cardTag"],
          ["information", "information"],
        ],
        align: { cardTag: { justify: "end" } },
        breakpoints: {
          "@sm": {
            cells: [["icon", "information", "cardTag"]],
            columns: ["min-content", "minmax(0, 1fr)", "auto"],
            align: { icon: { align: "center" } },
          },
        },
      },
      { when: ["icon"], unless: ["cardTag"], cells: [["icon", "information"]] },
    ]);
  });

  describe("in development", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.restoreAllMocks();
    });

    it("warns once about each area that isn't a rectangle", () => {
      defineLayout({ areas: ["a", "b"], layouts: [{ template: "a b / b a" }] });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^defineLayout: Layout 0: Area "a" isn't a rectangle/),
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^defineLayout: Layout 0: Area "b" isn't a rectangle/),
      );
      expect(console.warn).toHaveBeenCalledTimes(2);
    });

    it("warns about a layer whose cells don't form a rectangle", () => {
      defineLayout({
        areas: ["photo", "badge?", "details"],
        layouts: [
          {
            template: "photo+badge photo / photo photo+badge / details details",
            breakpoints: { "@sm": { template: "photo+badge photo+badge details" } },
          },
        ],
      });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^defineLayout: Layout 0: Layer "badge" isn't a rectangle/),
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it("stays quiet for a valid definition", () => {
      defineLayout({
        areas: ["photo", "badge?", "details"],
        layouts: [
          {
            template: "photo+badge photo / photo photo / details details",
            columns: "min-content minmax(0, 1fr)",
          },
        ],
      });

      expect(console.warn).not.toHaveBeenCalled();
    });

    it("doesn't count tracks in a track list that uses repeat()", () => {
      defineLayout({
        areas: ["a", "b", "c"],
        layouts: [{ template: "a b c", columns: "repeat(3, minmax(0, 1fr))" }],
      });

      expect(console.warn).not.toHaveBeenCalled();
    });

    it("warns when a non-literal track list doesn't match the template", () => {
      const columns: string = "1fr 1fr";
      defineLayout({ areas: ["a", "b", "c"], layouts: [{ template: "a b c", columns }] });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("columns array length (2) doesn't match layout column count (3)"),
      );
    });
  });
});
