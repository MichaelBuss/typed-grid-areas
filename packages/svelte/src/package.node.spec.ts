/**
 * Packs `@typed-grid-areas/svelte` and the core the way `npm publish` does,
 * installs both tarballs into a clean project with the repo's Svelte, and
 * checks what a consumer gets: the tarball's files and manifest, and the
 * README's Svelte example type-checking (`svelte-check`) and rendering on
 * the server through Vite, as a Svelte app builds it.
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
const svelteCheck = join(
  dirname(require.resolve("svelte-check/package.json")),
  "bin",
  "svelte-check",
);

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

/** The README's Svelte examples. */
function readmeExamples(): Array<string> {
  const readme = readFileSync(readmePath, "utf8");
  return Array.from(readme.matchAll(/^```svelte\n([\s\S]*?)^```/gm), match => match[1]!);
}

beforeAll(() => {
  consumer = mkdtempSync(join(tmpdir(), "typed-grid-areas-svelte-consumer-"));
  core = packAndInstall(coreDir, "typed-grid-areas").manifest;
  ({ files, manifest } = packAndInstall(packageDir, "@typed-grid-areas/svelte"));
  // Svelte, the package's own dependency, and the tooling a Svelte app builds with
  // (TypeScript is this package's 6.0, which svelte-check runs on).
  for (const name of ["svelte", "esm-env", "vite", "@sveltejs/vite-plugin-svelte", "typescript"]) {
    linkInstalled(name);
  }
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ type: "module" }));
}, 120_000);

afterAll(() => {
  rmSync(consumer, { recursive: true, force: true });
});

describe("the packed Svelte adapter", () => {
  it("holds only the build output, LICENSE, README.md and package.json", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "LICENSE",
        "README.md",
        "package.json",
        "dist/index.js",
        "dist/index.d.ts",
        "dist/Grid.svelte",
        "dist/Slot.svelte",
      ]),
    );
    expect(files.filter(path => !path.startsWith("dist/")).sort()).toEqual([
      "LICENSE",
      "README.md",
      "package.json",
    ]);
    expect(files.filter(file => /spec|fixtures|test-utils|acceptance|types\//.test(file))).toEqual(
      [],
    );
    // svelte-package rewrote the `.ts` imports in `.svelte` files.
    expect(
      readFileSync(
        join(consumer, "node_modules/@typed-grid-areas/svelte/dist/Grid.svelte"),
        "utf8",
      ),
    ).not.toMatch(/from "\.\/[^"]+\.ts"/);
  });

  it("exports its types and Svelte sources, on the core, esm-env and Svelte 5.57 as a peer", () => {
    expect(manifest.name).toBe("@typed-grid-areas/svelte");
    expect(manifest.exports).toEqual({
      ".": { types: "./dist/index.d.ts", svelte: "./dist/index.js" },
    });
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
      "esm-env",
      "typed-grid-areas",
    ]);
    expect(manifest.dependencies!["typed-grid-areas"]).toBe(`^${core.version}`);
    expect(manifest.peerDependencies).toEqual({ svelte: "^5.57.0" });
    expect(manifest.optionalDependencies).toBeUndefined();
  });

  it("type-checks the README's Svelte examples", () => {
    const examples = readmeExamples();
    expect(examples.length).toBeGreaterThan(0);
    const names = examples.map((code, index) => {
      writeFileSync(join(consumer, `Example${index}.svelte`), code);
      return `Example${index}.svelte`;
    });
    writeFileSync(
      join(consumer, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "esnext",
          moduleResolution: "bundler",
          target: "es2022",
          lib: ["es2022", "dom"],
          strict: true,
          verbatimModuleSyntax: true,
          noEmit: true,
          types: [],
        },
        include: names,
      }),
    );

    let output = "";
    try {
      output = execFileSync(
        process.execPath,
        [
          svelteCheck,
          "--workspace",
          consumer,
          "--tsconfig",
          join(consumer, "tsconfig.json"),
          "--output",
          "machine",
        ],
        { cwd: consumer, encoding: "utf8" },
      );
    } catch (error) {
      output = String((error as { stdout?: string }).stdout ?? error);
    }
    expect(output).toMatch(/COMPLETED \d+ FILES 0 ERRORS 0 WARNINGS/);
  }, 60_000);

  it("server-renders the README's example through Vite", () => {
    writeFileSync(join(consumer, "Example.svelte"), readmeExamples()[0]!);
    // A child process, with the consumer's own Vite and Svelte plugin.
    const script = `
      import { svelte } from "@sveltejs/vite-plugin-svelte";
      import { createServer } from "vite";
      const server = await createServer({
        configFile: false,
        root: process.cwd(),
        logLevel: "silent",
        appType: "custom",
        server: { middlewareMode: true, ws: false },
        plugins: [svelte()],
      });
      const { render } = await server.ssrLoadModule("svelte/server");
      const { default: Example } = await server.ssrLoadModule("/Example.svelte");
      const { head, body } = render(Example, { props: { selectable: true, tag: "New" } });
      console.log(JSON.stringify({ head, body }));
      await server.close();
    `;
    const { head, body } = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], {
        cwd: consumer,
        encoding: "utf8",
      }),
    ) as { head: string; body: string };

    expect(
      head.match(/<style data-typed-grid-areas="[^"]+">[^<]*grid-template-areas/g),
    ).toHaveLength(2);
    expect(body).toMatch(/data-grid-id="[^"]+"/);
    expect(body).toMatch(/<label[^>]*data-area="input"/);
    expect(body).toContain('data-area="information"');
    expect(body).toContain('data-area="cardTag"');
  }, 60_000);
});
