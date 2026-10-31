import { resolve } from "node:path";
import {
  closesIssue,
  globMatch,
  guidance,
  isShippedPath,
  parseChangeset,
  shippingPackages,
  type ChangesetEntry,
} from "./release-guidance.ts";

const packages = shippingPackages(resolve(__dirname, ".."));
const shipping = (file: string) =>
  packages.filter(({ shipped }) => isShippedPath(file, shipped)).map(({ name }) => name);

describe("shipped paths", () => {
  it("count the sources each package's build compiles into a shipped directory", () => {
    expect(shipping("packages/core/src/defineLayout.ts")).toEqual(["typed-grid-areas"]);
    expect(shipping("packages/core/src/engine/derive.ts")).toEqual(["typed-grid-areas"]);
    expect(shipping("packages/react/src/gridComponent.tsx")).toEqual(["@typed-grid-areas/react"]);
  });

  it("count each package's package.json, and the repo's README.md and LICENSE for every package", () => {
    expect(shipping("packages/core/package.json")).toEqual(["typed-grid-areas"]);
    expect(shipping("packages/react/package.json")).toEqual(["@typed-grid-areas/react"]);
    const everyPackage = packages.map(({ name }) => name);
    expect(everyPackage).toEqual(
      expect.arrayContaining(["typed-grid-areas", "@typed-grid-areas/react"]),
    );
    expect(shipping("README.md")).toEqual(everyPackage);
    expect(shipping("LICENSE")).toEqual(everyPackage);
  });

  it("leave out the sources the builds exclude", () => {
    expect(shipping("packages/core/src/defineLayout.spec.ts")).toEqual([]);
    expect(shipping("packages/react/src/gridComponent.browser.spec.tsx")).toEqual([]);
    expect(shipping("packages/react/src/test-utils/mountGrid.tsx")).toEqual([]);
    expect(shipping("packages/react/src/test-setup.ts")).toEqual([]);
  });

  it("count the source a source-published package lists in files, and nothing else of it", () => {
    expect(shipping("packages/octane/src/gridComponent.tsx")).toEqual(["@typed-grid-areas/octane"]);
    expect(shipping("packages/octane/src/render.browser.spec.tsx")).toEqual([]);
    expect(shipping("packages/octane/src/test-utils/RenderedAs.tsrx")).toEqual([]);
  });

  it("never count a private workspace", () => {
    expect(shipping("packages/acceptance/src/designs.ts")).toEqual([]);
    expect(shipping("packages/acceptance/package.json")).toEqual([]);
  });

  it("leave out everything else in the repo", () => {
    for (const file of [
      "scripts/release.ts",
      "docs/adr/0001-derived-layouts-for-optional-areas.md",
      ".github/workflows/ci.yml",
      ".changeset/backfill-21-define-layout.md",
      "package.json",
      "package-lock.json",
      "packages/core/vitest.config.ts",
    ]) {
      expect(shipping(file), file).toEqual([]);
    }
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
      packages,
      changesets: input.changesets,
      closesIssue: closesIssue(input.body),
    }).markdown;
  }

  it("shows the bump and the note for a shipped change with a changeset", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["packages/core/src/generateCss.ts"],
      changesets: [
        { package: "typed-grid-areas", kind: "minor", note: "Hidden areas stay hidden." },
      ],
      body: "Closes #54",
    });
    expect(markdown).toMatch(/packages\/core\/src\/generateCss\.ts/);
    expect(markdown).toMatch(/minor/);
    expect(markdown).toMatch(/Hidden areas stay hidden\./);
    expect(markdown).not.toMatch(/No changeset/);
    expect(markdown).not.toMatch(/doesn't close an issue/);
  });

  it("says what won't ship, and how to add a changeset, for a shipped change without one", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["packages/core/src/index.ts"],
      changesets: [],
      body: "",
    });
    expect(markdown).toMatch(/No changeset/);
    expect(markdown).toMatch(/npm run changeset/);
    expect(markdown).toMatch(/Assumed bump.*\*\*patch\*\*/);
  });

  it("says, per package, which shipped changes have a changeset and which don't", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["packages/core/src/index.ts", "packages/react/src/gridComponent.tsx"],
      changesets: [{ package: "typed-grid-areas", kind: "patch", note: "Fix." }],
      body: "Closes #1",
    });
    const [core, react] = markdown.split("### ").slice(1);
    expect(core).toMatch(/^`typed-grid-areas`/);
    expect(core).toMatch(/\*\*patch\*\* — Fix\./);
    expect(core).not.toMatch(/No changeset/);
    expect(react).toMatch(/^`@typed-grid-areas\/react`/);
    expect(react).toMatch(/packages\/react\/src\/gridComponent\.tsx/);
    expect(react).toMatch(/No changeset yet/);
  });

  it("needs no changeset when nothing shipped changes, and says so", () => {
    const markdown = guidanceMarkdown({
      changedFiles: [
        "packages/core/src/defineLayout.spec.ts",
        "docs/adr/0003-hidden-areas-are-important.md",
      ],
      changesets: [],
      body: "",
    });
    expect(markdown).toMatch(/No shipped files/);
    expect(markdown).toMatch(/No changeset/);
    expect(markdown).toMatch(/none needed/);
  });

  it("nudges, never gates, when the body closes no issue", () => {
    const markdown = guidanceMarkdown({
      changedFiles: ["packages/core/src/index.ts"],
      changesets: [{ package: "typed-grid-areas", kind: "patch", note: "Fix." }],
      body: "just a fix",
    });
    expect(markdown).toMatch(/Closes #\d+/);
    expect(markdown).toMatch(/nudge/i);
  });
});
