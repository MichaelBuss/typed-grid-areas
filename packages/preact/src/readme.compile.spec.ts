/**
 * Type-checks every Preact code block in the repo's README (fenced
 * ` ```tsx preact `), each as its own module, with `@typed-grid-areas/preact`
 * resolving to this package's `src/` and `typed-grid-areas` (and its
 * `/adapter` entry) to the built core, as a consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { preactReadmeBlocks } from "./test-utils/readmeBlocks.ts";

const packageDir = resolve(__dirname, "..");
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-readme");
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

describe("the README", () => {
  it("has Preact examples whose code type-checks", () => {
    const blocks = preactReadmeBlocks();
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
            "@typed-grid-areas/preact": [join(packageDir, "src", "index.ts")],
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
