import { tick } from "svelte";
import { gridId } from "typed-grid-areas";
import { render } from "vitest-browser-svelte";
import Markup from "./fixtures/Markup.svelte";
import { cardGrid, contentGrid, responsiveGrid } from "./fixtures/grids.ts";
import OwnElements from "./fixtures/OwnElements.svelte";
import Instances from "./fixtures/Instances.svelte";
import MissingSlot from "./fixtures/MissingSlot.svelte";
import Optional from "./fixtures/Optional.svelte";
import Reactive from "./fixtures/Reactive.svelte";

/** The element matching `selector` inside `container`, which must exist. */
function find(container: ParentNode, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`nothing matches ${selector}`);
  }
  return element;
}

/** The `data-area` of each direct child element. */
const areasOf = (element: Element) =>
  Array.from(element.children, child => child.getAttribute("data-area"));

describe("the rendered DOM", () => {
  it("is the grid, carrying its id and your attributes, with each slot a direct child", async () => {
    const { container } = await render(Markup);

    const card = find(container, "[data-testid=card]");
    expect(card.getAttribute("data-grid-id")).toBe(gridId(cardGrid));
    expect(card.className).toBe("card");
    expect(card.getAttribute("aria-label")).toBe("Card");
    expect(areasOf(card)).toEqual(["icon", "info"]);
    expect(find(card, ":scope > [data-area=icon]").className).toBe("icon");
    expect(find(card, ":scope > [data-area=icon]").textContent).toBe("★");
  });

  it("wraps a grid with breakpoints in its size container, with your attributes on the grid", async () => {
    const { container } = await render(Markup);

    const grid = find(container, "[data-testid=responsive]");
    expect(grid.getAttribute("data-grid-id")).toBe(gridId(responsiveGrid));
    expect(grid.className).toBe("responsive");
    const sizeContainer = grid.parentElement!;
    expect(sizeContainer.getAttribute("data-grid-id")).toBeNull();
    expect(getComputedStyle(sizeContainer).containerType).toBe("inline-size");
    expect(areasOf(grid)).toEqual(["icon", "info"]);
  });

  it("puts a nested grid's outer area on its outermost element", async () => {
    const { container } = await render(Markup);

    const nested = find(container, "[data-testid=nested]");
    expect(areasOf(nested)).toEqual(["content", "aside"]);

    const content = find(nested, ":scope > [data-area=content]");
    expect(content.getAttribute("data-grid-id")).toBe(gridId(contentGrid));
    expect(content.className).toBe("content");
    expect(areasOf(content)).toEqual(["title"]);

    // With breakpoints: the outer area on the size container, the grid inside it.
    const aside = find(nested, ":scope > [data-area=aside]");
    expect(aside.getAttribute("data-grid-id")).toBeNull();
    const asideGrid = find(aside, ":scope > [data-grid-id]");
    expect(asideGrid.getAttribute("data-grid-id")).toBe(gridId(responsiveGrid));
    expect(asideGrid.className).toBe("aside");
    expect(areasOf(asideGrid)).toEqual(["icon", "info"]);
  });
});

describe("a child snippet", () => {
  it("renders your own element as a slot, with the slot's attributes", async () => {
    const { container } = await render(OwnElements);

    const card = find(container, "[data-testid=card]");
    const label = find(card, ":scope > label");
    expect(label.getAttribute("data-area")).toBe("icon");
    expect(label.className).toBe("icon");
    expect(label.querySelector("input[type=checkbox]")).not.toBeNull();
    expect(areasOf(card)).toEqual(["icon", "info"]);
  });

  it("renders your own element as the grid, with the grid's attributes", async () => {
    const { container } = await render(OwnElements);

    const card = find(container, "[data-testid=card]");
    expect(card.localName).toBe("section");
    expect(card.getAttribute("data-grid-id")).toBe(gridId(cardGrid));
    expect(card.className).toBe("card");
    expect(getComputedStyle(card).display).toBe("grid");
  });

  it("renders your own element as a nested grid, carrying the outer area", async () => {
    const { container } = await render(OwnElements);

    const content = find(find(container, "[data-testid=nested]"), ":scope > article");
    expect(content.getAttribute("data-area")).toBe("content");
    expect(content.getAttribute("data-grid-id")).toBe(gridId(contentGrid));
    expect(areasOf(content)).toEqual(["title"]);
  });
});

describe("the definition's CSS", () => {
  /** The `<head>` style tags carrying a definition's CSS. */
  const styleTags = (id: string) =>
    Array.from(document.head.querySelectorAll("style")).filter(style =>
      style.textContent?.includes(id),
    );

  it("is in <head> once, however many instances render", async () => {
    await render(Instances, { keys: [1, 2, 3, 4, 5] });

    expect(styleTags(gridId(cardGrid))).toHaveLength(1);
    expect(styleTags(gridId(cardGrid))[0]!.getAttribute("data-typed-grid-areas")).toBe(
      gridId(cardGrid),
    );
  });

  it("stays in <head> once while any instance remains, and goes with the last", async () => {
    const { rerender, unmount } = await render(Instances, { keys: [1, 2, 3] });

    await rerender({ keys: [2, 3] });
    expect(styleTags(gridId(cardGrid))).toHaveLength(1);
    await rerender({ keys: [3, 4] });
    expect(styleTags(gridId(cardGrid))).toHaveLength(1);
    await rerender({ keys: [] });
    expect(styleTags(gridId(cardGrid))).toHaveLength(0);
    await rerender({ keys: [5] });
    expect(styleTags(gridId(cardGrid))).toHaveLength(1);

    unmount();
    expect(styleTags(gridId(cardGrid))).toHaveLength(0);
  });
});

describe("an optional area", () => {
  it("is absent when its slot isn't rendered, and the derived layout applies", async () => {
    const { container, rerender } = await render(Optional, { icon: true });
    const card = find(container, "[data-testid=card]");
    const info = () => find(card, ":scope > [data-area=info]").getBoundingClientRect();
    const left = card.getBoundingClientRect().x;

    expect(info().x - left).toBe(40);
    expect(info().width).toBe(260);

    await rerender({ icon: false });
    expect(card.querySelector("[data-area=icon]")).toBeNull();
    expect(info().x - left).toBe(0);
    expect(info().width).toBe(300);
  });
});

describe("in production", () => {
  it("logs nothing about missing slots or stray children", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await render(MissingSlot);
      await tick();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("props", () => {
  it("stay reactive through the grid and slot components", async () => {
    const { container, rerender } = await render(Reactive, {
      gridClass: "before",
      slotClass: "slot-before",
    });

    await rerender({ gridClass: "after", slotClass: "slot-after" });

    const card = find(container, "[data-testid=card]");
    expect(card.className).toBe("after");
    expect(find(card, "[data-area=info]").className).toBe("slot-after");
    const content = find(container, "[data-testid=content]");
    expect(content.className).toBe("after");
    expect(content.getAttribute("data-area")).toBe("content");
    expect(find(content, "[data-area=title]").className).toBe("slot-after");
  });
});
