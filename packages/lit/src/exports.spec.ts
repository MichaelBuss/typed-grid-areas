import * as lit from "./index.ts";

describe("the Lit adapter's entry point", () => {
  it("exports the grid template function and its styles, and nothing else", () => {
    expect(Object.keys(lit).sort()).toEqual(["createGrid", "gridStyles"]);
  });
});
