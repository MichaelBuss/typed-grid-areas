/**
 * Compile-time checks of grid components outside templates (the template
 * checks are in `gridComponent.types.spec.vue`). Each `@ts-expect-error` must
 * stay an error, so `npm run typecheck` fails if a check goes missing.
 */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent, type SlotComponent } from "./index.ts";

const Content = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
const Card = createGridComponent(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);

describe("grid component type checks", () => {
  it("types each area as a member, and a nested area as the nested grid", () => {
    const input: SlotComponent = Card.input;
    const icon: SlotComponent = Card.content.icon;
    void [input, icon];
    // @ts-expect-error -- members aren't `any`: `inputt` is not an area of Card
    void Card.inputt;
    // @ts-expect-error -- `iconn` is not an area of the nested grid
    void Card.content.iconn;
  });

  it("rejects nesting into an area the definition doesn't have", () => {
    createGridComponent(
      defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      // @ts-expect-error -- `body` is not an area
      { nest: { body: Content } },
    );
  });

  it("rejects area names Vue reserves on a component", () => {
    expect(() =>
      createGridComponent(
        // @ts-expect-error -- `props` is reserved by Vue
        defineLayout({ areas: ["props", "info"], layouts: [{ template: "props info" }] }),
      ),
    ).toThrow();
    expect(() =>
      createGridComponent(
        // @ts-expect-error -- names starting with `__` are reserved by Vue
        defineLayout({ areas: ["__file", "info"], layouts: [{ template: "__file info" }] }),
      ),
    ).toThrow();
  });
});
