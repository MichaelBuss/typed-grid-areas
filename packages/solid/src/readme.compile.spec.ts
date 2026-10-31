/**
 * Type-checks the Solid code blocks in the repo's README (fenced
 * ```` ```tsx solid ````), each as its own module, with
 * `@typed-grid-areas/solid` resolving to this package's `src/` and
 * `typed-grid-areas` (and its `/adapter` entry) to the built core, as a
 * consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const readmePath = resolve(packageDir, "..", "..", "README.md");
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-readme");
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

/** The README's Solid code blocks, with the line each starts on. */
function solidReadmeBlocks(): Array<{ code: string; line: number }> {
  const readme = readFileSync(readmePath, "utf8");
  return Array.from(readme.matchAll(/^```tsx solid\n([\s\S]*?)^```/gm), match => ({
    code: match[1]!,
    line: readme.slice(0, match.index).split("\n").length,
  }));
}

describe("the README's Solid section", () => {
  it("has examples whose code type-checks", () => {
    const blocks = solidReadmeBlocks();
    expect(blocks.length).toBeGreaterThan(0);

    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });
    const files = blocks.map(({ code, line }) => {
      const file = `readme-line-${line}.tsx`;
      // `export {}` keeps each block its own module, even without imports.
      writeFileSync(join(workDir, file), `${code}\nexport {};\n`);
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
            "@typed-grid-areas/solid": [join(packageDir, "src", "index.tsx")],
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
