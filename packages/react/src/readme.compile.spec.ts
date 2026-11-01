/**
 * Type-checks every `ts` and `tsx` code block in the repo's README and in the
 * agent skill (`skills/typed-grid-areas/`), each as its own module, with
 * `@typed-grid-areas/react` resolving to this package's `src/` and
 * `typed-grid-areas` (and its `/adapter` entry) to the built core, as a
 * consumer gets them.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const repoDir = resolve(packageDir, "..", "..");
const readmePath = join(repoDir, "README.md");
const skillDir = join(repoDir, "skills", "typed-grid-areas");
const cacheDir = join(packageDir, "node_modules", ".cache");
const tsc = join(
  dirname(createRequire(import.meta.url).resolve("typescript/package.json")),
  "bin",
  "tsc",
);

function markdownBlocks(path: string): Array<{ language: string; code: string; line: number }> {
  const markdown = readFileSync(path, "utf8");
  return Array.from(markdown.matchAll(/^```(tsx?)\n([\s\S]*?)^```/gm), match => ({
    language: match[1]!,
    code: match[2]!,
    line: markdown.slice(0, match.index).split("\n").length,
  }));
}

/** tsc's output for every block of the given Markdown files, each as its own module: empty when all type-check. */
function typeCheckBlocks(cacheName: string, paths: ReadonlyArray<string>): string {
  const workDir = join(cacheDir, `typed-grid-areas-${cacheName}`);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  const files = paths.flatMap(path => {
    const blocks = markdownBlocks(path);
    expect(blocks.length, `${path} has code blocks`).toBeGreaterThan(0);
    return blocks.map(({ language, code, line }) => {
      const file = `${basename(path, ".md")}-line-${line}.${language}`;
      // Short snippets leave out the import of `defineLayout`.
      const prelude = code.includes('from "typed-grid-areas"')
        ? ""
        : 'import { defineLayout } from "typed-grid-areas";\n';
      // `export {}` keeps each block its own module, even without imports.
      writeFileSync(join(workDir, file), `${prelude}${code}\nexport {};\n`);
      return file;
    });
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
          "@typed-grid-areas/react": [join(packageDir, "src", "index.ts")],
        },
      },
    }),
  );

  try {
    execFileSync(
      process.execPath,
      [tsc, "-p", join(workDir, "tsconfig.json"), "--pretty", "false"],
      { encoding: "utf8" },
    );
    return "";
  } catch (error) {
    return String((error as { stdout?: string }).stdout);
  }
}

describe("the README", () => {
  it("has examples whose code type-checks", () => {
    expect(typeCheckBlocks("readme", [readmePath])).toBe("");
  });
});

describe("the agent skill", () => {
  it("has examples whose code type-checks, in every file", () => {
    const paths = readdirSync(skillDir)
      .filter(file => file.endsWith(".md"))
      .map(file => join(skillDir, file));
    expect(paths.map(path => basename(path))).toContain("SKILL.md");
    expect(typeCheckBlocks("skill", paths)).toBe("");
  });
});
