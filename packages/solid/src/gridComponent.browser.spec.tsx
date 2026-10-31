import { createSignal, JSX, Show, splitProps } from "solid-js";
import { render } from "solid-js/web";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent.tsx";

/** Mounts `code` into a fresh container in the document; unmounted after each test. */
const disposers: Array<() => void> = [];
function mount(code: () => JSX.Element): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(code, container);
  disposers.push(() => {
    dispose();
    container.remove();
  });
  return container;
}

afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
});

/** An element's bounding rect, relative to another element's top-left corner. */
function rectWithin(element: Element, origin: Element) {
  const { x, y } = origin.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { x: rect.x - x, y: rect.y - y, width: rect.width, height: rect.height };
}

describe("grid components in a real browser", () => {
  it("renders the grid with its id and each slot as a direct child marked with its area", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "icon info", columns: "48px 1fr" }],
    });
    const Card = createGridComponent(definition);

    const container = mount(() => (
      <div style={{ width: "300px" }}>
        <Card data-testid="card" class="card" aria-label="Card">
          <Card.icon class="icon">★</Card.icon>
          <Card.info>Information</Card.info>
        </Card>
      </div>
    ));

    const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
    expect(card.parentElement).toBe(container.firstElementChild);
    expect(card.getAttribute("data-grid-id")).toBe(gridId(definition));
    expect(card.className).toBe("card");
    expect(card.getAttribute("aria-label")).toBe("Card");
    expect(Array.from(card.children, child => child.getAttribute("data-area"))).toEqual([
      "icon",
      "info",
    ]);
    const icon = card.children[0]!;
    expect(icon.tagName).toBe("DIV");
    expect(icon.className).toBe("icon");
    expect(icon.textContent).toBe("★");
    expect(rectWithin(card.children[1]!, card)).toMatchObject({ x: 48, width: 252 });
  });

  describe("as", () => {
    const definition = defineLayout({
      areas: ["input", "content"],
      layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
    });
    const Row = createGridComponent(definition);

    /** A component that spreads its props onto its root element, as `as` requires. */
    function Field(props: JSX.LabelHTMLAttributes<HTMLLabelElement> & { size: number }) {
      const [local, others] = splitProps(props, ["size"]);
      return <label {...others} data-size={local.size} />;
    }

    const cases: Array<[string, (slot: "grid" | "input") => JSX.Element]> = [
      [
        "a tag name",
        slot =>
          slot === "grid" ? (
            <Row as="section" data-testid="row" class="row">
              <Row.input />
              <Row.content />
            </Row>
          ) : (
            <Row data-testid="row">
              <Row.input as="label" for="toggle" class="input">
                <input id="toggle" type="checkbox" />
              </Row.input>
              <Row.content />
            </Row>
          ),
      ],
      [
        "a component",
        slot =>
          slot === "grid" ? (
            <Row as={Field} size={16} data-testid="row" class="row">
              <Row.input />
              <Row.content />
            </Row>
          ) : (
            <Row data-testid="row">
              <Row.input as={Field} size={16} for="toggle" class="input">
                <input id="toggle" type="checkbox" />
              </Row.input>
              <Row.content />
            </Row>
          ),
      ],
      [
        "a render function",
        slot =>
          slot === "grid" ? (
            <Row as={props => <article {...props} />} data-testid="row" class="row">
              <Row.input />
              <Row.content />
            </Row>
          ) : (
            <Row data-testid="row">
              <Row.input
                as={(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props} />}
                for="toggle"
                class="input"
              >
                <input id="toggle" type="checkbox" />
              </Row.input>
              <Row.content />
            </Row>
          ),
      ],
    ];

    it.each(cases)("renders %s as the slot, with no wrapper", (_, design) => {
      const container = mount(() => <div style={{ width: "300px" }}>{design("input")}</div>);

      const row = container.querySelector("[data-testid=row]")!;
      const label = row.querySelector("label")!;
      expect(label.parentElement).toBe(row);
      expect(label.getAttribute("data-area")).toBe("input");
      expect(label.className).toBe("input");
      expect(label.htmlFor).toBe("toggle");
      expect(label.querySelector("input")).not.toBeNull();
      expect(rectWithin(label, row)).toMatchObject({ x: 0, width: 40 });
    });

    it.each(cases)("renders %s as the grid, with no wrapper", (_, design) => {
      const container = mount(() => <div style={{ width: "300px" }}>{design("grid")}</div>);

      const row = container.querySelector<HTMLElement>("[data-testid=row]")!;
      expect(row.parentElement).toBe(container.firstElementChild);
      expect(row.tagName).not.toBe("DIV");
      expect(row.getAttribute("data-grid-id")).toBe(gridId(definition));
      expect(row.className).toBe("row");
      expect(getComputedStyle(row).display).toBe("grid");
      expect(rectWithin(row.querySelector("[data-area=content]")!, row)).toMatchObject({
        x: 40,
        width: 260,
      });
    });

    it("hands the rendered element to ref", () => {
      let label: HTMLLabelElement | undefined;
      let grid: HTMLElement | undefined;
      mount(() => (
        <Row as="section" ref={grid}>
          <Row.input as="label" ref={label} />
          <Row.content />
        </Row>
      ));

      expect(label).toBeInstanceOf(HTMLLabelElement);
      expect(label!.getAttribute("data-area")).toBe("input");
      expect(grid!.tagName).toBe("SECTION");
    });
  });

  describe("reactivity", () => {
    const Content = createGridComponent(
      defineLayout({
        areas: ["icon?", "title"],
        layouts: [{ template: "icon title", columns: "24px minmax(0, 1fr)" }],
      }),
    );
    const Card = createGridComponent(
      defineLayout({
        areas: ["input?", "content"],
        layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
      }),
      { nest: { content: Content } },
    );

    it("adds and removes a slot toggled with <Show>, in a grid and through a nested grid's root", () => {
      const [hasInput, setHasInput] = createSignal(false);
      const [hasIcon, setHasIcon] = createSignal(false);
      const container = mount(() => (
        <div style={{ width: "300px" }}>
          <Card data-testid="card">
            <Show when={hasInput()}>
              <Card.input />
            </Show>
            <Card.content>
              <Show when={hasIcon()}>
                <Card.content.icon />
              </Show>
              <Card.content.title />
            </Card.content>
          </Card>
        </div>
      ));
      const card = container.querySelector("[data-testid=card]")!;
      const content = card.querySelector<HTMLElement>(":scope > [data-area=content]")!;
      const title = content.querySelector(":scope > [data-area=title]")!;
      const areas = (grid: Element) =>
        Array.from(grid.children, child => child.getAttribute("data-area"));

      expect(areas(card)).toEqual(["content"]);
      expect(areas(content)).toEqual(["title"]);
      expect(rectWithin(content, card)).toMatchObject({ x: 0, width: 300 });
      expect(rectWithin(title, card)).toMatchObject({ x: 0, width: 300 });

      setHasInput(true);
      setHasIcon(true);
      expect(areas(card)).toEqual(["input", "content"]);
      expect(areas(content)).toEqual(["icon", "title"]);
      expect(rectWithin(content, card)).toMatchObject({ x: 40, width: 260 });
      expect(rectWithin(title, card)).toMatchObject({ x: 64, width: 236 });

      setHasInput(false);
      setHasIcon(false);
      expect(areas(card)).toEqual(["content"]);
      expect(areas(content)).toEqual(["title"]);
      expect(rectWithin(title, card)).toMatchObject({ x: 0, width: 300 });
    });

    it("keeps a slot's and a nested grid's attributes reactive", () => {
      const [tone, setTone] = createSignal("calm");
      const container = mount(() => (
        <Card data-testid="card" data-tone={tone()}>
          <Card.content class={tone()}>
            <Card.content.title title={tone()} />
          </Card.content>
        </Card>
      ));
      const card = container.querySelector("[data-testid=card]")!;
      const content = card.querySelector("[data-area=content]")!;
      const title = card.querySelector("[data-area=title]")!;

      setTone("loud");
      expect(card.getAttribute("data-tone")).toBe("loud");
      expect(content.className).toBe("loud");
      expect(title.getAttribute("title")).toBe("loud");
    });
  });

  describe("the rendered DOM", () => {
    const Content = createGridComponent(
      defineLayout({
        areas: ["icon?", "title"],
        layouts: [{ template: "icon title", breakpoints: { "@sm": { template: "title icon" } } }],
      }),
    );
    const Card = createGridComponent(
      defineLayout({
        areas: ["input?", "content"],
        layouts: [
          {
            template: "input content",
            columns: "auto minmax(0, 1fr)",
            breakpoints: { "@md": { template: "content input" } },
          },
        ],
      }),
      { nest: { content: Content } },
    );

    it("wraps a grid with breakpoints in its size container, with your attributes on the grid", () => {
      const container = mount(() => (
        <Card data-testid="card" class="card">
          <Card.content class="content">
            <Card.content.title />
          </Card.content>
        </Card>
      ));

      const sizeContainer = container.firstElementChild as HTMLElement;
      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(card.parentElement).toBe(sizeContainer);
      expect(sizeContainer.children).toHaveLength(1);
      expect(sizeContainer.hasAttribute("data-grid-id")).toBe(false);
      expect(getComputedStyle(sizeContainer).containerType).toBe("inline-size");
      expect(card.className).toBe("card");
      expect(card.hasAttribute("data-grid-id")).toBe(true);

      // A nested grid's outermost element, its size container, fills the outer area.
      const nested = card.firstElementChild as HTMLElement;
      expect(card.children).toHaveLength(1);
      expect(nested.getAttribute("data-area")).toBe("content");
      expect(nested.hasAttribute("data-grid-id")).toBe(false);
      const contentGrid = nested.firstElementChild as HTMLElement;
      expect(contentGrid.hasAttribute("data-grid-id")).toBe(true);
      expect(contentGrid.hasAttribute("data-area")).toBe(false);
      expect(contentGrid.className).toBe("content");
      expect(contentGrid.firstElementChild!.getAttribute("data-area")).toBe("title");
    });

    it("puts a nested grid's outer area on the grid itself when it has no size container", () => {
      const Inner = createGridComponent(
        defineLayout({ areas: ["title"], layouts: [{ template: "title" }] }),
      );
      const Outer = createGridComponent(
        defineLayout({ areas: ["content"], layouts: [{ template: "content" }] }),
        { nest: { content: Inner } },
      );
      const container = mount(() => (
        <Outer>
          <Outer.content>
            <Outer.content.title />
          </Outer.content>
        </Outer>
      ));

      const outer = container.firstElementChild!;
      const inner = outer.firstElementChild!;
      expect(outer.hasAttribute("data-grid-id")).toBe(true);
      expect(inner.getAttribute("data-area")).toBe("content");
      expect(inner.hasAttribute("data-grid-id")).toBe(true);
      expect(inner.firstElementChild!.getAttribute("data-area")).toBe("title");
    });
  });

  it("puts a definition's CSS in document.head once, however many instances render", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "info icon", columns: "1fr 17px" }],
    });
    const Card = createGridComponent(definition);

    mount(() => (
      <>
        {Array.from({ length: 10 }, () => (
          <Card>
            <Card.icon />
            <Card.info />
          </Card>
        ))}
      </>
    ));
    mount(() => (
      <Card>
        <Card.icon />
        <Card.info />
      </Card>
    ));

    const styles = Array.from(document.querySelectorAll("style")).filter(style =>
      style.textContent?.includes(gridId(definition)),
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]!.parentElement).toBe(document.head);
  });

  it("logs nothing about missing slots or stray children outside development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = createGridComponent(
      defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
    );

    mount(() => (
      <Card>
        <Card.icon />
        <span>stray</span>
      </Card>
    ));

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
