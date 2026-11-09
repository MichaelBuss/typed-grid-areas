import { defineLayout } from "./defineLayout.ts";
import { mountGrid } from "./test-utils/mountGrid.ts";

describe("what a later layout resets of an earlier one that applies with it", () => {
  const tracks = defineLayout({
    areas: ["a", "b", "c"],
    layouts: [
      { template: "a b", rows: "30px", columns: "100px 1fr" },
      { when: ["c"], template: "a b c" },
    ],
  });

  it("keeps the earlier layout's track sizes while the later one doesn't apply", () => {
    const grid = mountGrid(tracks, { width: 300, present: ["a", "b"] });

    expect(grid.rect("a")).toMatchObject({ x: 0, width: 100, height: 30 });
    expect(grid.rect("b")).toMatchObject({ x: 100, width: 200 });
  });

  it("drops track sizes the later layout doesn't set", () => {
    const grid = mountGrid(tracks, { width: 300, present: ["a", "b", "c"] });

    expect(grid.templateAreas()).toBe('"a b c"');
    expect(grid.rect("a")).toMatchObject({ x: 0, width: 100, height: 10 });
    expect(grid.rect("b")).toMatchObject({ x: 100, width: 100 });
    expect(grid.rect("c")).toMatchObject({ x: 200, width: 100 });
  });

  it("drops the base layout's track sizes at a breakpoint that doesn't set them (@sm = 384px)", () => {
    const responsive = defineLayout({
      areas: ["a", "b"],
      layouts: [
        {
          template: "a / b",
          rows: "30px 40px",
          columns: "200px",
          breakpoints: { "@sm": { template: "a b" } },
        },
      ],
    });

    const narrow = mountGrid(responsive, { width: 300, present: ["a", "b"] });
    expect(narrow.rect("a")).toMatchObject({ width: 200, height: 30 });

    const wide = mountGrid(responsive, { width: 500, present: ["a", "b"] });
    expect(wide.rect("a")).toMatchObject({ x: 0, width: 250, height: 10 });
    expect(wide.rect("b")).toMatchObject({ x: 250, width: 250 });
  });

  it("drops an earlier alignment the later layout doesn't set", () => {
    const aligned = defineLayout({
      areas: ["a", "b"],
      layouts: [
        { template: "a b", rows: "50px", columns: "100px 100px", align: { b: { align: "end" } } },
        { when: ["a"], template: "a b", rows: "50px", columns: "100px 100px" },
      ],
    });

    const alone = mountGrid(aligned, { width: 200, present: ["b"] });
    expect(alone.rect("b")).toMatchObject({ y: 40, height: 10 });

    const together = mountGrid(aligned, { width: 200, present: ["a", "b"] });
    expect(together.rect("b")).toMatchObject({ y: 0, height: 50 });
  });

  it("places an area by name again after an earlier layout made it a layer", () => {
    const layered = defineLayout({
      areas: ["a", "b"],
      layouts: [
        { template: "a a+b", rows: "80px", columns: "100px 40px" },
        { when: ["b"], template: "b a", rows: "80px", columns: "40px 100px" },
      ],
    });
    const tgaOver = (grid: ReturnType<typeof mountGrid<"a" | "b">>) =>
      getComputedStyle(grid.slot("b")).getPropertyValue("--tga-over").trim();

    const layer = mountGrid(layered, { width: 140, present: ["a"] });
    expect(layer.rect("a")).toMatchObject({ x: 0, width: 140 });

    const named = mountGrid(layered, { width: 140, present: ["a", "b"] });
    expect(named.templateAreas()).toBe('"b a"');
    expect(named.rect("b")).toMatchObject({ x: 0, width: 40, height: 80 });
    expect(named.rect("a")).toMatchObject({ x: 40, width: 100 });
    expect(getComputedStyle(named.slot("b")).zIndex).toBe("auto");
    expect(tgaOver(named)).toBe("none");
  });
});
