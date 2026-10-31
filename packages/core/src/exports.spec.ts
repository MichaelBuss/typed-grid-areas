import * as core from "./index.ts";

describe("public entry points", () => {
  it("keep the framework-free core", () => {
    expect(core).toHaveProperty("defineLayout");
    expect(core).toHaveProperty("createSlots");
    expect(core).toHaveProperty("generateCss");
    expect(core).not.toHaveProperty("validateGridSlots");
  });
});
