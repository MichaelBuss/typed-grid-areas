/**
 * Packs `@typed-grid-areas/preact` and the core the way `npm publish` does,
 * installs both tarballs into a clean project with Preact 11, and checks
 * what a consumer gets: the tarball's files and manifest, and the README's
 * Preact example type-checking and server rendering on stock Node.
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
import { preactReadmeBlocks } from "./test-utils/readmeBlocks.ts";

const packageDir = resolve(__dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve("typescript/package.json")), "bin", "tsc");

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

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-preact-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(packageDir, "@typed-grid-areas/preact"));
  for (const name of ["preact", "preact-render-to-string"]) {
    linkInstalled(name);
  }
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Preact adapter", () => {
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
    expect(files.filter(file => /spec|test-utils|test-setup|acceptance/.test(file))).toEqual([]);
  });

  it("depends on the core it's released with alone, and Preact 11 as a peer", () => {
    expect(manifest.name).toBe("@typed-grid-areas/preact");
    expect(manifest.exports).toEqual({
      ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
    });
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(["typed-grid-areas"]);
    // The range accepts the core version in the repo (and so the one released alongside).
    expect(satisfiesCaret(core.version, manifest.dependencies!["typed-grid-areas"]!)).toBe(true);
    expect(manifest.peerDependencies).toEqual({ preact: "^11.0.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("imports nothing from React or preact/compat", () => {
    const installed = join(consumer, "node_modules", "@typed-grid-areas", "preact", "dist");
    const imports = files
      .filter(file => file.endsWith(".js"))
      .flatMap(file =>
        Array.from(
          readFileSync(join(installed, file.replace(/^dist\//, "")), "utf8").matchAll(
            /from "([^"]+)"/g,
          ),
          match => match[1]!,
        ),
      )
      .filter(source => !source.startsWith("."));
    expect(new Set(imports)).toEqual(
      new Set(["preact", "preact/hooks", "preact/jsx-runtime", "typed-grid-areas/adapter"]),
    );
  });

  it("runs the README's Preact example, type-checked, on stock Node", () => {
    const example = preactReadmeBlocks().find(({ code }) =>
      code.includes('from "@typed-grid-areas/preact"'),
    )?.code;
    expect(example).toBeDefined();

    writeFileSync(join(consumer, "example.tsx"), `${example}\nexport { Example };\n`);
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "nodenext",
          moduleResolution: "nodenext",
          target: "es2022",
          lib: ["es2022", "dom"],
          jsx: "react-jsx",
          jsxImportSource: "preact",
          strict: true,
          outDir: "out",
          types: [],
        },
        files: ["example.tsx"],
      }),
    );
    let output = "";
    try {
      execFileSync(process.execPath, [tsc, "-p", consumer, "--pretty", "false"], {
        cwd: consumer,
        encoding: "utf8",
      });
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? error);
    }
    expect(output).toBe("");

    // A child process, since Vitest's own resolver forgives what Node's doesn't.
    const script = `
      import { h } from "preact";
      import { renderToString } from "preact-render-to-string";
      import { createGridStyleSheet } from "@typed-grid-areas/preact";
      import { Example } from "./out/example.js";
      const sheet = createGridStyleSheet();
      const body = renderToString(sheet.collect(h(Example, { tag: "New" })));
      console.log(JSON.stringify({ head: String(sheet), body }));
    `;
    const { head, body } = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: consumer,
        encoding: "utf8",
      }),
    ) as { head: string; body: string };
    expect(head).toMatch(/^<style data-typed-grid-areas="[^"]+">[^<]*grid-template-areas/);
    expect(body).not.toContain("<style");
    expect(body).toMatch(/data-grid-id="[^"]+"/);
    expect(body).toContain('data-area="information"');
    expect(body).toContain('data-area="cardTag"');
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
