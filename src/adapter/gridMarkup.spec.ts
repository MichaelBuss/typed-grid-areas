import { defineLayout } from "../defineLayout.ts";
import { generateCss } from "../generateCss.ts";
import { gridMarkup } from "./index.ts";

const flat = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info" }],
});

const responsive = defineLayout({
  areas: ["icon", "info"],
  layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
});

describe("gridMarkup", () => {
  describe("the size container", () => {
    it("isn't rendered for a grid without breakpoints", () => {
      expect(gridMarkup(flat).elements().sizeContainer).toBeUndefined();
    });

    it("wraps a grid with breakpoints, named after the grid and filled by it", () => {
      const { id } = gridMarkup(responsive);
      const { sizeContainer } = gridMarkup(responsive).elements();

      expect(sizeContainer?.style).toEqual({
        containerType: "inline-size",
        containerName: `grid-${id}`,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
      });
      expect(sizeContainer?.styleText).toBe(
        `container-type: inline-size; container-name: grid-${id}; display: grid; ` +
          `grid-template-columns: minmax(0, 1fr);`,
      );
    });
  });

  describe("a nested grid's outer area", () => {
    it("goes on the grid itself when it has no size container", () => {
      const { id } = gridMarkup(flat);
      expect(gridMarkup(flat).elements("content").grid.attributes).toEqual({
        "data-area": "content",
        "data-grid-id": id,
      });
    });

    it("goes on the size container, not the grid, when there is one", () => {
      const { id } = gridMarkup(responsive);
      const { sizeContainer, grid } = gridMarkup(responsive).elements("content");

      expect(sizeContainer?.attributes).toEqual({ "data-area": "content" });
      expect(grid.attributes).toEqual({ "data-grid-id": id });
    });

    it("isn't there when the grid isn't nested", () => {
      const { sizeContainer, grid } = gridMarkup(responsive).elements();

      expect(sizeContainer?.attributes).toEqual({});
      expect(grid.attributes).not.toHaveProperty("data-area");
      expect(gridMarkup(flat).elements().grid.attributes).not.toHaveProperty("data-area");
    });
  });

  describe("the definition's CSS", () => {
    it("is the core's generated CSS, keyed by the grid id for emitting once", () => {
      const markup = gridMarkup(responsive);

      expect(markup.css).toBe(generateCss(responsive));
      expect(markup.cssKey).toBe(`typed-grid-areas-${markup.id}`);
    });

    it("has the same key for every instance and for an identical definition", () => {
      const twin = defineLayout({
        areas: ["icon?", "info"],
        layouts: [{ template: "icon info" }],
      });

      expect(gridMarkup(twin).cssKey).toBe(gridMarkup(flat).cssKey);
      expect(gridMarkup(responsive).cssKey).not.toBe(gridMarkup(flat).cssKey);
    });
  });

  it("gives each slot its area's data-area", () => {
    expect(gridMarkup(flat).slot("icon")).toEqual({ "data-area": "icon" });
  });
});
