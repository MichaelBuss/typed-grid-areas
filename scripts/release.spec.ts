import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isNpmAlreadyPublished,
  isNpmSetupError,
  npmSetupInstructions,
  planRelease,
  releaseCli,
  type NpmVersions,
} from "./release.ts";
import type { Workspace } from "./workspaces.ts";

function workspace(overrides: Partial<Workspace> & Pick<Workspace, "name" | "dir">): Workspace {
  return { version: "0.1.0", private: false, publishDirectory: undefined, ...overrides };
}

const core = workspace({ name: "typed-grid-areas", dir: "packages/core", version: "0.2.0" });
const react = workspace({
  name: "@typed-grid-areas/react",
  dir: "packages/react",
  version: "0.1.0",
});
const acceptance = workspace({
  name: "@typed-grid-areas/acceptance",
  dir: "packages/acceptance",
  version: "0.0.0",
  private: true,
});

describe("planRelease", () => {
  it("publishes every package whose version npm doesn't have, in workspace order, tagged <name>@<version>", () => {
    const npm = new Map<string, NpmVersions>([
      ["typed-grid-areas", ["0.1.0"]],
      ["@typed-grid-areas/react", ["0.0.0"]],
    ]);
    expect(planRelease([core, react], npm)).toEqual([
      {
        action: "publish",
        name: "typed-grid-areas",
        version: "0.2.0",
        directory: "packages/core",
        tag: "typed-grid-areas@0.2.0",
      },
      {
        action: "publish",
        name: "@typed-grid-areas/react",
        version: "0.1.0",
        directory: "packages/react",
        tag: "@typed-grid-areas/react@0.1.0",
      },
    ]);
  });

  it("publishes a workspace's declared build folder instead of the workspace", () => {
    const angular = workspace({
      name: "@typed-grid-areas/angular",
      dir: "packages/angular",
      publishDirectory: "dist",
    });
    expect(planRelease([angular], new Map([["@typed-grid-areas/angular", ["0.0.0"]]]))).toEqual([
      expect.objectContaining({ action: "publish", directory: "packages/angular/dist" }),
    ]);
  });

  it("skips a version npm already has, still making sure of its tag", () => {
    expect(planRelease([core], new Map([["typed-grid-areas", ["0.1.0", "0.2.0"]]]))).toEqual([
      { action: "skip", name: "typed-grid-areas", version: "0.2.0", tag: "typed-grid-areas@0.2.0" },
    ]);
  });

  it("never publishes a private workspace", () => {
    expect(planRelease([acceptance], new Map())).toEqual([]);
  });

  it("asks for a placeholder for a package npm has never seen", () => {
    expect(planRelease([react], new Map([["@typed-grid-areas/react", "unpublished"]]))).toEqual([
      { action: "placeholder", name: "@typed-grid-areas/react", version: "0.1.0" },
    ]);
  });
});

describe("npm errors", () => {
  it("count registry rejections a human must fix as setup errors", () => {
    expect(isNpmSetupError("npm error 404 Not Found - Package name not found")).toBe(true);
    expect(isNpmSetupError("npm error 403 Forbidden - You do not have permission to publish")).toBe(
      true,
    );
    expect(isNpmSetupError("npm error code ENEEDAUTH")).toBe(true);
    expect(isNpmSetupError("npm error 402 Payment Required")).toBe(true);
  });

  it("don't count transient failures as setup errors", () => {
    expect(isNpmSetupError("npm error network ECONNRESET")).toBe(false);
    expect(isNpmSetupError("npm error ETIMEDOUT")).toBe(false);
    expect(isNpmSetupError("npm error 500 Internal Server Error")).toBe(false);
  });

  it("recognize an already-published race instead of misreading it as setup", () => {
    const stderr =
      "npm error 409 Conflict - Cannot publish over the previously published versions: 0.2.0.";
    expect(isNpmAlreadyPublished(stderr)).toBe(true);
    expect(isNpmSetupError(stderr)).toBe(false);
  });
});

describe("npmSetupInstructions", () => {
  describe("for packages npm refused to publish", () => {
    const text = npmSetupInstructions({
      placeholders: [],
      trustedPublishing: ["typed-grid-areas"],
    });

    it("name each package, trusted publishing, the workflow and the re-run", () => {
      expect(text).toMatch(/npmjs\.com/);
      expect(text).toMatch(/`typed-grid-areas`/);
      expect(text).toMatch(/trusted publishing/i);
      expect(text).toMatch(/MichaelBuss\/typed-grid-areas/);
      expect(text).toMatch(/\.github\/workflows\/publish\.yml/);
      expect(text).toMatch(/re-run/i);
    });

    it("ask for no scope, since the package is unscoped", () => {
      expect(text).not.toMatch(/scope|organisation/i);
    });
  });

  describe("for packages npm has never seen", () => {
    const text = npmSetupInstructions({
      placeholders: ["@typed-grid-areas/react", "@typed-grid-areas/vue"],
      trustedPublishing: ["typed-grid-areas"],
    });

    it("have a placeholder of each published once by hand, then trusted publishing configured", () => {
      for (const name of ["@typed-grid-areas/react", "@typed-grid-areas/vue"]) {
        expect(text).toContain(`"name": "${name}"`);
      }
      expect(text).toContain("npm publish --access public");
      const placeholder = text.indexOf("npm publish --access public");
      const trusted = text.search(/configure \*\*Trusted Publishing\*\*/);
      expect(placeholder).toBeGreaterThan(-1);
      expect(trusted).toBeGreaterThan(placeholder);
    });

    it("name every package that needs trusted publishing configured", () => {
      const trusted = text.slice(text.search(/configure \*\*Trusted Publishing\*\*/));
      for (const name of ["typed-grid-areas", "@typed-grid-areas/react", "@typed-grid-areas/vue"]) {
        expect(trusted).toContain(`\`${name}\``);
      }
    });

    it("start with the npm organisation the scoped packages need", () => {
      expect(text).toMatch(/`@typed-grid-areas` organisation/);
    });
  });
});

describe("the release script's dry run", () => {
  let root: string;
  let output: string;

  function writeJson(path: string, value: unknown): void {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(value));
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "typed-grid-areas-release-"));
    output = "";
    writeJson("package.json", {
      name: "monorepo",
      private: true,
      workspaces: ["packages/core", "packages/*"],
    });
    writeJson("packages/core/package.json", { name: "typed-grid-areas", version: "0.2.0" });
    writeJson("packages/angular/package.json", {
      name: "@typed-grid-areas/angular",
      version: "0.1.0",
      publishConfig: { directory: "dist" },
    });
    writeJson("packages/acceptance/package.json", {
      name: "@typed-grid-areas/acceptance",
      version: "0.0.0",
      private: true,
    });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function dryRun(npm: Record<string, NpmVersions>): Promise<number> {
    return releaseCli({
      root,
      dryRun: true,
      npmVersions: async name => npm[name] ?? [],
      write: text => {
        output += text;
      },
    });
  }

  it("says what it would publish, from which folder, without publishing", async () => {
    const status = await dryRun({
      "typed-grid-areas": ["0.1.0"],
      "@typed-grid-areas/angular": ["0.0.0"],
    });
    expect(status).toBe(0);
    expect(output).toContain(
      "Would publish typed-grid-areas@0.2.0 from packages/core, tagged typed-grid-areas@0.2.0",
    );
    expect(output).toContain(
      "Would publish @typed-grid-areas/angular@0.1.0 from packages/angular/dist, tagged @typed-grid-areas/angular@0.1.0",
    );
    expect(output).not.toMatch(/acceptance/);
  });

  it("fails with placeholder instructions for a package npm has never seen", async () => {
    const status = await dryRun({
      "typed-grid-areas": ["0.1.0"],
      "@typed-grid-areas/angular": "unpublished",
    });
    expect(status).toBe(1);
    expect(output).toContain("Would publish typed-grid-areas@0.2.0");
    expect(output).toContain('"name": "@typed-grid-areas/angular"');
    expect(output).toContain("npm publish --access public");
  });
});
