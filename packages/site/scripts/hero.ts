/**
 * Renders the README's hero image, `docs/images/hero.png`: the acceptance
 * package's PreferenceCard design in four combinations of present slots,
 * as the built Try it page's matrix lays them out in Chromium.
 *
 *     npm run build -w @typed-grid-areas/site
 *     node packages/site/scripts/hero.ts
 *
 * Re-run it when the PreferenceCard's design or the site's demo styling
 * changes. The README links the image at its absolute URL on `main`, since
 * npm doesn't resolve relative image paths.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { NARROW } from "@typed-grid-areas/acceptance/designs";
import { repoDir } from "../src/test-utils/tsc.ts";
import { serveDist } from "../src/test-utils/serve.ts";

const output = join(repoDir, "docs", "images", "hero.png");

/** The combinations shown, each a distinct layout of the design. */
const combinations = ["input,icon,cardTag", "icon,cardTag,children", "input,icon", "cardTag"];

const server = await serveDist();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await page.addInitScript(() => localStorage.setItem("starlight-theme", "light"));
  await page.goto(`${server.url}try-it/`);
  await page.evaluate(
    ({ combinations, width }) => {
      const hero = document.createElement("div");
      hero.id = "hero";
      Object.assign(hero.style, {
        position: "absolute",
        inset: "0 auto auto 0",
        zIndex: "1000",
        display: "grid",
        gridTemplateColumns: `repeat(2, ${width}px)`,
        gap: "24px",
        padding: "24px",
        background: "var(--sl-color-bg)",
      });
      for (const present of combinations) {
        const frame = document.querySelector(
          `[data-matrix="preference-card"] [data-present="${present}"][style*="width:${width}px"]`,
        );
        if (frame === null) {
          throw new Error(`hero: no ${width}px frame with ${present}`);
        }
        hero.append(frame.cloneNode(true));
      }
      document.body.append(hero);
      window.scrollTo(0, 0);
    },
    { combinations, width: NARROW },
  );
  mkdirSync(dirname(output), { recursive: true });
  await page.locator("#hero").screenshot({ path: output });
  console.log(`wrote ${output}`);
} finally {
  await browser.close();
  server.close();
}
