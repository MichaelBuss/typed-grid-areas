/**
 * The built site, in `dist/` (`npm run test:browser` builds it first): its
 * pages and their order, the How it works and Reading type errors pages'
 * generated content, its links to the README, and the Examples page's demos
 * laying out in Chromium with JavaScript turned off.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { NARROW, WIDE } from "@typed-grid-areas/acceptance/designs";
import captured from "./typeErrors.captured.json";
import { headline } from "./howItWorks.ts";
import { base, dist, serveDist } from "./test-utils/serve.ts";

/** A built page's HTML, by its path under the base. */
function page(path: string): string {
  const file = join(dist, path, "index.html");
  if (!existsSync(file)) {
    throw new Error(`${file} doesn't exist: build the site first (npm run build)`);
  }
  return readFileSync(file, "utf8");
}

/** HTML-unescapes an attribute's value. */
const unescape = (text: string) =>
  text
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");

/** Code without whitespace (or the DEL that a copy button writes for each line break). */
const squash = (code: string) => code.replace(/[\s\x7f]+/g, "");

/** The code of every code block on a built page, from its copy button, squashed. */
function codeOn(html: string): Array<string> {
  return Array.from(html.matchAll(/data-code="([^"]*)"/g), match => squash(unescape(match[1]!)));
}

describe("the built site", () => {
  it("has the seven pages, in order, in its sidebar", () => {
    const sidebar = /<nav[^>]*aria-label="Main"[\s\S]*?<\/nav>/.exec(page(""))?.[0] ?? "";
    const links = Array.from(sidebar.matchAll(/href="([^"]+)"/g), match => match[1]).filter(href =>
      href?.startsWith(base),
    );
    expect(links).toEqual([
      base,
      `${base}getting-started/`,
      `${base}concepts/areas/`,
      `${base}concepts/overrides/`,
      `${base}concepts/breakpoints/`,
      `${base}concepts/layers/`,
      `${base}concepts/nested-grids/`,
      `${base}how-it-works/`,
      `${base}type-errors/`,
      `${base}examples/`,
      `${base}try-it/`,
    ]);
  });

  it("shows the CSS and markup the core generated for the ID card on How it works", () => {
    const code = codeOn(page("how-it-works"));
    expect(code).toContain(squash(headline.css));
    expect(code).toContain(squash(headline.markup));
  });

  it("shows the captured compiler output on Reading type errors", () => {
    const code = codeOn(page("type-errors"));
    for (const { message } of Object.values(captured)) {
      expect(code).toContain(squash(message));
    }
  });

  it("links to the README only at a release tag, never at a branch", () => {
    const pages = ["getting-started", "concepts/areas", "examples"].map(page);
    const links = pages.flatMap(html =>
      Array.from(
        html.matchAll(
          /https:\/\/github\.com\/MichaelBuss\/typed-grid-areas\/blob\/([^"#]+)\/README\.md/g,
        ),
        match => match[1]!,
      ),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const ref of links) {
      expect(ref).toMatch(/^(@typed-grid-areas\/[a-z]+|typed-grid-areas)@\d+\.\d+\.\d+$/);
    }
  });

  it("has code tabs for the seven stable adapters on Examples, for each design", () => {
    const tabs = Array.from(
      page("examples").matchAll(/<a role="tab"[^>]*>\s*([^<]+?)\s*</g),
      match => match[1]!.trim(),
    );
    const adapters = ["React", "Vue", "Svelte", "Solid", "Preact", "Angular", "Lit"];
    expect(tabs).toEqual([...adapters, ...adapters]);
  });

  it("renders the Examples page's demos with no client JavaScript: no island, no React", () => {
    const html = page("examples");
    expect(html).not.toContain("<astro-island");
    expect(html.match(/data-demo="preference-card"/g)).toHaveLength(4);
    expect(html.match(/data-demo="id-card"/g)).toHaveLength(4);
    // Starlight's own scripts (search, theme, tabs) only: none of them is React.
    const scripts = Array.from(html.matchAll(/<script[^>]* src="([^"]+)"/g), match => match[1]!);
    for (const src of scripts) {
      const script = readFileSync(join(dist, src.slice(base.length)), "utf8");
      expect(script, src).not.toContain("react.transitional.element");
    }
  });
});

describe("the Examples page, with JavaScript turned off", () => {
  let server: { url: string; close: () => void };
  let browser: Browser;
  let examples: Page;

  beforeAll(async () => {
    page("examples");
    server = await serveDist();
    browser = await chromium.launch();
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 900 },
    });
    examples = await context.newPage();
    await examples.goto(`${server.url}examples/`);
  });

  afterAll(async () => {
    await browser?.close();
    server?.close();
  });

  /** The bounding box of the `n`th demo of a design, and of its slots by area. */
  async function demo(design: "preference-card" | "id-card", n: number) {
    const card = examples.locator(`[data-demo="${design}"]`).nth(n);
    const slot = async (area: string) => {
      const box = await card.locator(`[data-area="${area}"]`).last().boundingBox();
      expect(box, area).not.toBeNull();
      return box!;
    };
    return { box: (await card.boundingBox())!, slot };
  }

  it("lays out the PreferenceCard: icon and tag above the information when narrow, one row when wide", async () => {
    const narrow = await demo("preference-card", 0);
    expect(narrow.box.width).toBe(NARROW);
    const [icon, information, tag] = await Promise.all(
      ["icon", "information", "cardTag"].map(narrow.slot),
    );
    expect(tag!.y).toBeCloseTo(icon!.y, 0);
    expect(information!.y).toBeGreaterThanOrEqual(icon!.y + icon!.height);

    const wide = await demo("preference-card", 1);
    expect(wide.box.width).toBe(WIDE);
    const [wideIcon, wideInformation, wideTag] = await Promise.all(
      ["icon", "information", "cardTag"].map(wide.slot),
    );
    expect(wideInformation!.x).toBeGreaterThanOrEqual(wideIcon!.x + wideIcon!.width);
    expect(wideTag!.x).toBeGreaterThanOrEqual(wideInformation!.x + wideInformation!.width);
    expect(wideInformation!.y).toBeLessThan(wideIcon!.y + wideIcon!.height);
  });

  it("lays out the ID card: identity over the photo when narrow, beside it when wide", async () => {
    const narrow = await demo("id-card", 0);
    const [photo, identity] = await Promise.all(["photo", "identity"].map(narrow.slot));
    expect(identity!.y).toBeLessThan(photo!.y + photo!.height);
    expect(identity!.x).toBeLessThan(photo!.x + photo!.width);

    const wide = await demo("id-card", 1);
    const [widePhoto, wideIdentity] = await Promise.all(["photo", "identity"].map(wide.slot));
    expect(wideIdentity!.x).toBeGreaterThanOrEqual(widePhoto!.x + widePhoto!.width);
  });
});
