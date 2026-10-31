/**
 * Server rendering with Vue's own renderer, outside any DOM: the grids
 * register their definitions in the request's SSR context, and
 * `renderGridStyles` turns them into the style tags for `<head>`.
 */
import { gridId } from "typed-grid-areas";
import { gridStyleTags } from "typed-grid-areas/adapter";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createGridComponent, renderGridStyles } from "./index.ts";
import ServerCards from "./test-utils/ServerCards.vue";
import { cardGrid, contentGrid, unusedGrid } from "./test-utils/serverDefinitions.ts";

async function renderRequest(count: number) {
  const ctx = {};
  const html = await renderToString(createSSRApp(ServerCards, { count }), ctx);
  return { html, head: renderGridStyles(ctx) };
}

describe("server rendering", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn");
    vi.spyOn(console, "error");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the grids with their slots", async () => {
    const { html } = await renderRequest(1);

    expect(html).toContain(`data-grid-id="${gridId(cardGrid)}"`);
    expect(html).toContain('data-area="content"');
    expect(html).toContain(`data-grid-id="${gridId(contentGrid)}"`);
    expect(html).toContain('data-area="title"');
  });

  it("collects each rendered definition's style tag once per request", async () => {
    const { head } = await renderRequest(4);

    expect(head).toBe(gridStyleTags([cardGrid, contentGrid]));
    expect(head).not.toContain(gridId(unusedGrid));
  });

  it("keeps each request's definitions to itself", async () => {
    const Other = createGridComponent(unusedGrid);
    const ctx = {};
    await renderToString(
      createSSRApp(() => h(Other, () => [h(Other.a), h(Other.b)])),
      ctx,
    );

    expect(renderGridStyles(ctx)).toBe(gridStyleTags([unusedGrid]));
    expect((await renderRequest(1)).head).toBe(gridStyleTags([cardGrid, contentGrid]));
  });

  it("has no styles for a context nothing rendered with", () => {
    expect(renderGridStyles({})).toBe("");
  });

  it("logs nothing, even in development with slots missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const Card = createGridComponent(cardGrid);

    await renderToString(
      createSSRApp(() => h(Card, () => [h("span", "stray")])),
      {},
    );

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });
});
