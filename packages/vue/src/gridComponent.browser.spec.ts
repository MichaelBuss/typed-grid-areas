import { defineLayout, gridId, type GridConfig } from "typed-grid-areas";
import { gridStyleTags } from "typed-grid-areas/adapter";
import { render } from "vitest-browser-vue";
import { h } from "vue";
import { createGridComponent } from "./index.ts";
import AsChild from "./test-utils/AsChild.vue";
import PreferenceCard from "./test-utils/PreferenceCard.vue";

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
  // Vue's own development warnings included: none of these renders should cause one.
  beforeEach(() => {
    vi.spyOn(console, "warn");
  });

  afterEach(() => {
    expect(console.warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  describe("the nested PreferenceCard", () => {
    it("places the card's slots and the nested grid's slots", async () => {
      const { container } = await render(PreferenceCard, { props: { input: true } });

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

    it("gives the content the whole card when the input isn't rendered (v-if)", async () => {
      const { container } = await render(PreferenceCard, { props: { input: false } });

      const card = container.querySelector("[data-testid=card]")!;
      expect(card.querySelector("[data-area=input]")).toBeNull();
      expect(rectWithin(slotElement("content"), card)).toMatchObject({ x: 0, width: 300 });
    });

    it("renders the DOM contract: user attributes on the grid, slots as its direct children", async () => {
      const { container } = await render(PreferenceCard, { props: { input: true } });

      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(card.className).toBe("card");
      expect(card.getAttribute("data-grid-id")).toBeTruthy();
      expect(Array.from(card.children, child => child.getAttribute("data-area"))).toEqual([
        "input",
        "content",
      ]);
      // The nested grid is the content slot itself.
      const content = slotElement("content", card);
      expect(content.getAttribute("data-grid-id")).toBeTruthy();
      expect(content.getAttribute("data-grid-id")).not.toBe(card.getAttribute("data-grid-id"));
      expect(Array.from(content.children, child => child.getAttribute("data-area"))).toEqual([
        "icon",
        "cardTag",
        "information",
        "children",
      ]);
    });
  });

  describe("a definition with breakpoints", () => {
    const Content = createGridComponent(
      defineLayout({
        areas: ["icon", "title"],
        layouts: [{ template: "icon / title", breakpoints: { "@sm": { template: "icon title" } } }],
      }),
    );
    const Card = createGridComponent(
      defineLayout({
        areas: ["input", "content"],
        layouts: [
          { template: "input content", breakpoints: { "@md": { template: "content input" } } },
        ],
      }),
      { nest: { content: Content } },
    );

    it("renders the size container around the grid, with your attributes on the grid", async () => {
      const { container } = await render(() =>
        h(Card, { class: "card", "data-testid": "card" }, () => [
          h(Card.input),
          h(Card.content, () => [h(Card.content.icon), h(Card.content.title)]),
        ]),
      );

      const sizeContainer = container.firstElementChild as HTMLElement;
      const card = container.querySelector<HTMLElement>("[data-testid=card]")!;
      expect(card.parentElement).toBe(sizeContainer);
      expect(sizeContainer.children).toHaveLength(1);
      expect(getComputedStyle(sizeContainer).containerType).toBe("inline-size");
      expect(sizeContainer.hasAttribute("data-grid-id")).toBe(false);
      expect(card.className).toBe("card");
      expect(card.getAttribute("data-grid-id")).toBeTruthy();

      // The nested grid's size container fills the outer area.
      const content = card.querySelector<HTMLElement>(":scope > [data-area=content]")!;
      expect(content.hasAttribute("data-grid-id")).toBe(false);
      const contentGrid = content.firstElementChild!;
      expect(contentGrid.getAttribute("data-grid-id")).toBeTruthy();
      expect(contentGrid.hasAttribute("data-area")).toBe(false);
      expect(Array.from(contentGrid.children, child => child.getAttribute("data-area"))).toEqual([
        "icon",
        "title",
      ]);
    });
  });

  describe("the definition's CSS", () => {
    const styleTags = (definition: GridConfig<string>) =>
      document.head.querySelectorAll(`style[data-typed-grid-areas="${gridId(definition)}"]`);

    it("is in <head> once, however many instances render, and stays after they unmount", async () => {
      const definition = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "info icon", columns: "1fr 11px" }],
      });
      const Card = createGridComponent(definition);

      const { unmount } = await render(() =>
        Array.from({ length: 10 }, () => h(Card, () => [h(Card.icon), h(Card.info)])),
      );
      expect(styleTags(definition)).toHaveLength(1);

      await unmount();
      expect(styleTags(definition)).toHaveLength(1);
    });

    it("reuses a tag the server rendered", async () => {
      const definition = defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "info icon", columns: "1fr 12px" }],
      });
      document.head.insertAdjacentHTML("beforeend", gridStyleTags([definition]));
      const Card = createGridComponent(definition);

      await render(() => [1, 2].map(() => h(Card, () => [h(Card.icon), h(Card.info)])));

      expect(styleTags(definition)).toHaveLength(1);
    });
  });

  it("doesn't check the slots outside development", async () => {
    const Card = createGridComponent(
      defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
    );

    await render(() => h(Card, () => [h(Card.icon), h("span", "stray")]));

    expect(console.warn).not.toHaveBeenCalled();
  });

  describe("as-child", () => {
    async function renderAsChild() {
      const onSlotClick = vi.fn();
      const onChildClick = vi.fn();
      const onRefs = vi.fn();
      const { container } = await render(AsChild, {
        props: { onSlotClick, onChildClick, onRefs },
      });
      const grid = container.querySelector<HTMLElement>("section")!;
      const label = container.querySelector<HTMLElement>("label")!;
      return { container, grid, label, onSlotClick, onChildClick, onRefs };
    }

    it("renders your own element as the grid and as the slot, with no wrapper", async () => {
      const { container, grid, label } = await renderAsChild();

      expect(container.firstElementChild!.firstElementChild).toBe(grid);
      expect(label.parentElement).toBe(grid);
      expect(rectWithin(label, grid)).toMatchObject({ x: 0, width: 40 });
    });

    it("always carries data-area and data-grid-id, whatever else is passed", async () => {
      const { grid, label } = await renderAsChild();

      expect(grid.getAttribute("data-grid-id")).not.toBe("not-this");
      expect(grid.getAttribute("data-grid-id")).toBeTruthy();
      expect(grid.getAttribute("data-testid")).toBe("card");
      expect(label.getAttribute("data-area")).toBe("input");
    });

    it("lets the child's own attributes win, and combines classes and styles", async () => {
      const { grid, label } = await renderAsChild();

      expect(grid.title).toBe("the section's own");
      expect(grid.className).toBe("from-grid own-grid");
      expect(label.title).toBe("the label's own");
      expect(label.className).toBe("from-slot own");
      expect(label.style.color).toBe("rgb(255, 0, 0)");
      expect(label.style.padding).toBe("3px");
    });

    it("chains event handlers", async () => {
      const { label, onSlotClick, onChildClick } = await renderAsChild();

      label.click();

      expect(onSlotClick).toHaveBeenCalledTimes(1);
      expect(onChildClick).toHaveBeenCalledTimes(1);
    });

    it("keeps the child's refs on its element", async () => {
      const { grid, label, onRefs } = await renderAsChild();

      expect(onRefs).toHaveBeenCalledWith({ grid, label });
    });
  });
});
