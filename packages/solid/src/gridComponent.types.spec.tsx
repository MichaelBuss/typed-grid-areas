/**
 * Compile-time checks of grid components. Each `@ts-expect-error` must stay
 * an error, so `just typecheck` fails if a check goes missing. The JSX sits
 * in functions that never run: Solid's JSX renders as soon as it's evaluated.
 */
import { Component, JSX } from "solid-js";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent.tsx";

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

const Icon: Component<{ size: number; class?: string }> = props => (
  <svg width={props.size} height={props.size} class={props.class} />
);

const typeChecks: Array<() => JSX.Element> = [
  // The definition's slots, and a nested grid's slots through its area.
  () => (
    <Card class="card" aria-label="Card">
      <Card.input as="label" for="notify">
        <input id="notify" type="checkbox" />
      </Card.input>
      <Card.content style={{ padding: "8px" }}>
        <Card.content.icon as={Icon} size={16} />
        <Card.content.information>info</Card.content.information>
      </Card.content>
    </Card>
  ),
  // `as` takes a render function, on slots and grids alike.
  () => (
    <Card as={props => <section {...props} />}>
      <Card.content as={props => <article {...props} />} />
    </Card>
  ),
  // An annotated render function's props are the slot's attributes.
  () => (
    <Card.input
      as={(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />}
      for="notify"
    />
  ),
  // `ref` gets the element `as` renders.
  () => <Card.input as="label" ref={(label: HTMLLabelElement) => label.htmlFor} />,
  () => <Card as="section" ref={(section: HTMLElement) => section.id} />,

  // @ts-expect-error -- `nope` is not an area of Card
  () => <Card.nope />,
  // @ts-expect-error -- `input` is an area of Card, not of the nested content grid
  () => <Card.content.input />,
  // @ts-expect-error -- `href` is not an attribute of a div
  () => <Card.input href="/" />,
  // @ts-expect-error -- `href` is not an attribute of a label
  () => <Card.input as="label" href="/" />,
  // @ts-expect-error -- `for` is not an attribute of a section
  () => <Card as="section" for="notify" />,
  // @ts-expect-error -- an unannotated render function's slot takes a div's attributes
  () => <Card.input as={props => <label {...props} />} for="notify" />,
  // @ts-expect-error -- `ref` gets a label, not an input
  () => <Card.input as="label" ref={(input: HTMLInputElement) => input.value} />,
  // @ts-expect-error -- `size` is a number
  () => <Card.content.icon as={Icon} size="16" />,
  // @ts-expect-error -- `Icon` needs its `size`
  () => <Card.content.icon as={Icon} />,
];

describe("grid component type checks", () => {
  it("are checked by tsc", () => {
    expect(typeChecks.length).toBeGreaterThan(0);
  });

  it("rejects nesting into an area the definition doesn't have", () => {
    createGridComponent(
      defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      // @ts-expect-error -- `body` is not an area
      { nest: { body: ContentGrid } },
    );
  });
});
