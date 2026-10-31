/**
 * Server rendering with `@lit-labs/ssr`, Lit's own server renderer: a
 * component that puts `gridStyles` in its `static styles` renders its grids'
 * CSS and attributes into its declarative shadow root.
 */
import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";
import { defineLayout } from "typed-grid-areas";
import { gridMarkup } from "typed-grid-areas/adapter";
import { createGrid } from "./index.ts";
import { cardGrid, contentGrid, defineServerCard } from "./test-utils/serverCard.ts";

defineServerCard();

describe("server rendering", () => {
  it("puts the grids' CSS and attributes in the component's declarative shadow root", async () => {
    const output = await collectResult(render(html`<server-card></server-card>`));

    const shadowRoot = /<template shadowroot(?:mode)?="open"[^>]*>([\s\S]*)<\/template>/.exec(
      output,
    )?.[1];
    expect(shadowRoot).toBeDefined();

    const style = /<style>([\s\S]*?)<\/style>/.exec(shadowRoot!)?.[1];
    expect(style).toContain(`[data-grid-id=${cardId()}]`);
    expect(style).toContain(`[data-grid-id=${contentId()}]`);

    expect(shadowRoot).toMatch(new RegExp(`<div[^>]*data-grid-id="${cardId()}"[^>]*>`));
    expect(shadowRoot).toMatch(/<div[^>]*data-grid-id="[^"]+"[^>]*class="gap"/);
    expect(shadowRoot).toMatch(/<label[^>]*data-area="input"/);
    // The nested grid has breakpoints: the outer area goes on its size container.
    expect(shadowRoot).toMatch(
      /<div[^>]*data-area="content"[^>]*style="container-type: inline-size;/,
    );
    expect(shadowRoot).toMatch(new RegExp(`data-grid-id="${contentId()}"[^>]*class="content"`));
    expect(shadowRoot).toMatch(/<span[^>]*data-area="icon"/);
  });

  it("logs nothing, even in development with miswired slots", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const environment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const Grid = createGrid(
        defineLayout({ areas: ["icon", "info"], layouts: [{ template: "icon info" }] }),
      );
      await collectResult(render(Grid(html`<span>stray</span>`)));
      await new Promise(resolve => setTimeout(resolve));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = environment;
      warn.mockRestore();
    }
  });
});

function cardId(): string {
  return gridMarkup(cardGrid).id;
}

function contentId(): string {
  return gridMarkup(contentGrid).id;
}
