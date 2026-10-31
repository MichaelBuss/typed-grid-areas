import * as preact from "./index.ts";

describe("the Preact adapter's entry point", () => {
  it("exports grid components and the server's style sheet, nothing else", () => {
    expect(Object.keys(preact).sort()).toEqual(["createGridComponent", "createGridStyleSheet"]);
  });
});
