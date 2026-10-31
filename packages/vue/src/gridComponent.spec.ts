import { defineLayout, type GridConfig } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

describe("createGridComponent", () => {
  it.each([
    "length",
    "props",
    "emits",
    "slots",
    "inheritAttrs",
    "displayName",
    "compatConfig",
    "__name",
    "__hmrId",
  ])("rejects the area name %j, which Vue reserves on a component", area => {
    // Typed as any area name: the type error a literal one gets is in the type tests.
    const definition: GridConfig<string> = {
      areas: [area, "info"],
      layouts: [{ cells: [[area, "info"]] }],
    };

    expect(() => createGridComponent(definition)).toThrow(
      `typed-grid-areas: the area name "${area}" is reserved by Vue`,
    );
  });

  it("accepts area names Vue doesn't reserve, even a function's own `name`", () => {
    const Card = createGridComponent(
      defineLayout({
        areas: ["name", "_private", "info"],
        layouts: [{ template: "name _private info" }],
      }),
    );

    expect(Card.name).toBeDefined();
    expect(Card._private).toBeDefined();
  });
});
