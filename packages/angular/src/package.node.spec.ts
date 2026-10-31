/**
 * Builds `@typed-grid-areas/angular`, packs its build folder (what's
 * published) and the core the way `npm publish` does, installs both tarballs
 * into a clean Angular 22 project, and checks what a consumer gets: the
 * tarball's files and manifest, and the README's Angular example compiling
 * with `strictTemplates` and rendering on the server.
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

const packageDir = resolve(import.meta.dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const readmePath = resolve(packageDir, "..", "..", "README.md");
const require = createRequire(import.meta.url);
const ngc = join(
  dirname(require.resolve("@angular/compiler-cli/package.json")),
  "bundles",
  "src",
  "bin",
  "ngc.js",
);

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

/** Packs a package folder into the consumer and unpacks it into the consumer's node_modules. */
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
  // What the release does before publishing the build folder.
  execFileSync("npm", ["run", "build"], { cwd: packageDir, stdio: "ignore" });
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-angular-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(join(packageDir, "dist"), "@typed-grid-areas/angular"));
  for (const name of [
    "@angular/common",
    "@angular/compiler",
    "@angular/core",
    "@angular/platform-browser",
    "@angular/platform-server",
    "rxjs",
    "tslib",
  ]) {
    linkInstalled(name);
  }
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
}, 180_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Angular adapter", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "fesm2022/typed-grid-areas-angular.mjs",
        "types/typed-grid-areas-angular.d.ts",
      ]),
    );
    expect(files.filter(path => !/^(fesm2022|types)\//.test(path)).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
    expect(files.filter(file => /spec|test-utils|test-setup|acceptance/.test(file))).toEqual([]);
  });

  it("depends on the core it's released with, and on Angular 22 as a peer", () => {
    expect(manifest.name).toBe("@typed-grid-areas/angular");
    expect(Object.keys(manifest.exports).sort()).toEqual([".", "./package.json"]);
    // ng-packagr adds tslib, as to every Angular library.
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(["tslib", "typed-grid-areas"]);
    // The range accepts the core version in the repo (and so the one released alongside).
    expect(satisfiesCaret(core.version, manifest.dependencies!["typed-grid-areas"]!)).toBe(true);
    expect(manifest.peerDependencies).toEqual({ "@angular/core": "^22.0.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("compiles the README's Angular example with strictTemplates, and renders it on the server", () => {
    const readme = readFileSync(readmePath, "utf8");
    const example = Array.from(
      readme.matchAll(/^```ts angular\n([\s\S]*?)^```/gm),
      match => match[1]!,
    ).find(code => code.includes('from "@typed-grid-areas/angular"'));
    expect(example).toBeDefined();

    writeFileSync(join(consumer, "card.component.ts"), example!);
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "es2022",
          moduleResolution: "bundler",
          target: "es2022",
          lib: ["es2022", "dom"],
          strict: true,
          outDir: "out",
          types: [],
        },
        angularCompilerOptions: { strictTemplates: true },
        files: ["card.component.ts"],
      }),
    );
    let output = "";
    try {
      execFileSync(process.execPath, [ngc, "-p", consumer], { cwd: consumer, encoding: "utf8" });
    } catch (error) {
      const { stdout, stderr } = error as { stdout?: string; stderr?: string };
      output = `${stdout ?? ""}${stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
    }
    expect(output).toBe("");

    // A child process on stock Node, as an `@angular/ssr` server runs it.
    const script = `
      globalThis.ngServerMode = true;
      await import("@angular/compiler");
      const { bootstrapApplication } = await import("@angular/platform-browser");
      const { provideServerRendering, renderApplication } = await import("@angular/platform-server");
      const { CardComponent } = await import("./out/card.component.js");
      const html = await renderApplication(
        context => bootstrapApplication(CardComponent, { providers: [provideServerRendering()] }, context),
        { document: "<html><head></head><body><app-card></app-card></body></html>", url: "/" },
      );
      console.log(html);
    `;
    const html = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: consumer,
      encoding: "utf8",
    });
    expect(html).toMatch(/<style data-typed-grid-areas="[^"]+">[^<]*grid-template-areas/);
    expect(html).toMatch(/data-grid-id="[^"]+"/);
    expect(html).toMatch(/data-area="content"[^>]*style="container-type: inline-size;/);
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
