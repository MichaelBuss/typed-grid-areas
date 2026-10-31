import * as react from "./index.ts";

describe("the React adapter's entry point", () => {
  it("renders with grid components instead of the hook and render prop", () => {
    expect(react).toHaveProperty("createGridComponent");
    expect(react).not.toHaveProperty("useGridAreas");
    expect(react).not.toHaveProperty("GridAreas");
  });
});
