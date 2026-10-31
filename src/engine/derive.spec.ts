import { defineLayout } from "../defineLayout";
import { GridConfig } from "../types";
import { breakpointWidth, Rule, toRules, widthRank } from "./rules";

/**
 * The arrangement that applies when exactly `present` slots are rendered and
 * the grid is given `width`: the last rule whose condition and breakpoint
 * both hold (later wins).
 */
function applied(
  config: GridConfig<string>,
  present: ReadonlyArray<string>,
  width?: string,
): Rule["arrangement"] {
  const winner = toRules(config)
    .filter(
      ({ condition, minWidth }) =>
        condition.when.every(area => present.includes(area)) &&
        condition.unless.every(area => !present.includes(area)) &&
        widthRank(minWidth) <= widthRank(width),
    )
    .at(-1);
  if (winner === undefined) {
    throw new Error(`no rule applies for [${present.join(", ")}]`);
  }
  return winner.arrangement;
}

/** Cells as a text template, rows separated by " / ". */
function template(arrangement: Rule["arrangement"]): string {
  return arrangement.cells.map(row => row.join(" ")).join(" / ");
}

describe("derived layouts", () => {
  const card = defineLayout({
    areas: ["icon?", "information", "cardTag?", "children?"],
    layouts: [
      {
        template: "icon cardTag / information information / children children",
      },
    ],
  });

  it("drops the row an absent optional area leaves empty", () => {
    expect(template(applied(card, ["icon", "information", "cardTag"]))).toBe(
      "icon cardTag / information information",
    );
  });

  it("drops a column whose other areas continue into the neighbouring column", () => {
    expect(template(applied(card, ["icon", "information", "children"]))).toBe(
      "icon / information / children",
    );
  });

  it("keeps areas spanning the full width when the row above them empties", () => {
    expect(template(applied(card, ["information", "children"]))).toBe(
      "information information / children children",
    );
  });

  it("uses the authored layout while every optional area is present", () => {
    expect(template(applied(card, ["icon", "information", "cardTag", "children"]))).toBe(
      "icon cardTag / information information / children children",
    );
  });

  it("shortens an area that spans the dropped column", () => {
    const idCard = defineLayout({
      areas: ["photo", "details", "qr?"],
      layouts: [
        {
          template: "photo photo / details qr",
        },
      ],
    });

    expect(template(applied(idCard, ["photo", "details"]))).toBe("photo / details");
  });

  it("lets the left neighbour grow into a hole that can't be dropped", () => {
    const idCard = defineLayout({
      areas: ["photo", "identity", "logo", "details", "qr?"],
      layouts: [
        {
          template: "photo identity logo / photo details qr",
        },
      ],
    });

    expect(template(applied(idCard, ["photo", "identity", "logo", "details"]))).toBe(
      "photo identity logo / photo details details",
    );
  });

  it("tries the right neighbour when the left one wouldn't stay a rectangle", () => {
    const grid = defineLayout({
      areas: ["a", "b", "c", "d", "gone?"],
      layouts: [
        {
          template: "a gone b / a c d",
        },
      ],
    });

    expect(template(applied(grid, ["a", "b", "c", "d"]))).toBe("a b b / a c d");
  });

  it("leaves a hole empty when no neighbour can grow into it", () => {
    const grid = defineLayout({
      areas: ["a", "b", "c", "gone?"],
      layouts: [
        {
          template: "a b b / . gone c / . . c",
        },
      ],
    });

    expect(template(applied(grid, ["a", "b", "c"]))).toBe("a b b / . . c / . . c");
  });

  it("never drops or fills a cell authored as '.'", () => {
    const grid = defineLayout({
      areas: ["a", "b?"],
      layouts: [
        {
          template: ". a / . b",
        },
      ],
    });

    // The "." row can't be dropped, so `a` grows down into the hole instead.
    expect(template(applied(grid, ["a"]))).toBe(". a / . a");

    const keepsDot = defineLayout({ areas: ["a", "b?"], layouts: [{ template: "a . b" }] });

    expect(template(applied(keepsDot, ["a"]))).toBe("a .");
  });

  it("drops track sizes and alignment along with what they belonged to", () => {
    const grid = defineLayout({
      areas: ["icon?", "info"],
      layouts: [
        {
          template: "icon info",
          columns: "48px 1fr",
          align: { icon: { align: "center" }, info: { justify: "end" } },
        },
      ],
    });

    expect(applied(grid, ["info"])).toEqual({
      cells: [["info"]],
      rows: undefined,
      columns: ["1fr"],
      align: { info: { justify: "end" } },
    });
  });

  it("derives breakpoint arrangements too", () => {
    const grid = defineLayout({
      areas: ["icon?", "info", "tag?"],
      layouts: [
        {
          template: "icon / info / tag",
          breakpoints: { "@sm": { template: "icon info tag" } },
        },
      ],
    });

    expect(template(applied(grid, ["info", "tag"], "30rem"))).toBe("info tag");
    expect(template(applied(grid, ["info", "tag"]))).toBe("info / tag");
  });

  it("doesn't vary an optional area the layout's condition fixes", () => {
    const grid = defineLayout({
      areas: ["icon?", "info", "tag?"],
      layouts: [{ template: "info" }, { when: ["icon"], template: "icon info tag" }],
    });

    const derivedConditions = toRules(grid)
      .slice(2)
      .map(({ condition }) => condition);
    expect(derivedConditions).toEqual([{ when: ["icon"], unless: ["tag"] }]);
  });

  it("lets a later override beat the derived layout for the same combination", () => {
    const grid = defineLayout({
      areas: ["icon?", "information", "cardTag?", "children?"],
      layouts: [
        {
          template: "icon cardTag / information information / children children",
        },
        {
          unless: ["cardTag"],
          template: "icon information / children children",
        },
      ],
    });

    expect(template(applied(grid, ["icon", "information", "children"]))).toBe(
      "icon information / children children",
    );
    expect(template(applied(grid, ["icon", "information"]))).toBe("icon information");
  });
});
