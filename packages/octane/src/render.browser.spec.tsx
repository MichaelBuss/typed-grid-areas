/** @jsxImportSource octane */
/**
 * `render={<el />}` makes your own element the slot, or the grid, from both
 * `.tsx` and `.tsrx` callers.
 */
import { render } from "@octanejs/testing-library";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "./index";
import { RenderedAs } from "./test-utils/RenderedAs.tsrx";
import { newRefs, type Refs } from "./test-utils/refs";

const definition = defineLayout({
  areas: ["input", "content"],
  layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
});
const Row = createGridComponent(definition);

function FromTsx({ refs }: { refs: Refs }) {
  return (
    <Row
      class="grid"
      ref={refs.grid}
      data-testid="grid"
      render={<section class="own-grid" ref={refs.section} data-grid-id="mine" />}
    >
      <Row.input
        class="slot"
        ref={refs.slot}
        render={<label for="notify" class="own-slot" ref={refs.label} data-area="mine" />}
      >
        <input id="notify" type="checkbox" />
      </Row.input>
      <Row.content>{"Notify me"}</Row.content>
    </Row>
  );
}

describe.each([
  ["a .tsx caller", FromTsx],
  ["a .tsrx caller", RenderedAs],
])("render={<el />} from %s", (_, Caller) => {
  function mount() {
    const refs = newRefs();
    const { container } = render(
      <div style={{ width: 300 }}>
        <Caller refs={refs} />
      </div>,
    );
    const grid = container.querySelector<HTMLElement>("[data-testid=grid]")!;
    return { refs, grid, label: grid.querySelector<HTMLElement>("label")! };
  }

  it("makes the element the grid, with the grid's id winning over the element's own", () => {
    const { grid } = mount();

    expect(grid.tagName).toBe("SECTION");
    expect(grid.getAttribute("data-grid-id")).toBe(gridId(definition));
  });

  it("makes the element the slot, a direct child of the grid, with its area winning", () => {
    const { grid, label } = mount();

    expect(label.parentElement).toBe(grid);
    expect(label.getAttribute("data-area")).toBe("input");
    expect(label.getAttribute("for")).toBe("notify");
    expect(label.getBoundingClientRect().width).toBe(40);
  });

  it("composes the slot's classes with the element's own", () => {
    const { grid, label } = mount();

    expect(grid.classList.contains("grid")).toBe(true);
    expect(grid.classList.contains("own-grid")).toBe(true);
    expect(label.classList.contains("slot")).toBe(true);
    expect(label.classList.contains("own-slot")).toBe(true);
  });

  it("attaches both the slot's ref and the element's own", () => {
    const { refs, grid, label } = mount();

    expect(refs.grid.current).toBe(grid);
    expect(refs.section.current).toBe(grid);
    expect(refs.slot.current).toBe(label);
    expect(refs.label.current).toBe(label);
  });

  it("keeps the slot's children as the element's children", () => {
    const { grid, label } = mount();

    expect(label.querySelector("input#notify")).not.toBeNull();
    expect(grid.querySelector("[data-area=content]")?.textContent).toBe("Notify me");
  });
});

describe("render={<el />} merging", () => {
  it("merges styles and chains handlers, the element's own first", () => {
    const calls: Array<string> = [];
    const { container } = render(
      <Row data-testid="grid">
        <Row.input
          style={{ padding: 4, color: "rgb(255, 0, 0)" }}
          onClick={() => calls.push("slot")}
          render={
            <button
              type="button"
              style={{ color: "rgb(0, 0, 255)" }}
              onClick={() => calls.push("element")}
            />
          }
        />
        <Row.content />
      </Row>,
    );

    const button = container.querySelector("button")!;
    button.click();

    expect(button.style.padding).toBe("4px");
    expect(button.style.color).toBe("rgb(0, 0, 255)");
    expect(calls).toEqual(["element", "slot"]);
  });

  it("lets the element's own props win over the slot's", () => {
    const { container } = render(
      <Row>
        <Row.input id="slot" title="slot" render={<label id="label" />} />
        <Row.content />
      </Row>,
    );

    const label = container.querySelector("label")!;
    expect(label.id).toBe("label");
    expect(label.title).toBe("slot");
  });
});
