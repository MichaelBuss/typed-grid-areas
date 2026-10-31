/**
 * Packs `@typed-grid-areas/vue` and the core the way `npm publish` does,
 * installs both tarballs into a clean project, and checks what a consumer
 * gets: the tarball's files and manifest, and the README's Vue example
 * type-checking with vue-tsc and server rendering, through the README's
 * server entry, on stock Node.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";

const packageDir = resolve(__dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const readmePath = resolve(packageDir, "..", "..", "README.md");
const vueTsc = join(packageDir, "scripts", "vue-tsc.cjs");
const require = createRequire(import.meta.url);

type Manifest = {
  name: string;
  version: string;
  exports: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

let consumer: string;
let files: string[];
let manifest: Manifest;
let core: Manifest;

/** Packs a package into the consumer and unpacks it into the consumer's node_modules. */
function packAndInstall(dir: string, name: string): { files: string[]; manifest: Manifest } {
  const [pack] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  ) as Array<{ filename: string; files: Array<{ path: string }> }>;
  const installed = join(consumer, "node_modules", name);
  mkdirSync(installed, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    join(consumer, pack!.filename),
    "-C",
    installed,
    "--strip-components=1",
  ]);
  return {
    files: pack!.files.map(file => file.path),
    manifest: JSON.parse(readFileSync(join(installed, "package.json"), "utf8")),
  };
}

/** Links a third-party package from the repo's install into the consumer's node_modules. */
function linkInstalled(name: string): void {
  const link = join(consumer, "node_modules", name);
  mkdirSync(dirname(link), { recursive: true });
  const installed = require.resolve
    .paths(name)!
    .map(nodeModules => join(nodeModules, name))
    .find(dir => existsSync(join(dir, "package.json")));
  symlinkSync(installed!, link, "dir");
}

/** The README's code block in `language` that imports from `@typed-grid-areas/vue`. */
function readmeExample(language: string): string {
  const readme = readFileSync(readmePath, "utf8");
  const example = Array.from(
    readme.matchAll(new RegExp(`^\`\`\`${language}\\n([\\s\\S]*?)^\`\`\``, "gm")),
    match => match[1]!,
  ).find(code => code.includes('from "@typed-grid-areas/vue"'));
  if (example === undefined) {
    throw new Error(`no ${language} example imports @typed-grid-areas/vue`);
  }
  return example;
}

/** Compiles a single-file component to a JavaScript module for server rendering, as a bundler does. */
function compileForServer(source: string): string {
  const { descriptor } = parse(source, { filename: "Example.vue" });
  const { content } = compileScript(descriptor, {
    id: "example",
    inlineTemplate: true,
    templateOptions: { ssr: true, ssrCssVars: [] },
  });
  return ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-vue-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(packageDir, "@typed-grid-areas/vue"));
  linkInstalled("vue");
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Vue adapter", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "dist/index.js",
        "dist/index.d.ts",
      ]),
    );
    expect(files.filter(path => !path.startsWith("dist/")).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
    expect(files.filter(file => /spec|test-utils|\.vue$/.test(file))).toEqual([]);
  });

  it("depends only on the core it's released with, and Vue 3.5 as a peer", () => {
    expect(manifest.name).toBe("@typed-grid-areas/vue");
    expect(manifest.exports).toEqual({
      ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
    });
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(["typed-grid-areas"]);
    // The range accepts the core version in the repo (and so the one released alongside).
    expect(satisfiesCaret(core.version, manifest.dependencies!["typed-grid-areas"]!)).toBe(true);
    expect(manifest.peerDependencies).toEqual({ vue: "^3.5.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("type-checks the README's Vue example with vue-tsc", () => {
    writeFileSync(join(consumer, "Example.vue"), readmeExample("vue"));
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "esnext",
          moduleResolution: "bundler",
          target: "es2022",
          lib: ["es2022", "dom"],
          strict: true,
          noEmit: true,
          types: [],
        },
        files: ["Example.vue"],
      }),
    );

    let output = "";
    try {
      execFileSync(process.execPath, [vueTsc, "-p", consumer, "--pretty", "false"], {
        cwd: consumer,
        encoding: "utf8",
      });
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? error);
    }
    expect(output).toBe("");
  }, 60_000);

  it("server-renders the README's Vue example through the README's server entry", () => {
    writeFileSync(join(consumer, "Example.js"), compileForServer(readmeExample("vue")));
    writeFileSync(join(consumer, "server.js"), readmeExample("js"));

    // A child process, since Vitest's own resolver forgives what Node's doesn't.
    const script = `
      import { createSSRApp } from "vue";
      import Example from "./Example.js";
      import { render } from "./server.js";
      const page = await render(createSSRApp(Example, { selectable: true }));
      console.log(JSON.stringify(page));
    `;
    const { html, head } = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: consumer,
        encoding: "utf8",
      }),
    ) as { html: string; head: string };

    expect(head.match(/<style data-typed-grid-areas="[^"]+">/g)).toHaveLength(2);
    expect(head).toContain("grid-template-areas");
    expect(html).toMatch(/^<div class="gap-4" aria-label="Card" data-grid-id="[^"]+">/);
    expect(html).toContain('<label data-area="input">');
    expect(html).toContain('data-area="content"');
    expect(html).toContain('data-area="title"');
  });
});

/** Whether `version` satisfies a caret range `^x.y.z`, as npm reads it for 0.x versions. */
function satisfiesCaret(version: string, range: string): boolean {
  const match = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(range);
  if (match === null) {
    return false;
  }
  const [want, have] = [match.slice(1).map(Number), version.split(".").map(Number)];
  const [wMajor, wMinor, wPatch] = want as [number, number, number];
  const [hMajor, hMinor, hPatch] = have as [number, number, number];
  if (wMajor !== hMajor) {
    return false;
  }
  if (wMajor === 0 && wMinor !== hMinor) {
    return false;
  }
  return hMinor > wMinor || (hMinor === wMinor && hPatch >= wPatch);
}
