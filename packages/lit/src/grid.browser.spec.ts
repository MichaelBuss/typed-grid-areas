import { css, html, nothing } from "lit";
import { createRef } from "lit/directives/ref.js";
import { defineLayout } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { createGrid, gridStyles } from "./index.ts";
import {
  defineHost,
  mountElement,
  mountInDocument as mount,
  mountInShadowRoot,
  rerender,
  settle,
} from "./test-utils/mount.ts";

describe("createGrid", () => {
  describe("renders the same DOM as the React adapter", () => {
    it("puts the grid id on the grid and each slot directly inside it", () => {
      const Card = createGrid(
        defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      );

      const container = mount(
        Card(html`
          <label data-area=${Card.input}><input type="checkbox" /></label>
          <div data-area=${Card.content}>Content</div>
        `),
      );

      const grid = container.firstElementChild!;
      expect(grid.tagName).toBe("DIV");
      expect(grid.getAttribute("data-grid-id")).toMatch(/.+/);
      expect(
        Array.from(grid.children, child => [child.tagName, child.getAttribute("data-area")]),
      ).toEqual([
        ["LABEL", "input"],
        ["DIV", "content"],
      ]);
    });

    it("wraps a grid with breakpoints in its size container, with the options on the grid", () => {
      const Card = createGrid(
        defineLayout({
          areas: ["icon", "info"],
          layouts: [{ template: "icon info", breakpoints: { "@sm": { template: "info icon" } } }],
        }),
      );
      const gridRef = createRef<HTMLElement>();

      const container = mount(
        Card(
          html`
            <div data-area=${Card.icon}></div>
            <div data-area=${Card.info}></div>
          `,
          { class: "card", style: "color: red", ref: gridRef },
        ),
      );

      const sizeContainer = container.firstElementChild as HTMLElement;
      expect(sizeContainer.style.containerType).toBe("inline-size");
      expect(sizeContainer.hasAttribute("class")).toBe(false);
      expect(sizeContainer.children).toHaveLength(1);

      const grid = sizeContainer.firstElementChild as HTMLElement;
      expect(grid.getAttribute("data-grid-id")).toMatch(/.+/);
      expect(grid.className).toBe("card");
      expect(grid.style.color).toBe("red");
      expect(gridRef.value).toBe(grid);
      expect(Array.from(grid.children, child => child.getAttribute("data-area"))).toEqual([
        "icon",
        "info",
      ]);
    });

    it("takes the grid's style as an object, as styleMap does", () => {
      const Card = createGrid(defineLayout({ areas: ["info"], layouts: [{ template: "info" }] }));

      const container = mount(
        Card(html`<div data-area=${Card.info}></div>`, { style: { paddingTop: "3px" } }),
      );

      expect((container.firstElementChild as HTMLElement).style.paddingTop).toBe("3px");
    });

    it("renders a nested grid as the outer area's slot, reaching its areas through it", () => {
      const Content = createGrid(
        defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
      );
      const Card = createGrid(
        defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
        { nest: { content: Content } },
      );

      const container = mount(
        Card(html`
          ${Card.content(
            html`
              <span data-area=${Card.content.icon}>★</span>
              <div data-area=${Card.content.title}>Title</div>
            `,
            { class: "p-4" },
          )}
        `),
      );

      const card = container.firstElementChild!;
      const content = card.firstElementChild!;
      expect(card.children).toHaveLength(1);
      expect(content.getAttribute("data-area")).toBe("content");
      expect(content.getAttribute("data-grid-id")).toMatch(/.+/);
      expect(content.getAttribute("data-grid-id")).not.toBe(card.getAttribute("data-grid-id"));
      expect(content.className).toBe("p-4");
      expect(Array.from(content.children, child => child.getAttribute("data-area"))).toEqual([
        "icon",
        "title",
      ]);
    });

    it("puts the outer area on a nested grid's size container when it has one", () => {
      const Content = createGrid(
        defineLayout({
          areas: ["icon", "title"],
          layouts: [{ template: "icon title", breakpoints: { "@sm": { template: "title icon" } } }],
        }),
      );
      const Card = createGrid(
        defineLayout({ areas: ["content"], layouts: [{ template: "content" }] }),
        { nest: { content: Content } },
      );

      const container = mount(
        Card(
          Card.content(
            html`<div data-area=${Card.content.icon}></div>
              <div data-area=${Card.content.title}></div>`,
            { class: "p-4" },
          ),
        ),
      );

      const sizeContainer = container.firstElementChild!.firstElementChild as HTMLElement;
      expect(sizeContainer.getAttribute("data-area")).toBe("content");
      expect(sizeContainer.style.containerType).toBe("inline-size");
      expect(sizeContainer.hasAttribute("class")).toBe(false);
      const grid = sizeContainer.firstElementChild!;
      expect(grid.hasAttribute("data-area")).toBe(false);
      expect(grid.getAttribute("data-grid-id")).toMatch(/.+/);
      expect(grid.className).toBe("p-4");
    });

    it("leaves out the class and style attributes the options don't set", () => {
      const Card = createGrid(defineLayout({ areas: ["info"], layouts: [{ template: "info" }] }));

      const container = mount(Card(html`<div data-area=${Card.info}></div>`));

      const grid = container.firstElementChild!;
      expect(grid.hasAttribute("class")).toBe(false);
      expect(grid.hasAttribute("style")).toBe(false);
    });
  });

  describe("an optional area", () => {
    const Card = createGrid(
      defineLayout({
        areas: ["icon?", "info"],
        layouts: [{ template: "icon info", columns: "40px 1fr" }],
      }),
    );
    let hasIcon = true;
    const tag = defineHost(
      () =>
        Card(html`
          ${hasIcon ? html`<div data-area=${Card.icon}></div>` : nothing}
          <div data-area=${Card.info}></div>
        `),
      css`
        [data-grid-id] {
          width: 200px;
        }
      `,
    );

    it("is absent when its slot isn't rendered, and the derived layout applies", async () => {
      hasIcon = true;
      const host = await mountElement(tag);
      const info = () => host.shadowRoot.querySelector<HTMLElement>("[data-area=info]")!;
      expect(info().getBoundingClientRect().width).toBe(160);

      hasIcon = false;
      await rerender(host);

      expect(host.shadowRoot.querySelector("[data-area=icon]")).toBeNull();
      expect(info().getBoundingClientRect().width).toBe(200);
    });
  });

  it("logs nothing about miswired slots outside development", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const Card = createGrid(
      defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
    );

    mount(Card(html`<span>stray</span>`));
    await settle();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe("rendered in the document", () => {
    it("puts each definition's CSS in <head> once, however many instances render", async () => {
      const Card = createGrid(
        defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
      );
      const card = () =>
        Card(
          html`<div data-area=${Card.icon}></div>
            <div data-area=${Card.info}></div>`,
        );

      const first = mount(html`${card()}${card()}`);
      mount(card());
      await settle();

      const id = first.firstElementChild!.getAttribute("data-grid-id");
      const tags = document.head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`);
      expect(tags).toHaveLength(1);
      expect(getComputedStyle(first.firstElementChild!).display).toBe("grid");
    });
  });

  describe("rendered in a LitElement's shadow root", () => {
    const Content = createGrid(
      defineLayout({
        areas: ["icon?", "title"],
        layouts: [{ template: "icon title", columns: "auto 1fr" }],
      }),
    );
    const Card = createGrid(
      defineLayout({
        areas: ["input?", "content"],
        layouts: [{ template: "input content", columns: "auto 1fr" }],
      }),
      { nest: { content: Content } },
    );
    const card = () =>
      Card(html`
        <label data-area=${Card.input}></label>
        ${Card.content(html`<div data-area=${Card.content.title}></div>`)}
      `);
    const gridIds = (root: ShadowRoot) =>
      Array.from(root.querySelectorAll("[data-grid-id]"), grid =>
        grid.getAttribute("data-grid-id"),
      );
    /** The adopted sheets that hold a grid's CSS. */
    const gridSheets = (root: ShadowRoot) =>
      root.adoptedStyleSheets.filter(sheet =>
        Array.from(sheet.cssRules).some(rule => rule.cssText.includes("data-grid-id")),
      );

    it("adopts each definition's sheet into the root once, not into <head>", async () => {
      const host = await mountInShadowRoot(() => html`${card()}${card()}`);
      await rerender(host);

      const sheets = gridSheets(host.shadowRoot);
      expect(sheets).toHaveLength(2);
      for (const id of gridIds(host.shadowRoot)) {
        expect(document.head.querySelector(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`)).toBeNull();
      }
      expect(getComputedStyle(host.shadowRoot.querySelector("[data-grid-id]")!).display).toBe(
        "grid",
      );
    });

    it("shares one sheet per definition across roots", async () => {
      const first = await mountInShadowRoot(card);
      const second = await mountInShadowRoot(card);

      const firstSheets = gridSheets(first.shadowRoot);
      expect(firstSheets).toHaveLength(2);
      expect(gridSheets(second.shadowRoot)).toEqual(firstSheets);
      expect(gridSheets(second.shadowRoot)[0]).toBe(firstSheets[0]);
    });

    it("adopts nothing more when gridStyles is in static styles", async () => {
      const host = await mountInShadowRoot(card, gridStyles(Card));
      await rerender(host);

      expect(gridSheets(host.shadowRoot)).toHaveLength(1);
      expect(host.shadowRoot.adoptedStyleSheets).toHaveLength(2);
      for (const grid of host.shadowRoot.querySelectorAll("[data-grid-id]")) {
        expect(getComputedStyle(grid).display).toBe("grid");
      }
    });

    it("lets a consumer class change the grid's display and gap", async () => {
      const host = await mountInShadowRoot(
        () =>
          Card(
            html`<div data-area=${Card.input}></div>
              <div data-area=${Card.content}></div>`,
            {
              class: "mine",
            },
          ),
        css`
          .mine {
            display: flex;
            gap: 7px;
          }
        `,
      );

      const grid = host.shadowRoot.querySelector("[data-grid-id]")!;
      expect(getComputedStyle(grid).display).toBe("flex");
      expect(getComputedStyle(grid).columnGap).toBe("7px");
    });

    it("keeps an area its layout leaves out hidden, even when its slot sets display", async () => {
      const Hiding = createGrid(
        defineLayout({
          areas: ["icon", "info", "tag"],
          layouts: [{ template: "info tag" }, { when: ["icon"], template: "icon info" }],
        }),
      );
      const host = await mountInShadowRoot(
        () =>
          Hiding(html`
            <div data-area=${Hiding.icon}></div>
            <div data-area=${Hiding.info}></div>
            <div data-area=${Hiding.tag} class="flex-slot"></div>
          `),
        css`
          .flex-slot {
            display: flex;
          }
        `,
      );

      const tag = host.shadowRoot.querySelector(`[data-area="tag"]`)!;
      expect(tag.getClientRects()).toHaveLength(0);
    });
  });
});
