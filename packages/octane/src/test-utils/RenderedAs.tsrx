/**
 * A `.tsrx` caller that makes its own elements the grid and a slot with
 * `render`, for the browser specs. `.tsrx` compiles children to functions,
 * which is what `render` has to cope with.
 */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../gridComponent";
import type { Refs } from "./refs";

const Row = createGridComponent(
  defineLayout({
    areas: ["input", "content"],
    layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
  }),
);

export function RenderedAs(props: { refs: Refs }) @{
  <Row
    class="grid"
    ref={props.refs.grid}
    data-testid="grid"
    render={<section class="own-grid" ref={props.refs.section} data-grid-id="mine" />}
  >
    <Row.input
      class="slot"
      ref={props.refs.slot}
      render={<label for="notify" class="own-slot" ref={props.refs.label} data-area="mine" />}
    >
      <input id="notify" type="checkbox" />
    </Row.input>
    <Row.content>{'Notify me'}</Row.content>
  </Row>
}
