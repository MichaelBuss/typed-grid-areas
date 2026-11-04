/**
 * Bundles a consumer's entry module the way an app's production and
 * development builds do, and checks which development-only code ends up in
 * the output (issue #46). Each package's packed-package spec writes an entry
 * that uses it from the consumer's `node_modules` and calls
 * `describeDevelopmentCode`. Node-only: import it from a `*.node.spec.ts`.
 */
import { dirname } from "node:path";
import { build as esbuild } from "esbuild";
import { build as viteBuild, type PluginOption } from "vite";
import { describe, expect, it } from "vitest";

/** Messages only the core's config validation logs: present in any bundle that calls `defineLayout`. */
export const VALIDATION_MESSAGES = ["isn't a rectangle", "Malformed cell"];

/** Messages only the slot check logs: present in any bundle that renders an adapter's grid. */
export const SLOT_CHECK_MESSAGES = [
  "no slot for the required area",
  "is a direct child of the grid but not",
];

export type Bundler = "esbuild" | "vite";
export type BuildMode = "production" | "development";

export type BundleOptions = {
  /** Packages left out of the bundle, with their subpaths, such as the framework itself. */
  external?: Array<string>;
  /** The framework's Vite plugins, for an adapter that ships components needing a compiler. */
  vitePlugins?: Array<PluginOption>;
  /** Globals the framework's own build defines in each mode, beyond `process.env.NODE_ENV`. */
  define?: (mode: BuildMode) => Record<string, string>;
};

/**
 * Bundles `entry` and its imports, minified, as an app build would.
 * esbuild replaces `process.env.NODE_ENV` as its docs recommend; Vite runs
 * with `NODE_ENV` set, as `NODE_ENV=<mode> vite build` does.
 */
export async function bundle(
  entry: string,
  bundler: Bundler,
  mode: BuildMode,
  { external = [], vitePlugins = [], define }: BundleOptions = {},
): Promise<string> {
  if (bundler === "esbuild") {
    const result = await esbuild({
      entryPoints: [entry],
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      write: false,
      logLevel: "silent",
      external,
      define: { "process.env.NODE_ENV": JSON.stringify(mode), ...define?.(mode) },
    });
    return result.outputFiles.map(file => file.text).join("\n");
  }

  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = mode;
  try {
    const result = await viteBuild({
      configFile: false,
      envFile: false,
      root: dirname(entry),
      mode,
      logLevel: "silent",
      plugins: vitePlugins,
      define: define?.(mode),
      build: {
        write: false,
        minify: true,
        rollupOptions: {
          input: entry,
          external: id => external.some(name => id === name || id.startsWith(`${name}/`)),
        },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    return outputs
      .flatMap(output => ("output" in output ? output.output : []))
      .map(chunk => ("code" in chunk ? chunk.code : ""))
      .join("\n");
  } finally {
    process.env.NODE_ENV = nodeEnv;
  }
}

/**
 * Checks that a production build of `entry` leaves out every one of
 * `messages` (and so the code that logs them), and that a development build
 * keeps them all, with each bundler. The development build must not read
 * `process` either: bundlers replace `process.env.NODE_ENV` but not
 * `process` itself, which a browser doesn't have, so a guard that still
 * reads it never lets the checks run. `entry` is called once the test runs,
 * since a packed-package spec writes it in `beforeAll`.
 */
export function describeDevelopmentCode(
  entry: () => string,
  messages: ReadonlyArray<string>,
  {
    bundlers = ["esbuild", "vite"],
    ...options
  }: BundleOptions & { bundlers?: Array<Bundler> } = {},
): void {
  describe.each(bundlers)("bundled by %s", bundler => {
    it("leaves development-only code out of a production build", async () => {
      const code = await bundle(entry(), bundler, "production", options);
      expect(messages.filter(message => code.includes(message))).toEqual([]);
    }, 60_000);

    it("keeps it in a development build, without reading process at runtime", async () => {
      const code = await bundle(entry(), bundler, "development", options);
      expect(messages.filter(message => !code.includes(message))).toEqual([]);
      expect(code).not.toMatch(/\bprocess\b/);
    }, 60_000);
  });
}
