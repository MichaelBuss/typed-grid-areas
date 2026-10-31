/** @jsxImportSource octane */
import { render } from "@octanejs/testing-library";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "./index";
import { OptionalIcon } from "./test-utils/OptionalIcon.tsrx";

/** An element's bounding rect, relative to another element's top-left corner. */
function rectWithin(element: Element, origin: Element) {
  const { x, y } = origin.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { x: rect.x - x, y: rect.y - y, width: rect.width, height: rect.height };
}

describe("grid components in a real browser", () => {
  describe("the DOM they render", () => {
    it("renders the grid with its id, and each slot as a direct child marked with its area", () => {
      const definition = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "icon info", columns: "48px 1fr" }],
      });
      const Card = createGridComponent(definition);

      const { container } = render(
        <div style={{ width: 300 }}>
          <Card data-testid="card">
            <Card.icon>{"★"}</Card.icon>
            <Card.info>{"Information"}</Card.info>
          </Card>
        </div>,
      );

      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(card.getAttribute("data-grid-id")).toBe(gridId(definition));
      expect(Array.from(card.children, child => child.getAttribute("data-area"))).toEqual([
        "icon",
        "info",
      ]);
      expect(rectWithin(card.querySelector("[data-area=info]")!, card)).toMatchObject({
        x: 48,
        width: 252,
      });
    });

    it("renders a definition with breakpoints inside its size container, with your props on the grid", () => {
      const definition = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "icon / info", breakpoints: { "@sm": { template: "icon info" } } }],
      });
      const Card = createGridComponent(definition);

      const { container } = render(
        <div>
          <Card data-testid="card" class="card">
            <Card.icon />
            <Card.info />
          </Card>
        </div>,
      );

      const sizeContainer = container.firstElementChild!.firstElementChild as HTMLElement;
      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(card.parentElement).toBe(sizeContainer);
      expect(sizeContainer.children).toHaveLength(1);
      expect(getComputedStyle(sizeContainer).containerType).toBe("inline-size");
      expect(sizeContainer.hasAttribute("data-grid-id")).toBe(false);
      expect(card.getAttribute("data-grid-id")).toBe(gridId(definition));
      expect(card.className).toBe("card");
    });

    it.each([
      ["without breakpoints, the grid", { template: "icon info" }, "grid"],
      [
        "with breakpoints, the size container",
        { template: "icon info", breakpoints: { "@sm": { template: "info icon" } } },
        "size container",
      ],
    ])(
      "puts the outer grid's area on a nested grid's outermost element (%s)",
      (_, layout, outermost) => {
        const contentGrid = defineLayout({ areas: ["icon", "info"], layouts: [layout] });
        const Content = createGridComponent(contentGrid);
        const Card = createGridComponent(
          defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
          { nest: { content: Content } },
        );

        const { container } = render(
          <Card data-testid="card">
            <Card.input />
            <Card.content data-testid="content">
              <Card.content.icon />
              <Card.content.info />
            </Card.content>
          </Card>,
        );

        const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
        const content = card.querySelector<HTMLElement>(":scope > [data-area=content]")!;
        const nestedGrid = container.querySelector<HTMLElement>("[data-testid=content]")!;
        expect(nestedGrid.getAttribute("data-grid-id")).toBe(gridId(contentGrid));
        expect(content).toBe(outermost === "grid" ? nestedGrid : nestedGrid.parentElement);
        expect(Array.from(nestedGrid.children, child => child.getAttribute("data-area"))).toEqual([
          "icon",
          "info",
        ]);
      },
    );
  });

  describe("an optional area", () => {
    const definition = defineLayout({
      areas: ["icon?", "info"],
      layouts: [{ template: "icon info", columns: "48px 1fr" }],
    });
    const Card = createGridComponent(definition);

    function FromTsx({ icon }: { icon: boolean }) {
      return (
        <Card data-testid="card">
          {icon && <Card.icon>{"★"}</Card.icon>}
          <Card.info>{"Information"}</Card.info>
        </Card>
      );
    }

    it.each([
      ["a .tsx conditional", FromTsx],
      ["a .tsrx @if", OptionalIcon],
    ])("is absent when %s leaves its slot out, and the derived layout applies", (_, Caller) => {
      const { container, rerender } = render(
        <div style={{ width: 300 }}>
          <Caller icon={true} />
        </div>,
      );
      const card = () => container.querySelector<HTMLElement>("[data-testid=card]")!;
      const info = () => card().querySelector("[data-area=info]")!;
      expect(rectWithin(info(), card())).toMatchObject({ x: 48, width: 252 });

      rerender(
        <div style={{ width: 300 }}>
          <Caller icon={false} />
        </div>,
      );

      expect(card().querySelector("[data-area=icon]")).toBeNull();
      expect(getComputedStyle(card()).gridTemplateAreas).toBe('"info"');
      expect(rectWithin(info(), card())).toMatchObject({ x: 0, width: 300 });
    });
  });

  it("logs nothing about its slots outside development", () => {
    const Card = createGridComponent(
      defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <Card>
          <span>stray</span>
        </Card>,
      );

      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  describe("CSS", () => {
    it("puts one style tag per definition in <head>, however many instances render, and none in a grid", () => {
      const definition = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "info icon", columns: "1fr 13px" }],
      });
      const other = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "icon info", columns: "1fr 17px" }],
      });
      const Card = createGridComponent(definition);
      const Other = createGridComponent(other);

      const { container } = render(
        <div>
          {Array.from({ length: 10 }, (_, index) => (
            <Card key={index}>
              <Card.icon />
              <Card.info />
            </Card>
          ))}
          <Other>
            <Other.icon />
            <Other.info />
          </Other>
        </div>,
      );

      const tagsFor = (id: string) =>
        Array.from(document.querySelectorAll("style")).filter(style =>
          style.textContent?.includes(id),
        );
      expect(tagsFor(gridId(definition))).toHaveLength(1);
      expect(tagsFor(gridId(definition))[0]!.parentElement).toBe(document.head);
      expect(tagsFor(gridId(other))).toHaveLength(1);
      expect(tagsFor(gridId(other))[0]!.parentElement).toBe(document.head);
      expect(container.querySelector("style")).toBeNull();
    });
  });
});
