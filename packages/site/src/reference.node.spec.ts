/**
 * The site links to REFERENCE.md for the API reference (ADR 0007), as of
 * each package's release, not `main`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import GithubSlugger from "github-slugger";
import { examples } from "./examples.ts";
import { referenceLink, referenceSections } from "./reference.ts";
import { repoUrl } from "./site.ts";
import { repoDir } from "./test-utils/tsc.ts";

/** REFERENCE.md without its fenced code blocks, whose `#` lines aren't headings. */
const reference = readFileSync(join(repoDir, "REFERENCE.md"), "utf8").replace(
  /^```[\s\S]*?^```/gm,
  "",
);

/** The anchors GitHub gives REFERENCE.md's headings. */
const anchors = (() => {
  const slugger = new GithubSlugger();
  return Array.from(reference.matchAll(/^#{1,6} (.+)$/gm), match =>
    slugger.slug(match[1]!.replaceAll("`", "")),
  );
})();

const version = (workspace: string): string =>
  JSON.parse(readFileSync(join(repoDir, "packages", workspace, "package.json"), "utf8")).version;

describe("links to REFERENCE.md", () => {
  it("point at the release tag of the package the section documents", () => {
    expect(referenceLink("react")).toBe(
      `${repoUrl}/blob/@typed-grid-areas/react@${version("react")}/REFERENCE.md#rendering-with-react-grid-components`,
    );
    expect(referenceLink("breakpoints")).toBe(
      `${repoUrl}/blob/typed-grid-areas@${version("core")}/REFERENCE.md#breakpoints`,
    );
  });

  it("have a section for every stable adapter", () => {
    for (const { adapter } of examples) {
      expect(referenceSections).toHaveProperty(adapter);
    }
  });

  it("each land on a heading of REFERENCE.md", () => {
    for (const section of Object.keys(referenceSections) as Array<keyof typeof referenceSections>) {
      const anchor = referenceLink(section).split("#")[1];
      expect(anchors, section).toContain(anchor);
    }
  });
});
