/**
 * What every published package's npm page shows: its `homepage`, its
 * `keywords`, and the repo's README as the page's body. The README is a
 * short pitch; the API reference is REFERENCE.md, which ships beside it
 * (ADR 0007). npmjs.com only updates at publish time and doesn't resolve the
 * README's relative links or images, so those are absolute, and point at the
 * docs site or GitHub.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import GithubSlugger from "github-slugger";
import { readWorkspaces } from "./workspaces.ts";

const repo = resolve(__dirname, "..");
const docsSite = "https://michaelbuss.github.io/typed-grid-areas/";
const tryIt = "https://michaelbuss.github.io/typed-grid-areas/try-it/";

const published = readWorkspaces(repo)
  .filter(workspace => !workspace.private)
  .map(workspace => ({
    ...workspace,
    manifest: JSON.parse(readFileSync(join(repo, workspace.dir, "package.json"), "utf8")) as {
      homepage?: string;
      keywords?: string[];
    },
  }));

const readme = readFileSync(join(repo, "README.md"), "utf8");

/** The README without its fenced code blocks, whose `<img src>` is example code, not a link. */
const readmeProse = readme.replace(/^```[\s\S]*?^```/gm, "");

/** Every link and image target in the README's prose: Markdown, reference definitions and HTML. */
const readmeTargets = [
  ...Array.from(readmeProse.matchAll(/\]\(([^)\s]+)/g), match => match[1]!),
  ...Array.from(readmeProse.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm), match => match[1]!),
  ...Array.from(readmeProse.matchAll(/\b(?:href|src)=["']([^"']+)/g), match => match[1]!),
];

/** REFERENCE.md on GitHub, where the README links each of its sections. */
const reference = "https://github.com/MichaelBuss/typed-grid-areas/blob/main/REFERENCE.md";

/** The anchors GitHub gives REFERENCE.md's headings. */
const referenceAnchors = (() => {
  const slugger = new GithubSlugger();
  const markdown = readFileSync(join(repo, "REFERENCE.md"), "utf8").replace(
    /^```[\s\S]*?^```/gm,
    "",
  );
  return Array.from(markdown.matchAll(/^#{1,6} (.+)$/gm), match =>
    slugger.slug(match[1]!.replaceAll("`", "")),
  );
})();

/**
 * An adapter is a workspace `packages/<framework>`, published as
 * `@typed-grid-areas/<framework>`: its folder names its framework.
 */
const frameworkOf = (workspace: { dir: string }): string => workspace.dir.split("/").at(-1)!;

describe("every published package's npm page", () => {
  it("covers the core and every adapter, each named after its folder", () => {
    expect(published.map(workspace => workspace.name)).toContain("typed-grid-areas");
    const adapters = published.filter(workspace => workspace.name !== "typed-grid-areas");
    expect(adapters.length).toBeGreaterThan(0);
    for (const adapter of adapters) {
      expect(adapter.name).toBe(`@typed-grid-areas/${frameworkOf(adapter)}`);
    }
  });

  it.each(published.map(workspace => [workspace.name, workspace.manifest] as const))(
    "%s links its homepage to the docs site",
    (_name, manifest) => {
      expect(manifest.homepage).toBe(docsSite);
    },
  );

  it.each(published.map(workspace => [workspace.name, workspace] as const))(
    "%s is found by searching for CSS grid layouts in TypeScript, and its framework",
    (name, { manifest, ...workspace }) => {
      const framework = name === "typed-grid-areas" ? undefined : frameworkOf(workspace);
      expect(manifest.keywords).toEqual(
        expect.arrayContaining([
          "css-grid",
          "grid-template-areas",
          "layout",
          "typescript",
          ...(framework ? [framework] : []),
        ]),
      );
    },
  );

  it("keeps the core's tanstack-intent keyword, which Intent's sync maintains", () => {
    const core = published.find(workspace => workspace.name === "typed-grid-areas")!;
    expect(core.manifest.keywords).toContain("tanstack-intent");
  });
});

describe("the README, the body of every npm page", () => {
  it("is a short pitch, with the API reference in REFERENCE.md", () => {
    expect(readme.split("\n").length).toBeLessThanOrEqual(160);
    expect(readmeTargets).toContain(reference);
  });

  it("links to the docs site and its Try it page as badges right under the title", () => {
    const [title, blank, ...rest] = readme.split("\n");
    expect([title, blank]).toEqual(["# typed-grid-areas", ""]);
    // The block of lines up to the next blank line, each a linked badge.
    const badges = rest.slice(0, rest.indexOf(""));
    for (const badge of badges) {
      expect(badge).toMatch(
        /^\[!\[[^\]]+\]\(https:\/\/img\.shields\.io\/[^)]+\)\]\(https:\/\/[^)]+\)$/,
      );
    }
    expect(badges.join("\n")).toContain(`](${docsSite})`);
    expect(badges.join("\n")).toContain(`](${tryIt})`);
  });

  it("shows a hero image, by absolute URL, above the first section", () => {
    const intro = readmeProse.slice(0, readmeProse.indexOf("\n## "));
    const images = Array.from(
      intro.matchAll(/!\[[^\]]+\]\((https:\/\/[^)\s]+\.png)\)/g),
      match => match[1]!,
    );
    expect(images).toEqual([
      "https://raw.githubusercontent.com/MichaelBuss/typed-grid-areas/main/docs/images/hero.png",
    ]);
  });

  it.each(published.map(workspace => [workspace.name] as const))(
    "gives %s a row in the frameworks table, with its install command",
    name => {
      const install =
        name === "typed-grid-areas"
          ? "`npm i typed-grid-areas`"
          : `\`npm i typed-grid-areas ${name}\``;
      const rows = readmeProse.split("\n").filter(line => line.startsWith("|"));
      expect(rows.filter(row => row.includes(install))).toHaveLength(1);
    },
  );

  it("links REFERENCE.md's sections only by headings it has", () => {
    const sections = readmeTargets.filter(target => target.startsWith(`${reference}#`));
    expect(sections.length).toBeGreaterThan(0);
    for (const target of sections) {
      expect(referenceAnchors, target).toContain(target.split("#")[1]);
    }
  });

  it("links and shows images only by absolute URL, or an anchor in itself", () => {
    expect(readmeTargets.length).toBeGreaterThan(0);
    expect(readmeTargets.filter(target => !/^(https:\/\/|#)/.test(target))).toEqual([]);
  });

  it("links only to stable URLs: the docs site or GitHub, never a preview or a pull request", () => {
    const absolute = readmeTargets.filter(target => target.startsWith("https://"));
    expect(absolute.filter(target => /\/pull\/\d+|preview|pr-\d+/i.test(target))).toEqual([]);
  });
});
