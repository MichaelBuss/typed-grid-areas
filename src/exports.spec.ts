import * as core from "./index";
import * as react from "./react";

describe("public entry points", () => {
  it("keep the framework-free core", () => {
    expect(core).toHaveProperty("defineLayout");
    expect(core).toHaveProperty("createSlots");
    expect(core).toHaveProperty("generateCss");
    expect(core).not.toHaveProperty("validateGridSlots");
  });

  it("render with grid components instead of the hook and render prop", () => {
    expect(react).toHaveProperty("createGridComponent");
    expect(react).not.toHaveProperty("useGridAreas");
    expect(react).not.toHaveProperty("GridAreas");
  });
});
