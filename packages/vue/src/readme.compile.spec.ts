/**
 * Type-checks the Vue examples of the repo's README and REFERENCE.md with vue-tsc: every `vue` code
 * block, as its own single-file component, and every `js` block importing
 * `@typed-grid-areas/vue`, with the package resolving to this `src/` and
 * `typed-grid-areas` to the built core, as a consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const markdownPaths = ["README.md", "REFERENCE.md"].map(file =>
  resolve(packageDir, "..", "..", file),
);
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-readme");
const vueTsc = join(packageDir, "scripts", "vue-tsc.cjs");

function readmeBlocks(): Array<{ language: string; code: string; file: string; line: number }> {
  return markdownPaths.flatMap(path => {
    const markdown = readFileSync(path, "utf8");
    return Array.from(markdown.matchAll(/^```(vue|js)\n([\s\S]*?)^```/gm), match => ({
      language: match[1]!,
      code: match[2]!,
      file: basename(path, ".md"),
      line: markdown.slice(0, match.index).split("\n").length,
    })).filter(
      ({ language, code }) => language === "vue" || code.includes('from "@typed-grid-areas/vue"'),
    );
  });
}

describe("the Vue examples of the README and REFERENCE.md", () => {
  it("type-check with vue-tsc", () => {
    const blocks = readmeBlocks();
    expect(blocks.filter(({ language }) => language === "vue").length).toBeGreaterThan(0);
    expect(blocks.filter(({ language }) => language === "js").length).toBeGreaterThan(0);

    rmSync(workDir, { recursive: true, force: true });
    mkdirSync(workDir, { recursive: true });
    const files = blocks.map(({ language, code, file: markdown, line }) => {
      const file = `${markdown}-line-${line}.${language}`;
      writeFileSync(join(workDir, file), code);
      return file;
    });
    writeFileSync(
      join(workDir, "tsconfig.json"),
      JSON.stringify({
        extends: join(packageDir, "tsconfig.json"),
        include: [],
        files,
        compilerOptions: {
          allowJs: true,
          checkJs: true,
          types: ["node"],
          paths: { "@typed-grid-areas/vue": [join(packageDir, "src", "index.ts")] },
        },
      }),
    );

    let output = "";
    try {
      execFileSync(
        process.execPath,
        [vueTsc, "-p", join(workDir, "tsconfig.json"), "--pretty", "false"],
        { cwd: packageDir, encoding: "utf8" },
      );
    } catch (error) {
      output = String((error as { stdout?: string }).stdout);
    }
    expect(output).toBe("");
  }, 60_000);
});
