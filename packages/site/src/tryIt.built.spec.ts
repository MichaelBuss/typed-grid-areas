/**
 * The built Try it page (`npm run test:browser` builds it first), in
 * Chromium with JavaScript on: the playground island's resizable container
 * and checkboxes, the matrix of every combination of optional areas, the
 * generated-CSS view, and the links to each adapter's StackBlitz example.
 */
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { generateCss } from "typed-grid-areas";
import {
  idCardGrid,
  NARROW,
  preferenceCardGrid,
  preferenceContentGrid,
  WIDE,
} from "@typed-grid-areas/acceptance/designs";
import { serveDist } from "./test-utils/serve.ts";

describe("the Try it page", () => {
  let server: { url: string; close: () => void };
  let browser: Browser;
  let tryIt: Page;
  let playground: Locator;
  const errors: Array<string> = [];

  beforeAll(async () => {
    server = await serveDist();
    browser = await chromium.launch();
    tryIt = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    tryIt.on("pageerror", error => errors.push(error.message));
    tryIt.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await tryIt.goto(`${server.url}try-it/`);
    playground = tryIt.locator("[data-playground]");
    // Hydrated: Astro drops the island's `ssr` attribute once it has.
    await tryIt.locator("astro-island:not([ssr]) [data-playground]").waitFor();
  });

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** The box of the playground card's slot for an area, or null when it isn't rendered. */
  async function slot(area: string) {
    const element = playground.locator(`[data-playground-frame] [data-area="${area}"]`).last();
    return (await element.count()) === 0 ? null : element.boundingBox();
  }

  async function width(px: number) {
    await playground.getByLabel("Width").fill(String(px));
  }

  it("hydrates without errors", () => {
    expect(errors).toEqual([]);
  });

  it("switches the ID card's layout at its breakpoint as the container is resized, and reads out the width", async () => {
    await playground.getByLabel("ID card").check();
    await width(NARROW);
    await expect.poll(() => playground.locator("output").textContent()).toBe(`${NARROW}px`);
    const photo = (await slot("photo"))!;
    const identity = (await slot("identity"))!;
    expect(identity.y).toBeLessThan(photo.y + photo.height);

    await width(WIDE);
    await expect.poll(() => playground.locator("output").textContent()).toBe(`${WIDE}px`);
    const widePhoto = (await slot("photo"))!;
    const wideIdentity = (await slot("identity"))!;
    expect(wideIdentity.x).toBeGreaterThanOrEqual(widePhoto.x + widePhoto.width);
  });

  it("reads out the width when the container is dragged to a new size, not only from the slider", async () => {
    await playground
      .locator("[data-playground-frame]")
      .evaluate(frame => ((frame as HTMLElement).style.width = "448px"));
    await expect.poll(() => playground.locator("output").textContent()).toBe("448px");
  });

  it("shows the derived layout when an optional area's checkbox is toggled, without a reload", async () => {
    await tryIt.evaluate(() => ((window as { notReloaded?: boolean }).notReloaded = true));
    await playground.getByLabel("PreferenceCard").check();
    await width(NARROW);
    const icon = (await slot("icon"))!;
    const information = (await slot("information"))!;
    // Icon and tag share the top row, above the information.
    expect(information.y).toBeGreaterThanOrEqual(icon.y + icon.height);

    await playground.getByRole("checkbox", { name: "cardTag" }).uncheck();
    await expect.poll(() => slot("cardTag")).toBeNull();
    const derivedIcon = (await slot("icon"))!;
    const derivedInformation = (await slot("information"))!;
    // Without the tag, the information sits beside the icon.
    expect(derivedInformation.x).toBeGreaterThanOrEqual(derivedIcon.x + derivedIcon.width);
    expect(derivedInformation.y).toBeLessThan(derivedIcon.y + derivedIcon.height);
    expect(await tryIt.evaluate(() => (window as { notReloaded?: boolean }).notReloaded)).toBe(
      true,
    );
    await playground.getByRole("checkbox", { name: "cardTag" }).check();
  });

  it("shows every combination of each design's optional areas, at both widths", async () => {
    for (const [design, optional] of [
      ["preference-card", 4],
      ["id-card", 3],
    ] as const) {
      const cards = tryIt.locator(`[data-matrix="${design}"] figure`);
      const all = await cards.evaluateAll(figures =>
        figures.map(figure => ({
          present: figure.getAttribute("data-present"),
          width: Math.round(figure.querySelector("[data-demo]")!.getBoundingClientRect().width),
        })),
      );
      expect(all).toHaveLength(2 ** optional * 2);
      for (const px of [NARROW, WIDE]) {
        const atWidth = all.filter(card => card.width === px);
        expect(new Set(atWidth.map(card => card.present)).size, `${design} at ${px}px`).toBe(
          2 ** optional,
        );
      }
    }
  });

  it("shows the CSS the core generates for the selected definition", async () => {
    const shown = () =>
      playground
        .locator("[data-generated-css] pre code")
        .evaluateAll(blocks => blocks.map(block => block.textContent));
    await playground.getByLabel("PreferenceCard").check();
    expect(await shown()).toEqual([
      generateCss(preferenceCardGrid),
      generateCss(preferenceContentGrid),
    ]);
    await playground.getByLabel("ID card").check();
    expect(await shown()).toEqual([generateCss(idCardGrid)]);
  });

  it("links to a StackBlitz example for each of the seven stable adapters", async () => {
    const links = await tryIt
      .locator('a[href^="https://stackblitz.com/"]')
      .evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute("href")));
    expect(links).toEqual(
      ["react", "vue", "svelte", "solid", "preact", "angular", "lit"].map(
        adapter =>
          `https://stackblitz.com/github/MichaelBuss/typed-grid-areas/tree/main/examples/${adapter}`,
      ),
    );
  });
});
