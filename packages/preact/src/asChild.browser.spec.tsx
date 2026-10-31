/**
 * `asChild` (ADR 0006): your own single child element as the slot or the
 * grid, with the slot's props merged onto it.
 */
import { createRef, type Ref } from "preact";
import { render } from "vitest-browser-preact";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

const definition = defineLayout({
  areas: ["input", "content"],
  layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
});
const Row = createGridComponent(definition);

describe("asChild", () => {
  it("renders your own element as the slot, with no wrapper", () => {
    const { container } = render(
      <div style={{ width: "300px" }}>
        <Row data-testid="row">
          <Row.input asChild>
            <label for="toggle">
              <input id="toggle" type="checkbox" />
            </label>
          </Row.input>
          <Row.content />
        </Row>
      </div>,
    );

    const row = container.querySelector<HTMLElement>("[data-testid=row]")!;
    const label = row.querySelector("label")!;
    expect(label.parentElement).toBe(row);
    expect(label.getAttribute("data-area")).toBe("input");
    expect(label.htmlFor).toBe("toggle");
    expect(label.getBoundingClientRect().width).toBe(40);
  });

  it("joins the slot's and the child's classes, whether class or className", () => {
    const { container } = render(
      <Row>
        <Row.input asChild class="slot-class" className="slot-className">
          <label className="child-className" />
        </Row.input>
        <Row.content asChild className="slot">
          <section class="child" />
        </Row.content>
      </Row>,
    );

    const label = container.querySelector("label")!;
    expect(label.className.split(" ").sort()).toEqual([
      "child-className",
      "slot-class",
      "slot-className",
    ]);
    expect(container.querySelector("section")!.className.split(" ").sort()).toEqual([
      "child",
      "slot",
    ]);
  });

  it("merges style objects, the child's winning", () => {
    const { container } = render(
      <Row>
        <Row.input asChild style={{ color: "red", padding: "4px" }}>
          <label style={{ color: "blue", margin: "2px" }} />
        </Row.input>
        <Row.content />
      </Row>,
    );

    const { style } = container.querySelector("label")!;
    expect([style.color, style.padding, style.margin]).toEqual(["blue", "4px", "2px"]);
  });

  it("concatenates a string style after the object one, the child's last", () => {
    const { container } = render(
      <Row>
        <Row.input asChild style={{ color: "red", paddingLeft: "4px", "--tone": "dark" }}>
          <label style="color: blue; margin: 2px" />
        </Row.input>
        <Row.content asChild style="color: red; padding: 4px">
          <section style={{ color: "blue", marginTop: "2px" }} />
        </Row.content>
      </Row>,
    );

    const label = container.querySelector("label")!.style;
    expect([
      label.color,
      label.paddingLeft,
      label.margin,
      label.getPropertyValue("--tone"),
    ]).toEqual(["blue", "4px", "2px", "dark"]);
    const section = container.querySelector("section")!.style;
    expect([section.color, section.padding, section.marginTop]).toEqual(["blue", "4px", "2px"]);
  });

  it("runs both the child's and the slot's handler, the child's first", () => {
    const calls: Array<string> = [];
    const { container } = render(
      <Row>
        <Row.input asChild onClick={() => calls.push("slot")}>
          <button type="button" onClick={() => calls.push("child")} />
        </Row.input>
        <Row.content asChild onClick={() => calls.push("slot only")}>
          <button type="button" />
        </Row.content>
      </Row>,
    );

    const [input, content] = Array.from(container.querySelectorAll("button"));
    input!.click();
    content!.click();
    expect(calls).toEqual(["child", "slot", "slot only"]);
  });

  it("sets both the slot's and the child's ref, on an element or a component child", () => {
    const slotRef = createRef<HTMLDivElement>();
    const childRef = createRef<HTMLLabelElement>();
    const slotRefOnComponent = createRef<HTMLDivElement>();
    const componentRef = createRef<HTMLElement>();
    function Section({ ref, ...props }: { ref?: Ref<HTMLElement> }) {
      return <section {...props} ref={ref} />;
    }

    const { container } = render(
      <Row>
        <Row.input asChild ref={slotRef}>
          <label ref={childRef} />
        </Row.input>
        <Row.content asChild ref={slotRefOnComponent}>
          <Section ref={componentRef} />
        </Row.content>
      </Row>,
    );

    const label = container.querySelector("label");
    expect(slotRef.current).toBe(label);
    expect(childRef.current).toBe(label);
    const section = container.querySelector("section");
    expect(section?.getAttribute("data-area")).toBe("content");
    expect(slotRefOnComponent.current).toBe(section);
    expect(componentRef.current).toBe(section);
  });

  it("keeps the adapter's attributes, and otherwise lets the child's props win", () => {
    const { container } = render(
      <Row>
        <Row.input asChild id="slot" title="slot title">
          <label id="child" data-area="other" />
        </Row.input>
        <Row.content />
      </Row>,
    );

    const label = container.querySelector("label")!;
    expect(label.getAttribute("data-area")).toBe("input");
    expect(label.id).toBe("child");
    expect(label.title).toBe("slot title");
  });

  it("renders your own element as the grid", () => {
    const gridRef = createRef<HTMLDivElement>();
    const { container } = render(
      <div style={{ width: "300px" }}>
        <Row asChild class="row" ref={gridRef}>
          <form class="form" data-grid-id="mine">
            <Row.input />
            <Row.content />
          </form>
        </Row>
      </div>,
    );

    const form = container.querySelector("form")!;
    expect(form.parentElement).toBe(container.firstElementChild);
    expect(form.getAttribute("data-grid-id")).toBe(gridId(definition));
    expect(form.className.split(" ").sort()).toEqual(["form", "row"]);
    expect(gridRef.current).toBe(form);
    expect(form.querySelector("[data-area=content]")!.getBoundingClientRect().x).toBe(
      form.getBoundingClientRect().x + 40,
    );
  });

  it.each([
    ["no child", null],
    ["text", "text"],
    ["two children", [<label key="a" />, <label key="b" />]],
  ])("throws given %s", (_, children) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <Row>
          <Row.input asChild>{children}</Row.input>
          <Row.content />
        </Row>,
      ),
    ).toThrow(/^typed-grid-areas: /);
    vi.restoreAllMocks();
  });
});
