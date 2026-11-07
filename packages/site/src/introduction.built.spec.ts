/**
 * The built Introduction page's grid template areas explainer, in Chromium
 * (`npm run test:browser` builds the site first): its picture of the
 * template is the template the card's grid applies, as written without
 * JavaScript, and as derived once slots are taken out.
 */
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { serveDist } from "./test-utils/serve.ts";

describe("the grid template areas explainer", () => {
  let server: { url: string; close: () => void };
  let browser: Browser;

  beforeAll(async () => {
    server = await serveDist();
    browser = await chromium.launch();
  });

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** The picture's rows, as the explainer draws them. */
  async function picture(explainer: Locator): Promise<Array<string>> {
    const cells = await explainer
      .locator("[data-cell]")
      .evaluateAll(elements =>
        elements.map(element => [Number(element.getAttribute("data-row")), element.textContent]),
      );
    const rows: Array<Array<string>> = [];
    for (const [row, area] of cells as Array<[number, string]>) (rows[row] ??= []).push(area);
    return rows.map(row => row.join(" "));
  }

  /** The rows of the template the card's grid applies. */
  async function applied(explainer: Locator): Promise<Array<string>> {
    const value = await explainer
      .locator("[data-grid-id]")
      .evaluate(grid => getComputedStyle(grid).gridTemplateAreas);
    return Array.from(value.matchAll(/"([^"]*)"/g), match => match[1]!.trim().replace(/\s+/g, " "));
  }

  async function open(javaScript: boolean): Promise<{ page: Page; explainer: Locator }> {
    const context = await browser.newContext({ javaScriptEnabled: javaScript });
    const page = await context.newPage();
    await page.goto(server.url);
    const explainer = page.locator("[data-areas-explainer]");
    if (javaScript) {
      // Hydrated: Astro drops the island's `ssr` attribute once it has.
      await page.locator("astro-island:not([ssr]) [data-areas-explainer]").waitFor();
    }
    return { page, explainer };
  }

  it("draws the template as written, which the card applies, with no JavaScript", async () => {
    const { page, explainer } = await open(false);
    expect(await picture(explainer)).toEqual(["icon title tag", "icon body body"]);
    expect(await applied(explainer)).toEqual(["icon title tag", "icon body body"]);
    await page.context().close();
  });

  it("draws the derived template the card applies as slots are taken out", async () => {
    const { page, explainer } = await open(true);
    await explainer.getByRole("checkbox", { name: "tag" }).uncheck();
    expect(await picture(explainer)).toEqual(["icon title", "icon body"]);
    expect(await applied(explainer)).toEqual(["icon title", "icon body"]);
    await expect.poll(() => explainer.locator('[data-area="tag"]').count()).toBe(0);

    await explainer.getByRole("checkbox", { name: "icon" }).uncheck();
    expect(await picture(explainer)).toEqual(["title", "body"]);
    expect(await applied(explainer)).toEqual(["title", "body"]);

    await explainer.getByRole("checkbox", { name: "tag" }).check();
    expect(await picture(explainer)).toEqual(["title tag", "body body"]);
    await page.context().close();
  });
});
