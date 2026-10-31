import { render } from "vitest-browser-react";
import { createGrid } from "./createGrid";
import { GridAreas } from "./react/GridAreas";
import { useGridAreas } from "./react/useGridAreas";
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
    const outerGrid = createGrid()
      .areas(["main", "side"])
      .layout({
        layout: [[".", "side", "main"]],
        columns: ["1fr", "1fr", "1fr"],
        breakpoints: {
          "@sm": { layout: [[".", "side", "main"]], columns: ["1fr", "1fr", "200px"] },
        },
      })
      .build();

    function Nested() {
      const outer = useGridAreas(outerGrid);
      const inner = useGridAreas(breakpointGrid);
      return (
        <GridAreas {...outer}>
          {slots => (
            <>
              <GridAreas {...inner} {...slots.main} data-testid="inner">
                {innerSlots => (
                  <>
                    <div {...innerSlots.icon} />
                    <div {...innerSlots.info} />
                  </>
                )}
              </GridAreas>
              <div {...slots.side} />
            </>
          )}
        </GridAreas>
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
    const arbitraryGrid = createGrid()
      .areas(["icon", "info"])
      .layout({
        layout: [["icon"], ["info"]],
        breakpoints: { "@[27rem]": { layout: [["icon", "info"]] } },
      })
      .build();

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
