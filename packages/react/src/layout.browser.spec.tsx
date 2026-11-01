import { render } from "vitest-browser-react";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent.tsx";
import { mountGrid } from "./test-utils/mountGrid.tsx";

const cardGrid = defineLayout({
  areas: ["icon", "info", "tag"],
  layouts: [
    {
      template: "info tag",
      columns: "1fr 100px",
    },
    {
      when: ["icon", "info"],
      template: "icon info",
      columns: "48px 1fr",
    },
  ],
});

const breakpointGrid = defineLayout({
  areas: ["icon", "info"],
  layouts: [
    {
      template: "icon / info",
      breakpoints: {
        "@sm": { template: "icon info", columns: "48px 1fr" },
      },
    },
  ],
});

describe("grid layout in a real browser", () => {
  it("lays out a multi-line text template with a one-string track list", async () => {
    const textGrid = defineLayout({
      areas: ["icon", "tag", "info"],
      layouts: [
        {
          template: `
            icon tag
            info info`,
          rows: "20px minmax(0, 30px)",
          columns: "48px minmax(0, 1fr)",
        },
      ],
    });

    const grid = await mountGrid(textGrid, { width: 200, present: ["icon", "tag", "info"] });

    expect(grid.templateAreas()).toBe('"icon tag" "info info"');
    expect(grid.rect("icon")).toMatchObject({ x: 0, y: 0, width: 48, height: 20 });
    expect(grid.rect("tag")).toMatchObject({ x: 48, y: 0, width: 152, height: 20 });
    expect(grid.rect("info")).toMatchObject({ x: 0, y: 20, width: 200, height: 30 });
  });

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
    const unlessGrid = defineLayout({
      areas: ["icon", "info", "tag"],
      layouts: [
        { template: "info tag", columns: "1fr 100px" },
        {
          when: ["icon"],
          unless: ["tag"],
          template: "icon info",
          columns: "48px 1fr",
        },
      ],
    });

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
    const precedenceGrid = defineLayout({
      areas: ["icon", "info", "tag"],
      layouts: [
        { when: ["icon", "info", "tag"], template: "icon info tag" },
        { when: ["info"], template: "info tag icon" },
      ],
    });

    const grid = await mountGrid(precedenceGrid, {
      width: 300,
      present: ["icon", "info", "tag"],
    });

    expect(grid.templateAreas()).toBe('"info tag icon"');
    expect(grid.rect("info")).toMatchObject({ x: 0 });
  });

  describe("areas a layout leaves out", () => {
    const hidingGrid = defineLayout({
      areas: ["icon", "info", "tag"],
      layouts: [
        { template: "info tag" },
        { when: ["icon"], template: "icon info" },
        { when: ["icon", "tag"], unless: ["info"], template: "icon tag" },
      ],
    });

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

    describe("with breakpoints (@sm = 384px)", () => {
      const responsiveHidingGrid = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
      });

      it("are hidden below the breakpoint that brings them in", async () => {
        const grid = await mountGrid(responsiveHidingGrid, {
          width: 200,
          present: ["icon", "info"],
          slotClassNames: { icon: "flex-slot" },
        });

        expect(grid.slot("icon").getClientRects()).toHaveLength(0);
      });

      it("appear from that breakpoint up", async () => {
        const grid = await mountGrid(responsiveHidingGrid, {
          width: 800,
          present: ["icon", "info"],
          slotClassNames: { icon: "flex-slot" },
        });

        expect(grid.templateAreas()).toBe('"icon info"');
        expect(getComputedStyle(grid.slot("icon")).display).toBe("flex");
      });
    });
  });

  describe("breakpoint precedence (@sm = 384px)", () => {
    const precedenceGrid = defineLayout({
      areas: ["icon", "info", "tag"],
      layouts: [
        {
          template: "icon / info",
          breakpoints: { "@sm": { template: "icon info" } },
        },
        { when: ["tag"], template: "tag info" },
      ],
    });

    it("lets a layout's breakpoint arrangement beat its own base arrangement", async () => {
      const grid = await mountGrid(precedenceGrid, { width: 800, present: ["icon", "info"] });

      expect(grid.templateAreas()).toBe('"icon info"');
    });

    it("lets a later layout beat an earlier layout's breakpoint arrangement", async () => {
      const grid = await mountGrid(precedenceGrid, {
        width: 800,
        present: ["icon", "info", "tag"],
      });

      expect(grid.templateAreas()).toBe('"tag info"');
      expect(grid.slot("icon").getClientRects()).toHaveLength(0);
    });
  });

  describe("per-area alignment", () => {
    const alignedGrid = defineLayout({
      areas: ["icon", "info", "tag"],
      layouts: [
        {
          template: "info tag",
          rows: "50px",
          columns: "1fr 100px",
          align: { tag: { justify: "end", align: "center" } },
        },
        {
          when: ["icon"],
          template: "icon tag",
          rows: "50px",
          columns: "100px 100px",
        },
      ],
    });

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

  it("applies a breakpoint layout based on the grid's own width", async () => {
    // 800px is well above @sm (24rem = 384px), and the wrapper is not a container.
    const grid = await mountGrid(breakpointGrid, { width: 800, present: ["icon", "info"] });

    expect(grid.templateAreas()).toBe('"icon info"');
  });

  it("switches a nested grid's breakpoints on the nested grid's own width", async () => {
    // At 800px the outer grid's own @sm layout applies, giving `main` 200px.
    // `main` comes after an empty cell, so the nested grid only lands in it if
    // the area reaches its outermost element (auto-placement would pick the
    // empty cell).
    const outerGrid = defineLayout({
      areas: ["main", "side"],
      layouts: [
        {
          template: ". side main",
          columns: "1fr 1fr 1fr",
          breakpoints: {
            "@sm": { template: ". side main", columns: "1fr 1fr 200px" },
          },
        },
      ],
    });

    const Outer = createGridComponent(outerGrid, {
      nest: { main: createGridComponent(breakpointGrid) },
    });

    function Nested() {
      return (
        <Outer>
          <Outer.main data-testid="inner">
            <Outer.main.icon />
            <Outer.main.info />
          </Outer.main>
          <Outer.side />
        </Outer>
      );
    }

    await render(
      <div style={{ width: 800 }}>
        <Nested />
      </div>,
    );

    const inner = document.querySelector<HTMLElement>("[data-testid=inner]");
    expect(inner?.getBoundingClientRect().width).toBe(200);
    expect(inner && getComputedStyle(inner).gridTemplateAreas).toBe('"icon" "info"');
  });

  describe("an arbitrary breakpoint (@[27rem] = 432px)", () => {
    const arbitraryGrid = defineLayout({
      areas: ["icon", "info"],
      layouts: [
        {
          template: "icon / info",
          breakpoints: { "@[27rem]": { template: "icon info" } },
        },
      ],
    });

    it("does not apply just below its width", async () => {
      const grid = await mountGrid(arbitraryGrid, { width: 431, present: ["icon", "info"] });

      expect(grid.templateAreas()).toBe('"icon" "info"');
    });

    it("applies at its width", async () => {
      const grid = await mountGrid(arbitraryGrid, { width: 432, present: ["icon", "info"] });

      expect(grid.templateAreas()).toBe('"icon info"');
    });
  });

  it("ignores a wider size container above the grid", async () => {
    const grid = await mountGrid(breakpointGrid, {
      width: 200,
      ancestorContainerWidth: 800,
      present: ["icon", "info"],
    });

    expect(grid.templateAreas()).toBe('"icon" "info"');
  });

  it("ignores a narrower size container above the grid", async () => {
    const grid = await mountGrid(breakpointGrid, {
      width: 800,
      ancestorContainerWidth: 200,
      present: ["icon", "info"],
    });

    expect(grid.templateAreas()).toBe('"icon info"');
  });
});
