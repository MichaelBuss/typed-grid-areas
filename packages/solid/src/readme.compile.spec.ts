/**
 * Type-checks the Solid code blocks in the repo's README and REFERENCE.md (fenced
 * ```` ```tsx solid ````), each as its own module, with
 * `@typed-grid-areas/solid` resolving to this package's `src/` and
 * `typed-grid-areas` (and its `/adapter` entry) to the built core, as a
 * consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const markdownPaths = ["README.md", "REFERENCE.md"].map(file =>
  resolve(packageDir, "..", "..", file),
);
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-readme");
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

/** The Solid code blocks of the README and REFERENCE.md, with the file and line each starts on. */
function solidReadmeBlocks(): Array<{ code: string; file: string; line: number }> {
  return markdownPaths.flatMap(path => {
    const markdown = readFileSync(path, "utf8");
    return Array.from(markdown.matchAll(/^```tsx solid\n([\s\S]*?)^```/gm), match => ({
      code: match[1]!,
      file: basename(path, ".md"),
      line: markdown.slice(0, match.index).split("\n").length,
    }));
  });
}

describe("the Solid examples of the README and REFERENCE.md", () => {
  it("type-check", () => {
    const blocks = solidReadmeBlocks();
    expect(blocks.length).toBeGreaterThan(0);

    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });
    const files = blocks.map(({ code, file: markdown, line }) => {
      const file = `${markdown}-line-${line}.tsx`;
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
