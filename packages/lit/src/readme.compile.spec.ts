/**
 * Type-checks the README's Lit examples (every code block fenced `ts lit`,
 * which other packages' README checks skip), each as its own module, with
 * `@typed-grid-areas/lit` resolving to this package's `src/` and
 * `typed-grid-areas` to the built core, as a consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const readmePath = resolve(packageDir, "..", "..", "README.md");
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-lit-readme");
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

function litBlocks(): Array<{ code: string; line: number }> {
  const readme = readFileSync(readmePath, "utf8");
  return Array.from(readme.matchAll(/^```ts lit\n([\s\S]*?)^```/gm), match => ({
    code: match[1]!,
    line: readme.slice(0, match.index).split("\n").length,
  }));
}

describe("the README", () => {
  it("has Lit examples whose code type-checks", () => {
    const blocks = litBlocks();
    expect(blocks.length).toBeGreaterThan(0);

    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });
    const files = blocks.map(({ code, line }) => {
      const file = `readme-line-${line}.ts`;
      // Short snippets leave out the import of `defineLayout`.
      const prelude = code.includes('from "typed-grid-areas"')
        ? ""
        : 'import { defineLayout } from "typed-grid-areas";\n';
      // `export {}` keeps each block its own module, even without imports.
      writeFileSync(join(workDir, file), `${prelude}${code}\nexport {};\n`);
      return file;
    });
    writeFileSync(
      join(workDir, "tsconfig.json"),
      JSON.stringify({
        extends: join(packageDir, "tsconfig.json"),
        include: [],
        files,
        compilerOptions: {
          types: ["node"],
          paths: {
            "@typed-grid-areas/lit": [join(packageDir, "src", "index.ts")],
          },
        },
      }),
    );

    let output = "";
    try {
      execFileSync(
        process.execPath,
        [tsc, "-p", join(workDir, "tsconfig.json"), "--pretty", "false"],
        { encoding: "utf8" },
      );
    } catch (error) {
      output = String((error as { stdout?: string }).stdout);
    }
    expect(output).toBe("");
  });
});
