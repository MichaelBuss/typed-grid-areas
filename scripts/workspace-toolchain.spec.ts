/**
 * The root's build, test, test:browser and typecheck scripts (which the
 * justfile runs) on a stand-in monorepo with the repo's own root scripts:
 * each workspace's own script runs, with the tools from the workspace's own
 * dev dependencies ahead of the root's, and a workspace without the script
 * is skipped.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const repo = resolve(__dirname, "..");
let root: string;

function write(path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

/** A stand-in for an installed tool's bin that says which install it is. */
function bin(path: string, says: string): void {
  write(path, `#!/bin/sh\necho "${says}: $*"\n`);
  chmodSync(join(root, path), 0o755);
}

function manifest(name: string, scripts: Record<string, string>): string {
  return JSON.stringify({ name, version: "1.0.0", private: true, scripts });
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "typed-grid-areas-toolchain-"));
  const { workspaces, scripts } = JSON.parse(readFileSync(join(repo, "package.json"), "utf8"));
  write("package.json", JSON.stringify({ name: "monorepo", private: true, workspaces, scripts }));
  bin("node_modules/.bin/tsc", "root tsc");
  bin("node_modules/.bin/vitest", "root vitest");

  const toolchain = {
    build: "tsc -p tsconfig.build.json",
    test: "vitest run --project unit",
    "test:browser": "vitest run --project browser",
    typecheck: "tsc --noEmit",
  };
  write("packages/core/package.json", manifest("typed-grid-areas", toolchain));
  // An adapter whose tooling needs TypeScript 6 pins it in its own devDependencies.
  write("packages/angular/package.json", manifest("@typed-grid-areas/angular", toolchain));
  bin("packages/angular/node_modules/.bin/tsc", "angular's own tsc");
  write("packages/docs/package.json", manifest("@typed-grid-areas/docs", {}));
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function run(script: string): string {
  return execFileSync("npm", ["run", script], { cwd: root, encoding: "utf8" });
}

describe("the root scripts", () => {
  it("build every workspace with its own build script, the core first", () => {
    const output = run("build");
    const core = output.indexOf("root tsc: -p tsconfig.build.json");
    const angular = output.indexOf("angular's own tsc: -p tsconfig.build.json");
    expect(core).toBeGreaterThan(-1);
    expect(angular).toBeGreaterThan(core);
  });

  it("type-check every workspace with its own TypeScript, after building the core", () => {
    const output = run("typecheck");
    expect(output).toContain("angular's own tsc: --noEmit");
    expect(output.match(/root tsc: --noEmit/g)).toHaveLength(2); // the root's scripts, and the core
    expect(output.indexOf("root tsc: -p tsconfig.build.json")).toBeLessThan(
      output.indexOf("angular's own tsc: --noEmit"),
    );
  });

  it("run every workspace's tests, and the root's own", () => {
    expect(run("test").match(/root vitest: run --project unit/g)).toHaveLength(2);
    expect(run("test:browser").match(/root vitest: run --project browser/g)).toHaveLength(2);
  });

  it("skip a workspace without the script", () => {
    for (const script of ["build", "typecheck", "test", "test:browser"]) {
      expect(run(script)).not.toMatch(/@typed-grid-areas\/docs/);
    }
  });
});
