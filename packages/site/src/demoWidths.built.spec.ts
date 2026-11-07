/**
 * The built site's demos on a phone-sized screen, in Chromium (`npm run
 * test:browser` builds the site first). A demo shows a card at a stated
 * width so the reader sees the layout for that width; on a screen narrower
 * than that, the card must still be that wide (scrolling sideways in its
 * row), never squeezed to the screen while its label says otherwise.
 */
import { chromium, type Browser, type Page } from "playwright";
import { serveDist } from "./test-utils/serve.ts";

const PHONE = { width: 390, height: 844 };

describe("demos on a phone-sized screen", () => {
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

  async function open(path: string): Promise<Page> {
    const page = await browser.newPage({ viewport: PHONE });
    await page.goto(`${server.url}${path}`);
    return page;
  }

  /** Each labelled demo card's stated width and the width it renders at. */
  function frames(page: Page) {
    return page.locator("figure.tga-demo").evaluateAll(figures =>
      figures.map(figure => ({
        label: figure.querySelector("figcaption")!.textContent!,
        stated: Number(/(\d+)px$/.exec(figure.querySelector("figcaption")!.textContent!)![1]),
        rendered: Math.round(figure.firstElementChild!.getBoundingClientRect().width),
      })),
    );
  }

  /** How far the page itself scrolls sideways: 0 when only the demo rows do. */
  const pageOverflow = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  it.each(["examples/", "try-it/"])("renders every card on %s at its stated width", async path => {
    const page = await open(path);
    const all = await frames(page);
    expect(all.length).toBeGreaterThan(0);
    expect(all.some(({ stated }) => stated > PHONE.width)).toBe(true);
    for (const { label, stated, rendered } of all) {
      expect(rendered, label).toBe(stated);
    }
    expect(await pageOverflow(page)).toBe(0);
    await page.close();
  });

  it("renders the playground's card at the width picked, wider than the screen", async () => {
    const page = await open("try-it/");
    await page.locator("astro-island:not([ssr]) [data-playground]").waitFor();
    const playground = page.locator("[data-playground]");
    await playground.getByLabel("Width").fill("560");
    const frame = playground.locator("[data-playground-frame]");
    await expect
      .poll(() => frame.evaluate(element => Math.round(element.getBoundingClientRect().width)))
      .toBe(560);
    await expect.poll(() => playground.locator("output").textContent()).toBe("560px");
    expect(await pageOverflow(page)).toBe(0);
    await page.close();
  });
});
