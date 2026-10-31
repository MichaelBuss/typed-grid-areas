/**
 * Type-checks every `ts` and `tsx` code block in the README against the
 * source, each as its own module, with `typed-grid-areas`,
 * `typed-grid-areas/react` and `typed-grid-areas/adapter` resolving to `src/`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(__dirname, "..");
const workDir = join(root, "node_modules", ".cache", "typed-grid-areas-readme");
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");

function readmeBlocks(): Array<{ language: string; code: string; line: number }> {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  return Array.from(readme.matchAll(/^```(tsx?)\n([\s\S]*?)^```/gm), match => ({
    language: match[1]!,
    code: match[2]!,
    line: readme.slice(0, match.index).split("\n").length,
  }));
}

describe("the README", () => {
  it("has examples whose code type-checks", () => {
    const blocks = readmeBlocks();
    expect(blocks.length).toBeGreaterThan(0);

    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });
    const files = blocks.map(({ language, code, line }) => {
      const file = `readme-line-${line}.${language}`;
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
        extends: join(root, "tsconfig.json"),
        include: [],
        files,
        compilerOptions: {
          types: ["node"],
          paths: {
            "typed-grid-areas": [join(root, "src", "index.ts")],
            "typed-grid-areas/react": [join(root, "src", "react", "index.ts")],
            "typed-grid-areas/adapter": [join(root, "src", "adapter", "index.ts")],
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
