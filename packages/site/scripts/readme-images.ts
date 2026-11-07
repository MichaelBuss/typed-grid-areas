/**
 * Renders the README's images from the built site, in Chromium:
 *
 * - `docs/images/hero.png`: the acceptance package's PreferenceCard design in
 *   four combinations of present slots, from the Try it page's matrix.
 * - `docs/images/areas.png`: the Introduction page's grid template areas
 *   explainer, the template beside the card it lays out, without controls.
 *
 *     npm run build -w @typed-grid-areas/site
 *     node packages/site/scripts/readme-images.ts
 *
 * Re-run it when the designs, the explainer or the site's styling change.
 * The README links each image at its absolute URL on `main`, since npm
 * doesn't resolve relative image paths.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { NARROW } from "@typed-grid-areas/acceptance/designs";
import { repoDir } from "../src/test-utils/tsc.ts";
import { serveDist } from "../src/test-utils/serve.ts";

const images = join(repoDir, "docs", "images");

/** The hero's combinations, each a distinct layout of the design. */
const combinations = ["input,icon,cardTag", "icon,cardTag,children", "input,icon", "cardTag"];

/**
 * Lifts the given elements, cloned, into a box of their own on top of the
 * page, laid out by `style` (each clone styled by `childStyle`), and
 * screenshots it.
 */
async function shoot(
  page: Page,
  file: string,
  selectors: Array<string>,
  style: object,
  childStyle: object = {},
) {
  await page.evaluate(
    ({ selectors, style, childStyle }) => {
      const box = document.createElement("div");
      box.id = "readme-image";
      Object.assign(box.style, {
        position: "absolute",
        inset: "0 auto auto 0",
        zIndex: "1000",
        padding: "24px",
        background: "var(--sl-color-bg)",
        ...style,
      });
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element === null) throw new Error(`readme-images: nothing matches ${selector}`);
        const clone = element.cloneNode(true) as HTMLElement;
        Object.assign(clone.style, childStyle);
        box.append(clone);
      }
      document.body.append(box);
      window.scrollTo(0, 0);
    },
    { selectors, style, childStyle },
  );
  await page.locator("#readme-image").screenshot({ path: join(images, file) });
  console.log(`wrote ${join(images, file)}`);
}

const server = await serveDist();
const browser = await chromium.launch();
try {
  mkdirSync(images, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await context.addInitScript(() => localStorage.setItem("starlight-theme", "light"));

  const tryIt = await context.newPage();
  await tryIt.goto(`${server.url}try-it/`);
  await shoot(
    tryIt,
    "hero.png",
    combinations.map(
      present =>
        `[data-matrix="preference-card"] [data-present="${present}"][style*="width:${NARROW}px"]`,
    ),
    { display: "grid", gridTemplateColumns: `repeat(2, ${NARROW}px)`, gap: "24px" },
  );

  const introduction = await context.newPage();
  await introduction.goto(server.url);
  await introduction
    .locator("[data-areas-explainer] .tga-explainer-controls")
    .evaluate(controls => controls.remove());
  await shoot(
    introduction,
    "areas.png",
    ["[data-areas-explainer]"],
    { width: "720px" },
    { margin: "0", flexWrap: "nowrap" },
  );
} finally {
  await browser.close();
  server.close();
}
