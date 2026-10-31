import { render } from "vitest-browser-react";
import { defineLayout } from "../defineLayout.ts";
import { gridId } from "../engine/gridId.ts";
import { createGridComponent } from "./gridComponent.tsx";

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

describe("grid components in a real browser", () => {
  describe("the nested PreferenceCard", () => {
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

    it("places the card's slots and the nested grid's slots", async () => {
      const { container } = await render(
        <div style={{ width: 300 }}>
          <PreferenceCard data-testid="card">
            <PreferenceCard.input />
            <PreferenceCard.content>
              <PreferenceCard.content.icon />
              <PreferenceCard.content.cardTag />
              <PreferenceCard.content.information />
              <PreferenceCard.content.children />
            </PreferenceCard.content>
          </PreferenceCard>
        </div>,
      );

      const card = container.querySelector("[data-testid=card]")!;
      expect(rectWithin(slotElement("input"), card)).toMatchObject({ x: 0, width: 40 });
      expect(rectWithin(slotElement("content"), card)).toMatchObject({ x: 40, width: 260 });
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

    it("gives the content the whole card when the input is absent", async () => {
      const { container } = await render(
        <div style={{ width: 300 }}>
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

  it("renders asChild as your own element, with no wrapper", async () => {
    const Card = createGridComponent(
      defineLayout({
        areas: ["input", "content"],
        layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
      }),
    );

    const { container } = await render(
      <div style={{ width: 300 }}>
        <Card data-testid="card">
          <Card.input asChild className="input">
            <label htmlFor="toggle">
              <input id="toggle" type="checkbox" />
            </label>
          </Card.input>
          <Card.content />
        </Card>
      </div>,
    );

    const card = container.querySelector("[data-testid=card]")!;
    const label = card.querySelector("label")!;
    expect(label.parentElement).toBe(card);
    expect(label.getAttribute("data-area")).toBe("input");
    expect(label.className).toBe("input");
    expect(rectWithin(label, card)).toMatchObject({ x: 0, width: 40 });
  });

  describe("a consumer class on the grid", () => {
    const consumerStyle = document.createElement("style");
    consumerStyle.textContent = ".flex-card { display: flex; }";

    beforeAll(() => {
      document.head.append(consumerStyle);
    });

    afterAll(() => {
      consumerStyle.remove();
    });

    it.each([
      ["without breakpoints", { template: "input content" }],
      [
        "with breakpoints",
        { template: "input content", breakpoints: { "@sm": { template: "content input" } } },
      ],
    ])("can change the grid's display (%s)", async (_, layout) => {
      const Card = createGridComponent(
        defineLayout({ areas: ["input", "content"], layouts: [layout] }),
      );

      const { container } = await render(
        <Card data-testid="card" className="flex-card">
          <Card.input />
          <Card.content />
        </Card>,
      );

      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(getComputedStyle(card).display).toBe("flex");
    });

    it("leaves the grid a grid when it sets no display", async () => {
      const Card = createGridComponent(
        defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      );

      const { container } = await render(
        <Card data-testid="card">
          <Card.input />
          <Card.content />
        </Card>,
      );

      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(getComputedStyle(card).display).toBe("grid");
    });
  });

  it("emits a definition's CSS once, however many instances render", async () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "info icon", columns: "1fr 13px" }],
    });
    const Card = createGridComponent(definition);

    await render(
      <>
        {Array.from({ length: 10 }, (_, index) => (
          <Card key={index}>
            <Card.icon />
            <Card.info />
          </Card>
        ))}
      </>,
    );

    const styles = Array.from(document.querySelectorAll("style")).filter(style =>
      style.textContent?.includes(gridId(definition)),
    );
    expect(styles).toHaveLength(1);
  });
});
