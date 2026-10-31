/**
 * The Version Packages flow on the repo's own workspaces and Changesets
 * config: pending changesets for two packages bump each independently, the
 * lockfile follows, and the release script's dry run would publish both.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { releaseCli, type NpmVersions } from "./release.ts";
import { syncVersionCli, type Lockfile } from "./sync-version.ts";
import { readWorkspaces } from "./workspaces.ts";

const repo = resolve(__dirname, "..");
const changesetBin = join(
  dirname(createRequire(import.meta.url).resolve("@changesets/cli/package.json")),
  "bin.js",
);

type Manifest = {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
};

let root: string;

function read<T>(path: string): T {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as T;
}

function write(path: string, value: unknown): void {
  writeFileSync(
    join(root, path),
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "typed-grid-areas-version-"));
  // The repo's manifests, lockfile and Changesets config; none of its pending changesets.
  for (const file of ["package.json", "package-lock.json", ".changeset/config.json"]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    cpSync(join(repo, file), join(root, file));
  }
  for (const { dir } of readWorkspaces(repo)) {
    mkdirSync(join(root, dir), { recursive: true });
    cpSync(join(repo, dir, "package.json"), join(root, dir, "package.json"));
  }
  // No GitHub lookups for the changelog in a test.
  write(".changeset/config.json", { ...read<object>(".changeset/config.json"), changelog: false });

  // Known starting versions, whatever the repo's are today.
  const core = read<Manifest>("packages/core/package.json");
  write("packages/core/package.json", { ...core, version: "1.4.2" });
  const react = read<Manifest>("packages/react/package.json");
  write("packages/react/package.json", {
    ...react,
    version: "0.3.0",
    dependencies: { ...react.dependencies, "typed-grid-areas": "^1.4.2" },
  });

  write(".changeset/core-feature.md", '---\n"typed-grid-areas": minor\n---\n\nA core feature.\n');
  write(".changeset/react-fix.md", '---\n"@typed-grid-areas/react": patch\n---\n\nA React fix.\n');
  execFileSync(process.execPath, [changesetBin, "version"], { cwd: root, stdio: "ignore" });
}, 60_000);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("changeset version", () => {
  it("bumps each package by its own changesets", () => {
    expect(read<Manifest>("packages/core/package.json").version).toBe("1.5.0");
    expect(read<Manifest>("packages/react/package.json").version).toBe("0.3.1");
  });

  it("moves the React adapter's core range to the core it's released with", () => {
    expect(read<Manifest>("packages/react/package.json").dependencies!["typed-grid-areas"]).toBe(
      "^1.5.0",
    );
  });

  it("leaves the private acceptance-test workspace alone", () => {
    const acceptance = read<Manifest>("packages/acceptance/package.json");
    expect(acceptance.private).toBe(true);
    expect(acceptance.version).toBe("0.0.0");
  });

  it("is followed by a lockfile that agrees with every workspace", async () => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await syncVersionCli(root);
    vi.restoreAllMocks();
    const lock = read<Lockfile>("package-lock.json");
    expect(lock.packages!["packages/core"]!.version).toBe("1.5.0");
    expect(lock.packages!["packages/react"]).toMatchObject({
      version: "0.3.1",
      dependencies: { "typed-grid-areas": "^1.5.0" },
    });
  });
});

describe("the release script's dry run after it", () => {
  it("would publish both packages, each with its own tag", async () => {
    // Every other package (each further adapter) already has its current version on npm.
    const npm: Record<string, NpmVersions> = {
      ...Object.fromEntries(readWorkspaces(root).map(({ name, version }) => [name, [version]])),
      "typed-grid-areas": ["1.4.2"],
      "@typed-grid-areas/react": ["0.3.0"],
    };
    let output = "";
    const status = await releaseCli({
      root,
      dryRun: true,
      npmVersions: async name => npm[name] ?? "unpublished",
      write: text => {
        output += text;
      },
    });
    expect(output).toContain(
      "Would publish typed-grid-areas@1.5.0 from packages/core, tagged typed-grid-areas@1.5.0.",
    );
    expect(output).toContain(
      "Would publish @typed-grid-areas/react@0.3.1 from packages/react, tagged @typed-grid-areas/react@0.3.1.",
    );
    expect(output).not.toContain("acceptance");
    expect(status).toBe(0);
  });
});
