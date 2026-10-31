/**
 * Builds `@typed-grid-areas/angular`, packs its build folder (what's
 * published) and the core the way `npm publish` does, installs both tarballs
 * into a clean Angular 22 project alongside Angular from npm's registry, and
 * checks what a consumer gets: the tarball's files and manifest, the install
 * resolving its dependencies and peers, and the README's Angular example
 * compiling with `strictTemplates` and rendering on the server. Needs the
 * network (or npm's cache) for Angular.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const packageDir = resolve(import.meta.dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const readmePath = resolve(packageDir, "..", "..", "README.md");

/**
 * A clean Angular 22 project's dependencies, from the registry: what the
 * README's example imports, and the compiler and TypeScript it builds with.
 */
const ANGULAR_PROJECT = [
  "@angular/common@^22.0.0",
  "@angular/compiler@^22.0.0",
  "@angular/core@^22.0.0",
  "@angular/platform-browser@^22.0.0",
  "@angular/platform-server@^22.0.0",
  "@angular/compiler-cli@^22.0.0",
  "rxjs@^7.4.0",
  "typescript@~6.0.3",
];

type Manifest = {
  name: string;
  version: string;
  exports: Record<string, unknown>;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

/** A package in `npm ls --json`'s tree. */
type Installed = { version: string; dependencies?: Record<string, Installed> };

let consumer: string;
let files: string[];
let manifest: Manifest;
let core: Manifest;

/** Packs a package folder into the consumer: the tarball's file name and contents. */
function pack(dir: string): { tarball: string; files: string[] } {
  const [packed] = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", consumer], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }),
  ) as Array<{ filename: string; files: Array<{ path: string }> }>;
  return { tarball: packed!.filename, files: packed!.files.map(file => file.path) };
}

function installedManifest(name: string): Manifest {
  return JSON.parse(readFileSync(join(consumer, "node_modules", name, "package.json"), "utf8"));
}

beforeAll(() => {
  // What the release does before publishing the build folder.
  execFileSync("npm", ["run", "build"], { cwd: packageDir, stdio: "ignore" });
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-angular-consumer-"));
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  const packedCore = pack(coreDir);
  const packedAngular = pack(join(packageDir, "dist"));
  files = packedAngular.files;
  // One install, as an Angular 22 app adds the adapter: npm resolves the
  // adapter's dependencies (the core, tslib) and checks its Angular peer.
  execFileSync(
    "npm",
    [
      "install",
      `./${packedCore.tarball}`,
      `./${packedAngular.tarball}`,
      ...ANGULAR_PROJECT,
      "--prefer-offline",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: consumer, stdio: "ignore" },
  );
  core = installedManifest("typed-grid-areas");
  manifest = installedManifest("@typed-grid-areas/angular");
}, 300_000);

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

  it("installs into an Angular 22 project with every dependency and peer satisfied", () => {
    // `npm ls` fails on a missing, invalid or unmet peer dependency anywhere in the tree.
    const tree = JSON.parse(
      execFileSync("npm", ["ls", "--all", "--json"], { cwd: consumer, encoding: "utf8" }),
    ) as { dependencies: Record<string, Installed> };
    expect(tree.dependencies["@angular/core"]?.version).toMatch(/^22\./);
    const adapter = tree.dependencies["@typed-grid-areas/angular"]?.dependencies ?? {};
    expect(Object.keys(adapter).sort()).toEqual(["@angular/core", "tslib", "typed-grid-areas"]);
    expect(adapter["typed-grid-areas"]?.version).toBe(core.version);
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
      execFileSync(join(consumer, "node_modules", ".bin", "ngc"), ["-p", consumer], {
        cwd: consumer,
        encoding: "utf8",
      });
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
