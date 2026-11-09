import { defineLayout } from "../defineLayout.ts";
import { GridConfig } from "../types.ts";
import { Rule, toRules } from "./rules.ts";

/**
 * The arrangement that applies when exactly `present` slots are rendered and
 * the grid is at its base width: the last rule whose condition holds (later
 * wins).
 */
function applied(config: GridConfig<string>, present: ReadonlyArray<string>): Rule["arrangement"] {
  const winner = toRules(config)
    .filter(
      ({ condition, minWidth }) =>
        minWidth === undefined &&
        condition.when.every(area => present.includes(area)) &&
        condition.unless.every(area => !present.includes(area)),
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
});

describe("derived layouts with layers", () => {
  it("drops an absent layer from its cells without leaving a hole", () => {
    const grid = defineLayout({
      areas: ["photo", "details", "badge?"],
      layouts: [{ template: "photo photo+badge / details details" }],
    });

    expect(template(applied(grid, ["photo", "details"]))).toBe("photo photo / details details");
  });

  it("keeps a column a present layer would otherwise lose", () => {
    const grid = defineLayout({
      areas: ["photo", "badge", "details", "qr?"],
      layouts: [{ template: "photo photo+badge / details qr" }],
    });

    expect(template(applied(grid, ["photo", "details", "badge"]))).toBe(
      "photo photo+badge / details details",
    );
  });

  it("drops a column when its layers continue into the neighbouring column too", () => {
    const grid = defineLayout({
      areas: ["photo", "identity", "details", "qr?"],
      layouts: [
        {
          template: "photo photo / photo+identity photo+identity / details qr",
          columns: "1fr 60px",
        },
      ],
    });

    const arrangement = applied(grid, ["photo", "identity", "details"]);
    expect(template(arrangement)).toBe("photo / photo+identity / details");
    expect(arrangement.columns).toEqual(["1fr"]);
  });

  it("keeps the layers over a hole when a neighbour grows into it", () => {
    const grid = defineLayout({
      areas: ["details", "qr?", "check"],
      layouts: [{ template: "details qr+check / details details" }],
    });

    expect(template(applied(grid, ["details", "check"]))).toBe(
      "details details+check / details details",
    );
  });
});
