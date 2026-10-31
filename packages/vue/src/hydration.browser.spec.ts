/**
 * Hydrating server-rendered HTML: the page as an app's server entry sends
 * it (the grids' style tags from `renderGridStyles` in `<head>`), then
 * `createSSRApp(...).mount(...)` in the browser.
 */
import { gridId } from "typed-grid-areas";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { renderGridStyles } from "./index.ts";
import ServerCards from "./test-utils/ServerCards.vue";
import { cardGrid, contentGrid } from "./test-utils/serverDefinitions.ts";

const styleTags = () => document.head.querySelectorAll("style[data-typed-grid-areas]");

describe("hydrating server-rendered grids", () => {
  let container: HTMLElement;

  beforeEach(async () => {
    // The server's response, rendered here since the browser can run Vue's server renderer too.
    const ctx = {};
    const html = await renderToString(createSSRApp(ServerCards, { count: 3 }), ctx);
    document.head.insertAdjacentHTML("beforeend", renderGridStyles(ctx));
    container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);

    vi.spyOn(console, "warn");
    vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
    styleTags().forEach(tag => tag.remove());
  });

  it("logs no hydration mismatch and adds no second style tag", async () => {
    const before = container.innerHTML;
    const app = createSSRApp(ServerCards, { count: 3 });
    app.mount(container);

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(container.innerHTML).toBe(before);
    expect(Array.from(styleTags(), tag => tag.getAttribute("data-typed-grid-areas"))).toEqual([
      gridId(cardGrid),
      gridId(contentGrid),
    ]);
    app.unmount();
  });
});
