import { defineLayout } from "typed-grid-areas";
import { mountGrid } from "./test-utils/mountGrid.tsx";

describe("derived layouts in a real browser", () => {
  const card = defineLayout({
    areas: ["icon?", "information", "cardTag?", "children?"],
    layouts: [
      {
        template: "icon cardTag / information information / children children",
        rows: "20px 30px 40px",
        columns: "48px 1fr",
      },
    ],
  });

  it("uses the authored layout while every optional area is present", async () => {
    const grid = await mountGrid(card, {
      width: 300,
      present: ["icon", "information", "cardTag", "children"],
    });

    expect(grid.templateAreas()).toBe(
      '"icon cardTag" "information information" "children children"',
    );
    expect(grid.rect("cardTag")).toMatchObject({ x: 48, y: 0, width: 252, height: 20 });
  });

  it("drops the row an absent area leaves empty", async () => {
    const grid = await mountGrid(card, {
      width: 300,
      present: ["icon", "information", "cardTag"],
    });

    expect(grid.templateAreas()).toBe('"icon cardTag" "information information"');
    expect(grid.rect("information")).toMatchObject({ x: 0, y: 20, width: 300, height: 30 });
  });

  it("drops a column, with its track size, when the areas beside it continue into another", async () => {
    const grid = await mountGrid(card, {
      width: 300,
      present: ["icon", "information", "children"],
    });

    expect(grid.templateAreas()).toBe('"icon" "information" "children"');
    expect(grid.rect("icon")).toMatchObject({ x: 0, y: 0, width: 48, height: 20 });
    expect(grid.rect("information")).toMatchObject({ x: 0, y: 20, width: 48, height: 30 });
    expect(grid.rect("children")).toMatchObject({ x: 0, y: 50, width: 48, height: 40 });
  });

  it("keeps spanning areas at full width when the first row empties", async () => {
    const grid = await mountGrid(card, { width: 300, present: ["information", "children"] });

    expect(grid.templateAreas()).toBe('"information information" "children children"');
    expect(grid.rect("information")).toMatchObject({ x: 0, y: 0, width: 300, height: 30 });
    expect(grid.rect("children")).toMatchObject({ x: 0, y: 30, width: 300, height: 40 });
  });

  it("shortens an area spanning a dropped column", async () => {
    const idCard = defineLayout({
      areas: ["photo", "details", "qr?"],
      layouts: [
        {
          template: "photo photo / details qr",
          columns: "1fr 100px",
        },
      ],
    });

    const grid = await mountGrid(idCard, { width: 300, present: ["photo", "details"] });

    expect(grid.templateAreas()).toBe('"photo" "details"');
    expect(grid.rect("photo")).toMatchObject({ x: 0, width: 300 });
    expect(grid.rect("details")).toMatchObject({ x: 0, width: 300 });
  });

  it("lets a neighbour grow into a hole that can't be dropped", async () => {
    const idCard = defineLayout({
      areas: ["photo", "identity", "logo", "details", "qr?"],
      layouts: [
        {
          template: "photo identity logo / photo details qr",
          columns: "100px 1fr 50px",
        },
      ],
    });

    const grid = await mountGrid(idCard, {
      width: 300,
      present: ["photo", "identity", "logo", "details"],
    });

    expect(grid.templateAreas()).toBe('"photo identity logo" "photo details details"');
    expect(grid.rect("details")).toMatchObject({ x: 100, width: 200 });
  });

  it("lets an override declared after the layout beat the derived layout", async () => {
    const withOverride = defineLayout({
      areas: ["icon?", "information", "cardTag?", "children?"],
      layouts: [
        {
          template: "icon cardTag / information information / children children",
          columns: "48px 1fr",
        },
        {
          unless: ["cardTag"],
          template: "icon information / children children",
          columns: "48px 1fr",
        },
      ],
    });

    const grid = await mountGrid(withOverride, {
      width: 300,
      present: ["icon", "information", "children"],
    });

    expect(grid.templateAreas()).toBe('"icon information" "children children"');
    expect(grid.rect("information")).toMatchObject({ x: 48, y: 0, width: 252 });
  });

  it("derives breakpoint arrangements too (@sm = 384px)", async () => {
    const responsive = defineLayout({
      areas: ["icon?", "information", "cardTag?"],
      layouts: [
        {
          template: "icon information / cardTag cardTag",
          columns: "48px 1fr",
          breakpoints: {
            "@sm": {
              template: "icon information cardTag",
              columns: "48px 1fr 100px",
            },
          },
        },
      ],
    });

    const narrow = await mountGrid(responsive, { width: 300, present: ["information", "cardTag"] });
    expect(narrow.templateAreas()).toBe('"information" "cardTag"');

    const wide = await mountGrid(responsive, { width: 500, present: ["information", "cardTag"] });
    expect(wide.templateAreas()).toBe('"information cardTag"');
    expect(wide.rect("cardTag")).toMatchObject({ x: 400, width: 100 });
  });
});
