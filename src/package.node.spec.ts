/**
 * Builds the package the way `npm pack` does and checks what a consumer gets:
 * the tarball's files, both entry points importing on stock Node, and their
 * types resolving for a Node ESM TypeScript project.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(__dirname, "..");
const dist = join(root, "dist");
const consumer = join(root, "node_modules", ".cache", "typed-grid-areas-consumer");
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name).slice(dir.length + 1));
}

beforeAll(() => {
  rmSync(dist, { recursive: true, force: true });
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.build.json"], { cwd: root });
}, 60_000);

describe("the packed package", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    const [pack] = JSON.parse(
      execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as Array<{ files: Array<{ path: string }> }>;
    const paths = pack!.files.map(file => file.path);

    expect(paths).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/react/index.js",
        "dist/react/index.d.ts",
      ]),
    );
    expect(paths.filter(path => !path.startsWith("dist/")).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
  });

  it("ships compiled JavaScript and declarations, without specs or test helpers", () => {
    const files = filesUnder(dist);
    expect(files.filter(file => !/\.(js|d\.ts)$/.test(file))).toEqual([]);
    expect(files.filter(file => /spec|test-utils|test-setup/.test(file))).toEqual([]);
  });

  it("imports both entry points on stock Node", () => {
    // A child process, since Vitest's own resolver forgives what Node's doesn't.
    const script = `
      const core = await import(${JSON.stringify(pathToFileURL(join(dist, "index.js")).href)});
      const react = await import(${JSON.stringify(pathToFileURL(join(dist, "react", "index.js")).href)});
      console.log(typeof core.defineLayout, typeof react.createGridComponent);
    `;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
    });
    expect(output.trim()).toBe("function function");
  });

  it("resolves both entry points' types for a Node ESM TypeScript consumer", () => {
    rmSync(consumer, { recursive: true, force: true });
    mkdirSync(join(consumer, "node_modules"), { recursive: true });
    symlinkSync(root, join(consumer, "node_modules", "typed-grid-areas"), "dir");
    writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
    writeFileSync(
      join(consumer, "tsconfig.json"),
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
    writeFileSync(
      join(consumer, "consumer.ts"),
      `import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "typed-grid-areas/react";

const Card = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
Card.title;
// @ts-expect-error: the definition has no "body" area.
Card.body;
`,
    );

    let output = "";
    try {
      execFileSync(process.execPath, [tsc, "-p", consumer, "--pretty", "false"], {
        cwd: consumer,
        encoding: "utf8",
      });
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? error);
    }
    expect(output).toBe("");
  });
});
