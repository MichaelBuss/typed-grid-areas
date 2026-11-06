/**
 * What every published package's npm page shows: its `homepage`, its
 * `keywords`, and the repo's README as the page's body. npmjs.com only
 * updates at publish time and doesn't resolve the README's relative links,
 * so those links are absolute, and point at the docs site or GitHub.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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

/** The README without its fenced code blocks, whose `<img src>` is example code, not a link. */
const readmeProse = readFileSync(join(repo, "README.md"), "utf8").replace(/^```[\s\S]*?^```/gm, "");

/** Every link and image target in the README's prose: Markdown, reference definitions and HTML. */
const readmeTargets = [
  ...Array.from(readmeProse.matchAll(/\]\(([^)\s]+)/g), match => match[1]!),
  ...Array.from(readmeProse.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/gm), match => match[1]!),
  ...Array.from(readmeProse.matchAll(/\b(?:href|src)=["']([^"']+)/g), match => match[1]!),
];

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
  it("links to the docs site and its Try it page above Install", () => {
    const intro = readmeProse.slice(0, readmeProse.indexOf("\n## Install"));
    expect(intro).toContain(`](${docsSite})`);
    expect(intro).toContain(`](${tryIt})`);
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
