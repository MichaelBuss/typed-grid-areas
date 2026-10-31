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

  it("still applies a layout when a slot its condition doesn't mention is also rendered", async () => {
    const withTagToo = await mountGrid(cardGrid, {
      width: 200,
      present: ["icon", "info", "tag"],
    });

    expect(withTagToo.templateAreas()).toBe('"icon info"');
  });

  it("stops applying a layout when a slot in its unless list is rendered", async () => {
    const unlessGrid = createGrid()
      .areas(["icon", "info", "tag"])
      .layout({ layout: [["info", "tag"]], columns: ["1fr", "100px"] })
      .layout({
        when: ["icon"],
        unless: ["tag"],
        layout: [["icon", "info"]],
        columns: ["48px", "1fr"],
      })
      .build();

    const withoutTag = await mountGrid(unlessGrid, { width: 200, present: ["icon", "info"] });
    expect(withoutTag.templateAreas()).toBe('"icon info"');

    const withTag = await mountGrid(unlessGrid, { width: 200, present: ["icon", "info", "tag"] });
    expect(withTag.templateAreas()).toBe('"info tag"');
  });

  it("falls back to the base layout when a slot the condition requires is removed", async () => {
    const withoutIcon = await mountGrid(cardGrid, { width: 200, present: ["info"] });

    expect(withoutIcon.templateAreas()).toBe('"info tag"');
  });

  it("applies the later of two matching layouts even if the earlier one mentions more areas", async () => {
    const precedenceGrid = createGrid()
      .areas(["icon", "info", "tag"])
      .layout({ when: ["icon", "info", "tag"], layout: [["icon", "info", "tag"]] })
      .layout({ when: ["info"], layout: [["info", "tag", "icon"]] })
      .build();

    const grid = await mountGrid(precedenceGrid, {
      width: 300,
      present: ["icon", "info", "tag"],
    });

    expect(grid.templateAreas()).toBe('"info tag icon"');
    expect(grid.rect("info")).toMatchObject({ x: 0 });
  });

  describe("areas a layout leaves out", () => {
    const hidingGrid = createGrid()
      .areas(["icon", "info", "tag"])
      .layout({ layout: [["info", "tag"]] })
      .layout({ when: ["icon"], layout: [["icon", "info"]] })
      .layout({ when: ["icon", "tag"], unless: ["info"], layout: [["icon", "tag"]] })
      .build();

    // A consumer class that sets display, as slots often do for their own content.
    const consumerStyle = document.createElement("style");
    consumerStyle.textContent = ".flex-slot { display: flex; }";

    beforeAll(() => {
      document.head.append(consumerStyle);
    });

    afterAll(() => {
      consumerStyle.remove();
    });

    it("have no rendered box while that layout applies", async () => {
      const grid = await mountGrid(hidingGrid, {
        width: 200,
        present: ["icon", "info", "tag"],
        slotClassNames: { tag: "flex-slot" },
      });

      expect(grid.templateAreas()).toBe('"icon info"');
      expect(grid.slot("tag").getClientRects()).toHaveLength(0);
    });

    it("appear again when a later matching layout includes them", async () => {
      const grid = await mountGrid(hidingGrid, {
        width: 200,
        present: ["icon", "tag"],
        slotClassNames: { tag: "flex-slot" },
      });

      expect(grid.templateAreas()).toBe('"icon tag"');
      expect(grid.rect("tag")).toMatchObject({ x: 100, width: 100 });
      expect(getComputedStyle(grid.slot("tag")).display).toBe("flex");
    });
  });

  describe("per-area alignment", () => {
    const alignedGrid = createGrid()
      .areas(["icon", "info", "tag"])
      .layout({
        layout: [["info", "tag"]],
        rows: ["50px"],
        columns: ["1fr", "100px"],
        align: { tag: { justify: "end", align: "center" } },
      })
      .layout({
        when: ["icon"],
        layout: [["icon", "tag"]],
        rows: ["50px"],
        columns: ["100px", "100px"],
      })
      .build();

    it("aligns an area within its cell", async () => {
      const grid = await mountGrid(alignedGrid, { width: 200, present: ["info", "tag"] });

      // An empty slot shrinks to zero width at the end of its 100px column,
      // and its 10px min-height sits centred in the 50px row.
      expect(grid.rect("tag")).toMatchObject({ x: 200, width: 0, y: 20, height: 10 });
    });

    it("doesn't carry over into a different layout that also matches", async () => {
      const grid = await mountGrid(alignedGrid, {
        width: 200,
        present: ["icon", "info", "tag"],
      });

      expect(grid.rect("tag")).toMatchObject({ x: 100, width: 100, y: 0, height: 50 });
    });

    it("loses to a consumer class that sets justify-self on the slot", async () => {
      // Zero specificity and earlier in the document than the grid's own CSS,
      // so only the cascade layer lets it win.
      const consumerStyle = document.createElement("style");
      consumerStyle.textContent = ":where(.start-slot) { justify-self: start; }";
      document.head.append(consumerStyle);

      try {
        const grid = await mountGrid(alignedGrid, {
          width: 200,
          present: ["info", "tag"],
          slotClassNames: { tag: "start-slot" },
        });

        expect(grid.rect("tag")).toMatchObject({ x: 100, width: 0 });
      } finally {
        consumerStyle.remove();
      }
    });
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
