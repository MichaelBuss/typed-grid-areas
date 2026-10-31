/**
 * Compile-time checks of grid components. Each `@ts-expect-error` must stay
 * an error, so `just typecheck` fails if a check goes missing.
 */
import { createRef } from "preact";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

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
      <Card class="card">
        <Card.input asChild>
          <label for="x" />
        </Card.input>
        <Card.content style={{ padding: 8 }}>
          <Card.content.icon aria-hidden />
          <Card.content.information>info</Card.content.information>
        </Card.content>
      </Card>
    );
  });

  it("accepts class, className, style and ref, as a div does", () => {
    const ref = createRef<HTMLDivElement>();
    void (
      <Card className="card" style="padding: 8px" ref={ref}>
        <Card.input class="input" ref={element => void element?.tagName} />
        <Card.content className="content" style={{ gap: 4 }} />
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
});
