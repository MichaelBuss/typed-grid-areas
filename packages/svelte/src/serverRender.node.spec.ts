/**
 * Server rendering with `render` from `svelte/server`: where the CSS goes,
 * and that nothing is logged.
 */
import { render } from "svelte/server";
import { gridId } from "typed-grid-areas";
import { gridStyleTags } from "typed-grid-areas/adapter";
import { cardGrid, contentGrid, responsiveGrid } from "./fixtures/grids.ts";
import Instances from "./fixtures/Instances.svelte";
import Markup from "./fixtures/Markup.svelte";
import MissingSlot from "./fixtures/MissingSlot.svelte";

/** How often `text` occurs in `html`. */
const count = (html: string, text: string) => html.split(text).length - 1;

describe("server rendering", () => {
  it("puts each definition's CSS in head exactly once, however many instances render", () => {
    const { head, body } = render(Instances, { props: { keys: [1, 2, 3, 4, 5] } });

    expect(count(head, gridStyleTags([cardGrid]))).toBe(1);
    expect(count(head, "<style")).toBe(1);
    expect(count(body, `data-grid-id="${gridId(cardGrid)}"`)).toBe(5);
  });

  it("puts it there again in the next render", () => {
    render(Instances, { props: { keys: [1, 2] } });
    const { head } = render(Instances, { props: { keys: [1, 2] } });

    expect(count(head, gridStyleTags([cardGrid]))).toBe(1);
  });

  it("renders every definition's CSS once, nested grids' included", () => {
    const { head } = render(Markup);

    // Card, Responsive, Nested and its content grid; Responsive is also nested.
    expect(count(head, "<style")).toBe(4);
    for (const definition of [cardGrid, contentGrid, responsiveGrid]) {
      expect(count(head, gridStyleTags([definition]))).toBe(1);
    }
  });

  it("logs nothing, even about missing slots or stray children", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(MissingSlot);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
