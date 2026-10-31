import { render } from "vitest-browser-preact";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

describe("grid components in a real browser", () => {
  it("renders the grid with each slot as a direct child marked with its area", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "icon info", columns: "48px minmax(0, 1fr)" }],
    });
    const Card = createGridComponent(definition);

    const { container } = render(
      <div style={{ width: "300px" }}>
        <Card class="card" data-testid="card">
          <Card.icon className="icon">★</Card.icon>
          <Card.info>Information</Card.info>
        </Card>
      </div>,
    );

    const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
    expect(card.getAttribute("data-grid-id")).toBe(gridId(definition));
    expect(card.className).toBe("card");
    expect(Array.from(card.children, child => child.getAttribute("data-area"))).toEqual([
      "icon",
      "info",
    ]);
    expect(card.children[0]!.className).toBe("icon");
    expect(getComputedStyle(card).display).toBe("grid");
    expect(card.children[1]!.getBoundingClientRect().x - card.getBoundingClientRect().x).toBe(48);
  });
});

it("logs nothing about missing or stray slots outside development", async () => {
  const Card = createGridComponent(
    defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
  );
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  render(
    <Card>
      <span>stray</span>
    </Card>,
  );
  await new Promise(resolve => setTimeout(resolve, 20));

  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

/** An element's bounding rect, relative to another element's top-left corner. */
function rectWithin(element: Element, origin: Element) {
  const { x, y } = origin.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return { x: rect.x - x, y: rect.y - y, width: rect.width, height: rect.height };
}

function slotElement(area: string, within: ParentNode = document): HTMLElement {
  const element = within.querySelector<HTMLElement>(`[data-area=${area}]`);
  if (element === null) {
    throw new Error(`slot "${area}" was not rendered`);
  }
  return element;
}

describe("a nested grid", () => {
  const ContentGrid = createGridComponent(
    defineLayout({
      areas: ["icon?", "information", "cardTag?", "children?"],
      layouts: [
        {
          template: "icon cardTag / information information / children children",
          rows: "20px 30px 40px",
          columns: "48px minmax(0, 1fr)",
        },
      ],
    }),
  );

  const PreferenceCard = createGridComponent(
    defineLayout({
      areas: ["input?", "content"],
      layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
    }),
    { nest: { content: ContentGrid } },
  );

  it("is the outer grid's slot, carrying its area, and places its own slots", () => {
    const { container } = render(
      <div style={{ width: "300px" }}>
        <PreferenceCard data-testid="card">
          <PreferenceCard.input />
          <PreferenceCard.content class="content">
            <PreferenceCard.content.icon />
            <PreferenceCard.content.cardTag />
            <PreferenceCard.content.information />
            <PreferenceCard.content.children />
          </PreferenceCard.content>
        </PreferenceCard>
      </div>,
    );

    const card = container.querySelector("[data-testid=card]")!;
    const content = slotElement("content");
    expect(content.parentElement).toBe(card);
    expect(content.hasAttribute("data-grid-id")).toBe(true);
    expect(content.className).toBe("content");
    expect(rectWithin(slotElement("input"), card)).toMatchObject({ x: 0, width: 40 });
    expect(rectWithin(content, card)).toMatchObject({ x: 40, width: 260 });
    expect(rectWithin(slotElement("icon"), card)).toEqual({ x: 40, y: 0, width: 48, height: 20 });
    expect(rectWithin(slotElement("cardTag"), card)).toEqual({
      x: 88,
      y: 0,
      width: 212,
      height: 20,
    });
    expect(rectWithin(slotElement("information"), card)).toEqual({
      x: 40,
      y: 20,
      width: 260,
      height: 30,
    });
    expect(rectWithin(slotElement("children"), card)).toEqual({
      x: 40,
      y: 50,
      width: 260,
      height: 40,
    });
  });

  it("gives the content the whole card when the optional input isn't rendered", () => {
    const { container } = render(
      <div style={{ width: "300px" }}>
        <PreferenceCard data-testid="card">
          <PreferenceCard.content>
            <PreferenceCard.content.information />
          </PreferenceCard.content>
        </PreferenceCard>
      </div>,
    );

    const card = container.querySelector("[data-testid=card]")!;
    expect(rectWithin(slotElement("content"), card)).toMatchObject({ x: 0, width: 300 });
    expect(rectWithin(slotElement("information"), card)).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 30,
    });
  });
});

describe("a grid with breakpoints", () => {
  const Inner = createGridComponent(
    defineLayout({
      areas: ["icon", "info"],
      layouts: [
        {
          template: "icon / info",
          breakpoints: { "@[200px]": { template: "icon info", columns: "48px 1fr" } },
        },
      ],
    }),
  );

  it("renders inside its own size container, with your props on the grid", () => {
    const { container } = render(
      <div style={{ width: "300px" }}>
        <Inner class="inner" data-testid="grid">
          <Inner.icon />
          <Inner.info />
        </Inner>
      </div>,
    );

    const grid = container.querySelector<HTMLElement>("[data-testid=grid]")!;
    expect(grid.className).toBe("inner");
    expect(grid.hasAttribute("data-grid-id")).toBe(true);
    const sizeContainer = grid.parentElement!;
    expect(sizeContainer.parentElement).toBe(container.firstElementChild);
    expect(sizeContainer.children).toHaveLength(1);
    expect(getComputedStyle(sizeContainer).containerType).toBe("inline-size");
    expect(rectWithin(slotElement("info", grid), grid)).toMatchObject({ x: 48, y: 0 });
  });

  it("carries the outer grid's area on its size container when nested", () => {
    const Outer = createGridComponent(
      defineLayout({ areas: ["side", "main"], layouts: [{ template: "side main" }] }),
      { nest: { main: Inner } },
    );

    const { container } = render(
      <Outer data-testid="outer">
        <Outer.side />
        <Outer.main data-testid="inner">
          <Outer.main.icon />
          <Outer.main.info />
        </Outer.main>
      </Outer>,
    );

    const outer = container.querySelector<HTMLElement>("[data-testid=outer]")!;
    const main = slotElement("main", outer);
    expect(main.parentElement).toBe(outer);
    expect(main.hasAttribute("data-grid-id")).toBe(false);
    const inner = container.querySelector<HTMLElement>("[data-testid=inner]")!;
    expect(inner.parentElement).toBe(main);
    expect(inner.hasAttribute("data-area")).toBe(false);
  });
});
