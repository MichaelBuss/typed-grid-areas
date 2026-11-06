/**
 * Type-checks every `ts` and `tsx` code block on the site's pages, each as
 * its own module, the way the README's are checked: `typed-grid-areas`
 * resolves to the built core, as a consumer gets it, and an adapter to its
 * package's `src/`, checked with that package's own compiler options.
 * Angular blocks compile with Angular's compiler (`ngc`, `strictTemplates`),
 * so their templates are checked too.
 *
 * A block's info string names its framework after the language, as in the
 * README: ` ```tsx ` is React (or no framework), and ` ```tsx preact `,
 * ` ```tsx solid `, ` ```ts lit ` and ` ```ts angular ` are those adapters.
 * A block can import the example designs from `./designs`, which re-exports
 * `@typed-grid-areas/acceptance/designs`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { repoDir, repoTsc, siteDir } from "./test-utils/tsc.ts";

const docsDir = join(siteDir, "src", "content", "docs");
const cacheDir = join(siteDir, "node_modules", ".cache", "typed-grid-areas-code-blocks");

/** Each framework a block can be written for, and the adapter package that checks it. */
const frameworks = {
  react: { adapter: "@typed-grid-areas/react", workspace: "react" },
  preact: { adapter: "@typed-grid-areas/preact", workspace: "preact" },
  solid: { adapter: "@typed-grid-areas/solid", workspace: "solid" },
  lit: { adapter: "@typed-grid-areas/lit", workspace: "lit" },
  angular: { adapter: "@typed-grid-areas/angular", workspace: "angular" },
} as const;
type Framework = keyof typeof frameworks;

type Block = { framework: Framework; language: string; code: string; page: string; line: number };

/** The ` ```ts ` and ` ```tsx ` blocks of every page, fences at the start of a line. */
function codeBlocks(): Array<Block> {
  const pages = readdirSync(docsDir, { recursive: true, encoding: "utf8" })
    .filter(file => /\.mdx?$/.test(file))
    .sort();
  return pages.flatMap(page => {
    const markdown = readFileSync(join(docsDir, page), "utf8");
    return Array.from(
      markdown.matchAll(/^```(tsx?)(?:[ \t]+([^\n]*))?\n([\s\S]*?)^```/gm),
      match => {
        const meta = match[2]?.split(/\s+/)[0] ?? "";
        const framework: Framework = meta in frameworks ? (meta as Framework) : "react";
        return {
          framework,
          language: match[1]!,
          code: match[3]!,
          page,
          line: markdown.slice(0, match.index).split("\n").length,
        };
      },
    );
  });
}

/** tsc's output for the given blocks, all written for one framework: empty when they type-check. */
function typeCheck(framework: Framework, blocks: ReadonlyArray<Block>): string {
  const { adapter, workspace } = frameworks[framework];
  const workspaceDir = join(repoDir, "packages", workspace);
  const workDir = join(cacheDir, framework);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, "designs.ts"),
    'export * from "@typed-grid-areas/acceptance/designs";\n',
  );
  const files = blocks.map(({ language, code, page, line }) => {
    const file = `${page.replace(/\.mdx?$/, "").replaceAll(/[\\/]/g, "-")}-line-${line}.${language}`;
    // Short snippets leave out the import of `defineLayout`.
    const prelude =
      /\bdefineLayout\b/.test(code) && !code.includes('from "typed-grid-areas"')
        ? 'import { defineLayout } from "typed-grid-areas";\n'
        : "";
    // `export {}` keeps each block its own module, even without imports.
    writeFileSync(join(workDir, file), `${prelude}${code}\nexport {};\n`);
    return file;
  });
  writeFileSync(
    join(workDir, "tsconfig.json"),
    JSON.stringify({
      extends: join(workspaceDir, "tsconfig.json"),
      include: [],
      files,
      compilerOptions: {
        types: ["node"],
        paths: { [adapter]: [join(workspaceDir, "src", "index.ts")] },
      },
      // Angular blocks compile with Angular's compiler, which checks their templates too.
      angularCompilerOptions: { strictTemplates: true },
    }),
  );

  // Angular's compiler is the Angular adapter's own, on that workspace's TypeScript.
  const [compiler, args] =
    framework === "angular"
      ? [ngc(workspaceDir), ["-p", "."]]
      : [repoTsc, ["-p", ".", "--pretty", "false"]];
  try {
    execFileSync(process.execPath, [compiler, ...args], {
      cwd: workDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "";
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: string; stderr?: string };
    // ngc colours its output whatever `pretty` says.
    return `${stdout ?? ""}${stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
  }
}

function ngc(angularDir: string): string {
  const compilerCli = createRequire(join(angularDir, "package.json")).resolve(
    "@angular/compiler-cli/package.json",
  );
  return join(dirname(compilerCli), "bundles", "src", "bin", "ngc.js");
}

const blocks = codeBlocks();

describe("the site's code blocks", () => {
  it("are found on the pages", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  for (const framework of Object.keys(frameworks) as Array<Framework>) {
    const written = blocks.filter(block => block.framework === framework);
    it.runIf(written.length > 0)(
      `type-check, ${framework === "react" ? "React and plain TypeScript" : framework}`,
      () => {
        expect(typeCheck(framework, written), relative(siteDir, docsDir)).toBe("");
      },
      60_000,
    );
  }
});
