/**
 * Packs the core the way `npm publish` does and checks what a consumer gets:
 * the tarball's files and manifest, every entry point importing on stock
 * Node, and their types resolving for a Node ESM TypeScript project under
 * TypeScript 7 and 6.0 (adapters whose tooling still runs on 6.0 type-check
 * against these declarations).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const require = createRequire(import.meta.url);

/**
 * The TypeScript versions a consumer type-checks with: the package's own, and
 * 6.0, installed into the clean project. (Not a dev dependency: an aliased
 * second TypeScript gets hoisted to the repo root, where its `tsc` bin
 * collides with the root's.)
 */
const tscs: Record<string, () => string> = {
  "TypeScript 7": () => join(dirname(require.resolve("typescript/package.json")), "bin", "tsc"),
  "TypeScript 6.0": () => {
    const dir = join(consumer, "typescript6");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify({ private: true }));
    execFileSync(
      "npm",
      ["install", "typescript@~6.0.3", "--prefer-offline", "--no-audit", "--no-fund"],
      { cwd: dir, stdio: "ignore" },
    );
    return join(dir, "node_modules", "typescript", "bin", "tsc");
  },
};

let consumer: string;
let files: string[];
let manifest: {
  name: string;
  exports: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-consumer-"));
  // With lifecycle scripts, as `npm publish` runs them: prepack builds and adds the README and LICENSE.
  const [pack] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
      cwd: packageDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  ) as Array<{ filename: string; files: Array<{ path: string }> }>;
  files = pack!.files.map(file => file.path);

  const installed = join(consumer, "node_modules", "typed-grid-areas");
  mkdirSync(installed, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    join(consumer, pack!.filename),
    "-C",
    installed,
    "--strip-components=1",
  ]);
  manifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed core", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/adapter/index.js",
        "dist/adapter/index.d.ts",
      ]),
    );
    expect(files.filter(path => !path.startsWith("dist/")).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
  });

  it("ships compiled JavaScript and declarations, without specs or test helpers", () => {
    const dist = files.filter(path => path.startsWith("dist/"));
    expect(dist.filter(file => !/\.(js|d\.ts)$/.test(file))).toEqual([]);
    expect(dist.filter(file => /spec|test-utils|test-setup/.test(file))).toEqual([]);
  });

  it("is framework-free: no React or Radix, and no ./react entry", () => {
    const needs = {
      ...manifest.dependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    };
    expect(Object.keys(needs).filter(name => /react|radix/.test(name))).toEqual([]);
    expect(Object.keys(manifest.exports).sort()).toEqual([".", "./adapter"]);
    expect(files.filter(path => path.includes("react"))).toEqual([]);
  });

  it("imports every entry point on stock Node", () => {
    // A child process, since Vitest's own resolver forgives what Node's doesn't.
    const script = `
      const core = await import("typed-grid-areas");
      const adapter = await import("typed-grid-areas/adapter");
      console.log(typeof core.defineLayout, typeof adapter.gridMarkup);
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: consumer,
      encoding: "utf8",
    });
    expect(output.trim()).toBe("function function");
  });

  it.each(Object.entries(tscs))(
    "resolves every entry point's types for a Node ESM consumer on %s",
    (version, installTsc) => {
      const tsc = installTsc();
      expect(execFileSync(process.execPath, [tsc, "--version"], { encoding: "utf8" })).toContain(
        `Version ${version.replace("TypeScript ", "")}`,
      );
      const project = join(consumer, version.replace(/\W/g, ""));
      mkdirSync(project, { recursive: true });
      writeFileSync(
        join(project, "tsconfig.json"),
        JSON.stringify({
          compilerOptions: {
            module: "nodenext",
            moduleResolution: "nodenext",
            target: "es2022",
            lib: ["es2022", "dom"],
            strict: true,
            noEmit: true,
            types: [],
          },
          files: ["consumer.ts"],
        }),
      );
      writeFileSync(join(project, "package.json"), JSON.stringify({ type: "module" }));
      writeFileSync(
        join(project, "consumer.ts"),
        `import { defineLayout } from "typed-grid-areas";
import { gridMarkup, type GridMarkup } from "typed-grid-areas/adapter";

const markup: GridMarkup<"icon" | "title"> = gridMarkup(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
markup.slot("title");
// @ts-expect-error: the definition has no "body" area.
markup.slot("body");

defineLayout({
  areas: ["icon", "title"],
  // @ts-expect-error: the template names an area the definition doesn't have.
  layouts: [{ template: "icon body" }],
});
`,
      );

      let output = "";
      try {
        execFileSync(process.execPath, [tsc, "-p", project, "--pretty", "false"], {
          cwd: project,
          encoding: "utf8",
        });
      } catch (error) {
        output = String((error as { stdout?: string }).stdout ?? error);
      }
      expect(output).toBe("");
    },
    60_000,
  );
});
