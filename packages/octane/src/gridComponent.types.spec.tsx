/** @jsxImportSource octane */
/**
 * Compile-time checks of grid components from a `.tsx` caller. Each
 * `@ts-expect-error` must stay an error, so `just typecheck` fails if a check
 * goes missing.
 */
import { useRef } from "octane";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent";

const ContentGrid = createGridComponent(
  defineLayout({
    areas: ["icon?", "information"],
    layouts: [{ template: "icon information" }],
  }),
);

const Card = createGridComponent(
  defineLayout({
    areas: ["input?", "content"],
    layouts: [{ template: "input content" }],
  }),
  { nest: { content: ContentGrid } },
);

describe("grid component type checks", () => {
  it("accepts the definition's slots, and a nested grid's slots through its area", () => {
    void (
      <Card class="card" render={<section />}>
        <Card.input render={<label for="notify" />}>
          <input id="notify" type="checkbox" />
        </Card.input>
        <Card.content style={{ padding: 8 }}>
          <Card.content.icon aria-hidden>{"★"}</Card.content.icon>
          <Card.content.information>{"info"}</Card.content.information>
        </Card.content>
      </Card>
    );
  });

  it("rejects a slot the definition doesn't have", () => {
    // @ts-expect-error -- `nope` is not an area of Card
    void (<Card.nope />);
  });

  it("rejects a nested grid's slot that it doesn't have", () => {
    // @ts-expect-error -- `input` is an area of Card, not of the nested content grid
    void (<Card.content.input />);
  });

  it("rejects nesting into an area the definition doesn't have", () => {
    createGridComponent(
      defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      // @ts-expect-error -- `body` is not an area
      { nest: { body: ContentGrid } },
    );
  });

  it("rejects element props a div doesn't take", () => {
    // @ts-expect-error -- `href` is not a div prop
    void (<Card.input href="/" />);
  });

  it("takes refs typed for a specific element, as objects and as callbacks", () => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const labelRef = useRef<HTMLLabelElement | null>(null);
    void (
      <Card ref={divRef}>
        <Card.input ref={labelRef} render={<label for="notify" />} />
        <Card.content ref={(element: HTMLDivElement | null) => void element?.dataset}>
          <Card.content.icon ref={element => void element?.dataset} />
          <Card.content.information ref={[divRef, (element: HTMLElement | null) => void element]} />
        </Card.content>
      </Card>
    );
  });

  it("rejects a ref for something that isn't an element", () => {
    const textRef = useRef<Text | null>(null);
    // @ts-expect-error -- a slot renders an element, not a text node
    void (<Card.input ref={textRef} />);
  });

  it("takes an element, not a component, as render", () => {
    // @ts-expect-error -- render takes an element (`<section />`), not a tag name
    void (<Card render="section" />);
  });
});
