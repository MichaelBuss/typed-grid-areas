/**
 * Packs `@typed-grid-areas/octane` and the core the way `npm publish` does,
 * installs both tarballs into a clean project with the supported Octane, and
 * checks what a consumer gets: the tarball's files and manifest, and the
 * README's Octane example type-checking (`tsrx-tsc`, and plain `tsc` over the
 * package's source) and rendering on the server, compiled by Octane's Vite
 * plugin as in an app.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const coreDir = resolve(packageDir, "..", "core");
const rootDir = resolve(packageDir, "..", "..");
const readmePath = join(rootDir, "README.md");

type Manifest = {
  name: string;
  version: string;
  exports: Record<string, unknown>;
  octane?: { source?: boolean };
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

/** Links a third-party package from this workspace's install into the consumer's node_modules. */
function linkInstalled(name: string): void {
  const link = join(consumer, "node_modules", name);
  mkdirSync(dirname(link), { recursive: true });
  const installed = [
    join(packageDir, "node_modules", name),
    join(rootDir, "node_modules", name),
  ].find(dir => existsSync(join(dir, "package.json")));
  symlinkSync(realpathSync(installed!), link, "dir");
}

/** Runs a command in the consumer, returning its output, or its stdout and stderr when it fails. */
function run(command: string, args: string[]): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: consumer,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    const { stdout = "", stderr = "" } = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${stdout}${stderr}` };
  }
}

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-octane-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(packageDir, "@typed-grid-areas/octane"));
  const linked = ["octane", "@tsrx/oxc", "@tsrx/typescript-plugin", "typescript", "vite"];
  for (const name of linked) {
    linkInstalled(name);
  }
  writeFileSync(
    join(consumer, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        "@typed-grid-areas/octane": manifest.version,
        "typed-grid-areas": core.version,
        octane: manifest.peerDependencies?.octane,
      },
    }),
  );

  const readme = readFileSync(readmePath, "utf8");
  const example = Array.from(
    readme.matchAll(/^```tsrx\n([\s\S]*?)^```/gm),
    match => match[1]!,
  ).find(code => code.includes('from "@typed-grid-areas/octane"'));
  writeFileSync(join(consumer, "example.tsrx"), example ?? "");
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "esnext",
        moduleResolution: "bundler",
        target: "es2022",
        lib: ["es2022", "dom", "dom.iterable"],
        jsx: "react-jsx",
        jsxImportSource: "octane",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ["*.tsrx", "*.ts"],
    }),
  );
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Octane adapter", () => {
  it("holds its source without specs or test helpers, LICENSE, README.md and package.json", () => {
    expect(files.sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
      "src/gridComponent.tsx",
      "src/index.ts",
    ]);
  });

  it("exports its source, depends on the core it's released with, and peers on Octane 0.16", () => {
    expect(manifest.name).toBe("@typed-grid-areas/octane");
    expect(manifest.exports).toEqual({ ".": "./src/index.ts" });
    expect(manifest.octane).toEqual({ source: true });
    expect(Object.keys(manifest.dependencies ?? {})).toEqual(["typed-grid-areas"]);
    // The range accepts the core version in the repo (and so the one released alongside).
    expect(satisfiesCaret(core.version, manifest.dependencies!["typed-grid-areas"]!)).toBe(true);
    expect(manifest.peerDependencies).toEqual({ octane: "^0.16.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("type-checks the README's Octane example with tsrx-tsc", () => {
    expect(readFileSync(join(consumer, "example.tsrx"), "utf8")).toContain("createGridComponent");

    const tsrxTsc = join(consumer, "node_modules", "@tsrx", "typescript-plugin", "dist", "tsc.js");
    const { ok, output } = run(process.execPath, [tsrxTsc, "-p", consumer, "--pretty", "false"]);

    expect(output).toBe("");
    expect(ok).toBe(true);
  });

  it("type-checks its source with plain tsc", () => {
    writeFileSync(
      join(consumer, "plain.ts"),
      `import { createGridComponent, type GridComponent } from "@typed-grid-areas/octane";
       import { defineLayout } from "typed-grid-areas";
       export const Card: GridComponent<"icon" | "title"> = createGridComponent(
         defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
       );
       // @ts-expect-error -- not an area
       void Card.titel;
      `,
    );
    const tsc = join(consumer, "node_modules", "typescript", "bin", "tsc");
    const { ok, output } = run(process.execPath, [
      tsc,
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      consumer,
    ]);

    expect(output).toBe("");
    expect(ok).toBe(true);
    rmSync(join(consumer, "plain.ts"));
  });

  it("renders the README's Octane example on the server, compiled by Octane's Vite plugin", () => {
    // The way an app runs it: the bundler plugin compiles the adapter's source
    // along with the app's own components.
    writeFileSync(
      join(consumer, "render.js"),
      `import { createServer } from "vite";
       import { octane } from "octane/compiler/vite";
       const server = await createServer({
         root: process.cwd(),
         configFile: false,
         logLevel: "silent",
         appType: "custom",
         server: { middlewareMode: true, ws: false },
         plugins: [octane()],
       });
       try {
         const { Example } = await server.ssrLoadModule("/example.tsrx");
         const { renderToString } = await server.ssrLoadModule("octane/server");
         console.log(JSON.stringify(renderToString(Example, { selectable: true })));
       } finally {
         await server.close();
       }
      `,
    );
    const { ok, output } = run(process.execPath, ["render.js"]);
    expect(ok, output).toBe(true);

    const { html, css } = JSON.parse(output) as { html: string; css: string };
    expect(css).toMatch(/<style data-octane="typed-grid-areas-[^"]+">[^<]*grid-template-areas/);
    expect(html).not.toContain("<style");
    expect(html).toMatch(/<section[^>]* data-grid-id="[^"]+"/);
    expect(html).toMatch(/<label[^>]* data-area="input"/);
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
