/**
 * React Compiler, as an app that compiles its own source runs it: Babel 7
 * with `babel-plugin-react-compiler` in its default (`infer`) mode. The
 * `react-compiler` test projects and `reactCompiler.node.spec.ts` share it.
 */
import { transformAsync, type BabelFileResult } from "@babel/core";
import reactCompilerPlugin, { type LoggerEvent } from "babel-plugin-react-compiler";
import type { Plugin } from "vite";

/**
 * Runs React Compiler over one TypeScript or TSX module and returns the
 * compiled code, still TypeScript, with its source map, plus every event the
 * compiler logged for it (each function it compiled, skipped or failed on).
 */
export async function compileWithReactCompiler(
  code: string,
  filename: string,
): Promise<{ code: string; map: BabelFileResult["map"]; events: LoggerEvent[] }> {
  const events: LoggerEvent[] = [];
  const result = await transformAsync(code, {
    filename,
    babelrc: false,
    configFile: false,
    // Leave TypeScript and JSX for Vite to transform, as it does uncompiled.
    parserOpts: { plugins: ["jsx", "typescript"] },
    plugins: [
      [
        reactCompilerPlugin,
        { logger: { logEvent: (_file: string | null, event: LoggerEvent) => events.push(event) } },
      ],
    ],
    sourceMaps: true,
  });
  if (result?.code == null) {
    throw new Error(`React Compiler produced no code for ${filename}`);
  }
  return { code: result.code, map: result.map, events };
}

/**
 * A Vite plugin that runs React Compiler over this package's own source
 * (the adapter and its tests) before Vite strips TypeScript and JSX.
 */
export function reactCompiler(sourceDir: string): Plugin {
  return {
    name: "typed-grid-areas:react-compiler",
    enforce: "pre",
    async transform(code, id) {
      const file = id.split("?")[0] ?? id;
      if (!file.startsWith(sourceDir) || !/\.tsx?$/.test(file)) {
        return null;
      }
      const { code: compiled, map } = await compileWithReactCompiler(code, file);
      return { code: compiled, map };
    },
  };
}
