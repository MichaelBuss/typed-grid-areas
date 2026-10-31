import { createGrid } from "./createGrid";
import { mountGrid } from "./test-utils/mountGrid";

const cardGrid = createGrid()
  .areas(["icon", "info", "tag"])
  .layout({
    layout: [["info", "tag"]],
    columns: ["1fr", "100px"],
  })
  .layout({
    when: ["icon", "info"],
    layout: [["icon", "info"]],
    columns: ["48px", "1fr"],
  })
  .build();

const breakpointGrid = createGrid()
  .areas(["icon", "info"])
  .layout({
    layout: [["icon"], ["info"]],
    breakpoints: {
      "@sm": { layout: [["icon", "info"]], columns: ["48px", "1fr"] },
    },
  })
  .build();

describe("grid layout in a real browser", () => {
  it("applies the base layout when no condition or breakpoint matches", async () => {
    const grid = await mountGrid(cardGrid, { width: 200, present: ["info", "tag"] });

    expect(grid.templateAreas()).toBe('"info tag"');
    expect(grid.rect("info")).toMatchObject({ x: 0, width: 100 });
    expect(grid.rect("tag")).toMatchObject({ x: 100, width: 100 });
  });

  it("applies a layout whose condition matches exactly the rendered slots", async () => {
    const withIconAndInfo = await mountGrid(cardGrid, { width: 200, present: ["icon", "info"] });

    expect(withIconAndInfo.templateAreas()).toBe('"icon info"');
    expect(withIconAndInfo.rect("icon")).toMatchObject({ x: 0, width: 48 });
    expect(withIconAndInfo.rect("info")).toMatchObject({ x: 48, width: 152 });
  });

  it("falls back to the base layout when a slot outside the condition is also rendered", async () => {
    const withTagToo = await mountGrid(cardGrid, {
      width: 200,
      present: ["icon", "info", "tag"],
    });

    expect(withTagToo.templateAreas()).toBe('"info tag"');
  });

  it("falls back to the base layout when a slot the condition requires is removed", async () => {
    const withoutIcon = await mountGrid(cardGrid, { width: 200, present: ["info"] });

    expect(withoutIcon.templateAreas()).toBe('"info tag"');
  });

  it("marks slots with data-area and keeps placement out of inline styles", async () => {
    const grid = await mountGrid(cardGrid, { width: 200, present: ["info", "tag"] });

    expect(grid.slot("info").getAttribute("data-area")).toBe("info");
    expect(grid.slot("info").hasAttribute("data-slot")).toBe(false);
    expect(grid.slot("info").style.gridArea).toBe("");
    expect(grid.rect("tag")).toMatchObject({ x: 100, width: 100 });
  });

  // Expected failure until https://github.com/MichaelBuss/typed-grid-areas/issues/6 is fixed:
  // the grid is its own `container-type: inline-size` element, so its `@container`
  // queries look for an ancestor container instead of measuring the grid itself.
  // Remove `.fails` when that lands.
  it.fails("applies a breakpoint layout based on the grid's own width", async () => {
    // 800px is well above @sm (24rem = 384px), and the wrapper is not a container.
    const grid = await mountGrid(breakpointGrid, { width: 800, present: ["icon", "info"] });

    expect(grid.templateAreas()).toBe('"icon info"');
  });
});
