/**
 * Packs `@typed-grid-areas/solid` and the core the way `npm publish` does,
 * installs both tarballs into a clean project with Solid 1.x, and checks
 * what a consumer gets: the tarball's files and manifest, and the README's
 * Solid example type-checking, then compiled by Vite's Solid plugin and
 * rendered on the server.
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

const packageDir = resolve(__dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const readmePath = resolve(packageDir, "..", "..", "README.md");
const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve("typescript/package.json")), "bin", "tsc");

type Manifest = {
  name: string;
  version: string;
  exports: Record<string, Record<string, string>>;
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

/** Runs an ES module script in the consumer, on stock Node. */
function runInConsumer(script: string): string {
  // A child process, since Vitest's own resolver forgives what Node's doesn't.
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: consumer,
    encoding: "utf8",
  });
}

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-solid-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(packageDir, "@typed-grid-areas/solid"));
  for (const name of ["solid-js", "vite", "vite-plugin-solid"]) {
    linkInstalled(name);
  }
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        "@typed-grid-areas/solid": manifest.version,
        "solid-js": "^1.9.0",
        "typed-grid-areas": core.version,
      },
    }),
  );
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Solid adapter", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "dist/index.js",
        "dist/index.jsx",
        "dist/index.d.ts",
      ]),
    );
    expect(files.filter(path => !path.startsWith("dist/")).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
    expect(files.filter(file => /spec|test-utils|acceptance/.test(file))).toEqual([]);
  });

  it("exports types, Solid JSX and a browser build, depending only on the core, with Solid 1.x as a peer", () => {
    expect(manifest.name).toBe("@typed-grid-areas/solid");
    expect(Object.keys(manifest.exports)).toEqual(["."]);
    expect(manifest.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      solid: "./dist/index.jsx",
      import: "./dist/index.js",
    });
    expect(Object.keys(manifest.exports["."]!)).toEqual(["types", "solid", "import"]);
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(["typed-grid-areas"]);
    // The range accepts the core version in the repo (and so the one released alongside).
    expect(satisfiesCaret(core.version, manifest.dependencies!["typed-grid-areas"]!)).toBe(true);
    expect(manifest.peerDependencies).toEqual({ "solid-js": "^1.9.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("runs the README's Solid example, type-checked, compiled by Vite and rendered on the server", async () => {
    const readme = readFileSync(readmePath, "utf8");
    const example = Array.from(
      readme.matchAll(/^```tsx solid\n([\s\S]*?)^```/gm),
      match => match[1]!,
    ).find(code => code.includes("<Show when={props.tag}>"));
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
          jsx: "preserve",
          jsxImportSource: "solid-js",
          strict: true,
          noEmit: true,
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

    // Compiled for the server as an app's build would: from the package's Solid JSX.
    runInConsumer(`
      import { build } from "vite";
      import solid from "vite-plugin-solid";
      await build({
        configFile: false,
        logLevel: "silent",
        plugins: [solid({ ssr: true })],
        build: { ssr: "example.tsx", outDir: "out", rolldownOptions: { output: { entryFileNames: "example.js" } } },
      });
    `);
    const html = runInConsumer(`
      import { createComponent, renderToString } from "solid-js/web";
      import { Example } from "./out/example.js";
      console.log(renderToString(() => createComponent(Example, { tag: "New" })));
    `);
    expect(html).toMatch(/data-grid-id="[^"]+"/);
    expect(html).toMatch(/<label[^>]*for="notify"[^>]*data-area="input"/);
    expect(html).toContain('data-area="icon"');
    expect(html).toContain('data-area="tag"');
    expect(html).toContain(">New<");
  }, 60_000);
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
