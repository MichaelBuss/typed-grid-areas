import { readFileSync } from "node:fs";
import {
  closesIssue,
  globMatch,
  guidance,
  isShippedPath,
  parseChangeset,
  shippedPaths,
  type ChangesetEntry,
} from "./release-guidance.ts";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  name: string;
  files: string[];
};
const build = JSON.parse(
  readFileSync(new URL("../tsconfig.build.json", import.meta.url), "utf8"),
) as { compilerOptions: { outDir: string }; include: string[]; exclude: string[] };
const shipped = shippedPaths(pkg.files, {
  outDir: build.compilerOptions.outDir,
  include: build.include,
  exclude: build.exclude,
});

describe("shipped paths", () => {
  it("count the sources the build compiles into a shipped directory", () => {
    expect(isShippedPath("src/defineLayout.ts", shipped)).toBe(true);
    expect(isShippedPath("src/engine/derive.ts", shipped)).toBe(true);
    expect(isShippedPath("src/react/gridComponent.tsx", shipped)).toBe(true);
  });

  it("count the files package.json lists, and package.json itself", () => {
    expect(isShippedPath("README.md", shipped)).toBe(true);
    expect(isShippedPath("LICENSE", shipped)).toBe(true);
    expect(isShippedPath("package.json", shipped)).toBe(true);
  });

  it("leave out the sources the build excludes", () => {
    expect(isShippedPath("src/defineLayout.spec.ts", shipped)).toBe(false);
    expect(isShippedPath("src/react/gridComponent.browser.spec.tsx", shipped)).toBe(false);
    expect(isShippedPath("src/test-utils/designs.ts", shipped)).toBe(false);
    expect(isShippedPath("src/test-setup.ts", shipped)).toBe(false);
  });

  it("leave out everything else in the repo", () => {
    expect(isShippedPath("scripts/release.ts", shipped)).toBe(false);
    expect(isShippedPath("docs/adr/0001-derived-layouts-for-optional-areas.md", shipped)).toBe(
      false,
    );
    expect(isShippedPath(".github/workflows/ci.yml", shipped)).toBe(false);
    expect(isShippedPath(".changeset/backfill-21-define-layout.md", shipped)).toBe(false);
    expect(isShippedPath("package-lock.json", shipped)).toBe(false);
  });
});

describe("globMatch", () => {
  it("handles ** and * the way files and tsconfig patterns use them", () => {
    expect(globMatch("src/**/*.ts", "src/index.ts")).toBe(true);
    expect(globMatch("src/**/*.ts", "src/engine/derive.ts")).toBe(true);
    expect(globMatch("**/*.spec.ts", "src/defineLayout.spec.ts")).toBe(true);
    expect(globMatch("**/*.spec.ts", "foo.spec.ts")).toBe(true);
    expect(globMatch("src/test-utils/**", "src/test-utils/designs.ts")).toBe(true);
    expect(globMatch("LICENSE", "LICENSE")).toBe(true);
    expect(globMatch("LICENSE", "src/LICENSE")).toBe(false);
  });
});

describe("parseChangeset", () => {
  it("reads the standard frontmatter form", () => {
    expect(
      parseChangeset(`---
"typed-grid-areas": minor
---
Grids switch layouts at breakpoints measured on their own size container.
`),
    ).toEqual([
      {
        package: "typed-grid-areas",
        kind: "minor",
        note: "Grids switch layouts at breakpoints measured on their own size container.",
      } satisfies ChangesetEntry,
    ]);
  });

  it("accepts an unquoted package name and a multi-line note", () => {
    const entries = parseChangeset(`---
typed-grid-areas: patch
---
First line.

Second line.
`);
    expect(entries[0]?.kind).toBe("patch");
    expect(entries[0]?.note).toMatch(/First line\.\n\nSecond line\./);
  });

  it("leaves out the pr, commit and author lines the changelog turns into links", () => {
    const entries = parseChangeset(`---
"typed-grid-areas": minor
---

pr: #21
commit: 819b12b
author: @MichaelBuss

Layers stack in a template cell.
`);
    expect(entries[0]?.note).toBe("Layers stack in a template cell.");
  });

  it("returns nothing for a file without frontmatter", () => {
    expect(parseChangeset("just some notes")).toEqual([]);
  });
});

describe("closesIssue", () => {
  it("detects the closing keywords, not mere references", () => {
    expect(closesIssue("Closes #54")).toBe(true);
    expect(closesIssue("fixes #12")).toBe(true);
    expect(closesIssue("resolves: #7")).toBe(true);
    expect(closesIssue("Closed #3 in that PR")).toBe(true);
    expect(closesIssue("Fixed #9")).toBe(true);
    expect(closesIssue("refs #12")).toBe(false);
    expect(closesIssue("")).toBe(false);
  });
});

describe("guidance", () => {
  function guidanceMarkdown(input: {
    changedFiles: readonly string[];
    changesets: readonly ChangesetEntry[];
    body: string;
  }): string {
    return guidance({
      changedFiles: input.changedFiles,
      shipped,
      package: pkg.name,
      changesets: input.changesets,
      closesIssue: closesIssue(input.body),
    }).markdown;
  }

  it("shows the bump and the note for a shipped change with a changeset", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["src/generateCss.ts"],
      changesets: [{ package: pkg.name, kind: "minor", note: "Hidden areas stay hidden." }],
      body: "Closes #54",
    });
    expect(markdown).toMatch(/src\/generateCss\.ts/);
    expect(markdown).toMatch(/minor/);
    expect(markdown).toMatch(/Hidden areas stay hidden\./);
    expect(markdown).not.toMatch(/No changeset/);
    expect(markdown).not.toMatch(/doesn't close an issue/);
  });

  it("says what won't ship, and how to add a changeset, for a shipped change without one", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["src/index.ts"],
      changesets: [],
      body: "",
    });
    expect(markdown).toMatch(/No changeset/);
    expect(markdown).toMatch(/npm run changeset/);
    expect(markdown).toMatch(/Assumed bump.*\*\*patch\*\*/);
  });

  it("needs no changeset when nothing shipped changes, and says so", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["src/defineLayout.spec.ts", "docs/adr/0003-hidden-areas-are-important.md"],
      changesets: [],
      body: "",
    });
    expect(markdown).toMatch(/No shipped files/);
    expect(markdown).toMatch(/No changeset/);
    expect(markdown).toMatch(/none needed/);
  });

  it("nudges, never gates, when the body closes no issue", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["src/index.ts"],
      changesets: [{ package: pkg.name, kind: "patch", note: "Fix." }],
      body: "just a fix",
    });
    expect(markdown).toMatch(/Closes #\d+/);
    expect(markdown).toMatch(/nudge/i);
  });
});
