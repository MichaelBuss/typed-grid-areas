/**
 * Type-checks every code block on the site's pages, each as its own module,
 * the way REFERENCE.md's are checked: `typed-grid-areas` resolves to the
 * built core, as a consumer gets it, and an adapter to its package's source,
 * checked with that package's own compiler options and checker. Angular
 * blocks compile with Angular's compiler (`ngc`, `strictTemplates`), Vue
 * blocks with `vue-tsc` and Svelte blocks with `svelte-check`, each on its
 * workspace's own TypeScript, so their templates are checked too.
 *
 * Info strings are REFERENCE.md's: ` ```vue ` and ` ```svelte ` are those
 * adapters' components; ` ```tsx ` is React (or no framework), and a `ts` or
 * `tsx` block names any other adapter after the language (` ```tsx solid `,
 * ` ```ts angular `). A block can import the example designs from
 * `./designs`, which re-exports `@typed-grid-areas/acceptance/designs`.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { examples, type ExampleAdapter } from "./examples.ts";
import { repoDir, repoTsc, siteDir } from "./test-utils/tsc.ts";

const docsDir = join(siteDir, "src", "content", "docs");
// Outside `node_modules`, where svelte-check reports nothing. Git ignores it.
const cacheDir = join(siteDir, ".cache", "code-blocks");

/** Every stable adapter: the workspace `packages/<framework>`, published as `@typed-grid-areas/<framework>`. */
type Framework = ExampleAdapter;
const frameworks: ReadonlyArray<Framework> = examples.map(example => example.adapter);
const isFramework = (name: string): name is Framework =>
  (frameworks as ReadonlyArray<string>).includes(name);

/** Languages that are a framework's own component format, written as they are. */
const componentLanguages = ["vue", "svelte"] as const;

type Block = { framework: Framework; language: string; code: string; page: string; line: number };

/** The `ts`, `tsx`, `vue` and `svelte` blocks of every page, fences at the start of a line. */
function codeBlocks(): Array<Block> {
  const pages = readdirSync(docsDir, { recursive: true, encoding: "utf8" })
    .filter(file => /\.mdx?$/.test(file))
    .sort();
  return pages.flatMap(page => {
    const markdown = readFileSync(join(docsDir, page), "utf8");
    return Array.from(
      markdown.matchAll(/^```(tsx?|vue|svelte)(?:[ \t]+([^\n]*))?\n([\s\S]*?)^```/gm),
      match => {
        const language = match[1]!;
        const named = isFramework(language) ? language : (match[2]?.split(/\s+/)[0] ?? "");
        return {
          framework: isFramework(named) ? named : "react",
          language,
          code: match[3]!,
          page,
          line: markdown.slice(0, match.index).split("\n").length,
        };
      },
    );
  });
}

/** The script that checks a framework's blocks in the current folder, and its arguments. */
function checker(framework: Framework, workspaceDir: string): [string, Array<string>] {
  const resolve = (specifier: string) =>
    createRequire(join(workspaceDir, "package.json")).resolve(specifier);
  switch (framework) {
    // The Angular adapter's own compiler, on that workspace's TypeScript.
    case "angular":
      return [
        join(dirname(resolve("@angular/compiler-cli/package.json")), "bundles/src/bin/ngc.js"),
        ["-p", "."],
      ];
    // The Vue workspace's own script, which runs vue-tsc on its TypeScript 6.
    case "vue":
      return [join(workspaceDir, "scripts", "vue-tsc.cjs"), ["-p", ".", "--pretty", "false"]];
    // Installed in the Svelte workspace, beside its TypeScript 6.
    case "svelte":
      return [
        join(dirname(resolve("svelte-check/package.json")), "bin", "svelte-check"),
        [
          "--workspace",
          ".",
          "--tsconfig",
          "./tsconfig.json",
          "--fail-on-warnings",
          "--output",
          "human",
        ],
      ];
    default:
      return [repoTsc, ["-p", ".", "--pretty", "false"]];
  }
}

/** The checker's output for the given blocks, all written for one framework: empty when they type-check. */
function typeCheck(framework: Framework, blocks: ReadonlyArray<Block>): string {
  const workspaceDir = join(repoDir, "packages", framework);
  const entry = framework === "svelte" ? "src/lib/index.ts" : "src/index.ts";
  const workDir = join(cacheDir, framework);
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    join(workDir, "designs.ts"),
    'export * from "@typed-grid-areas/acceptance/designs";\n',
  );
  const files = blocks.map(({ language, code, page, line }) => {
    const file = `${page.replace(/\.mdx?$/, "").replaceAll(/[\\/]/g, "-")}-line-${line}.${language}`;
    if ((componentLanguages as ReadonlyArray<string>).includes(language)) {
      writeFileSync(join(workDir, file), code);
      return file;
    }
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
        paths: { [`@typed-grid-areas/${framework}`]: [join(workspaceDir, entry)] },
      },
      // Angular blocks compile with Angular's compiler, which checks their templates too.
      angularCompilerOptions: { strictTemplates: true },
    }),
  );

  const [script, args] = checker(framework, workspaceDir);
  try {
    execFileSync(process.execPath, [script, ...args], {
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

const blocks = codeBlocks();

describe("the site's code blocks", () => {
  it("are found on the pages", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it.each(componentLanguages)("include %s components", language => {
    expect(blocks.filter(block => block.language === language).length).toBeGreaterThan(0);
  });

  for (const framework of frameworks) {
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
