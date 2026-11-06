/**
 * The site links to the README for the API reference (ADR 0007), at the
 * README as of each package's release, not `main`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { readmeLink, readmeSections } from "./readme.ts";
import { repoDir } from "./test-utils/tsc.ts";

const readme = readFileSync(join(repoDir, "README.md"), "utf8");

/** The anchors GitHub gives the README's headings. */
const anchors = (() => {
  const slugger = new GithubSlugger();
  return Array.from(readme.matchAll(/^#{1,6} (.+)$/gm), match =>
    slugger.slug(match[1]!.replaceAll("`", "")),
  );
})();

const version = (workspace: string): string =>
  JSON.parse(readFileSync(join(repoDir, "packages", workspace, "package.json"), "utf8")).version;

describe("links to the README", () => {
  it("point at the release tag of the package the section documents", () => {
    expect(readmeLink("react")).toBe(
      `https://github.com/MichaelBuss/typed-grid-areas/blob/@typed-grid-areas/react@${version("react")}/README.md#rendering-with-react-grid-components`,
    );
    expect(readmeLink("breakpoints")).toBe(
      `https://github.com/MichaelBuss/typed-grid-areas/blob/typed-grid-areas@${version("core")}/README.md#breakpoints`,
    );
  });

  it("have a section for every stable adapter", () => {
    for (const adapter of ["react", "vue", "svelte", "solid", "preact", "angular", "lit"]) {
      expect(readmeSections).toHaveProperty(adapter);
    }
  });

  it("each land on a heading of the README", () => {
    for (const section of Object.keys(readmeSections) as Array<keyof typeof readmeSections>) {
      const anchor = readmeLink(section).split("#")[1];
      expect(anchors, section).toContain(anchor);
    }
  });
});
