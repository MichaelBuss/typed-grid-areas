/**
 * Compile-time checks that must fail: `svelte-check` on `types/errors/`
 * reports a type error on exactly the lines marked `error:` there. (Svelte
 * markup has no `@ts-expect-error`.)
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const errorsDir = resolve(__dirname, "types", "errors");
const svelteCheck = join(
  dirname(createRequire(import.meta.url).resolve("svelte-check/package.json")),
  "bin",
  "svelte-check",
);

/** `svelte-check`'s errors in a folder, as `file:line` and message. */
function svelteCheckErrors(dir: string): Array<{ at: string; message: string }> {
  let output: string;
  try {
    output = execFileSync(
      process.execPath,
      [
        svelteCheck,
        "--workspace",
        dir,
        "--tsconfig",
        join(dir, "tsconfig.json"),
        "--output",
        "machine",
      ],
      { encoding: "utf8" },
    );
  } catch (error) {
    output = String((error as { stdout?: string }).stdout);
  }
  return Array.from(output.matchAll(/^\d+ ERROR "([^"]+)" (\d+):\d+ "(.*)"$/gm), match => ({
    at: `${match[1]}:${match[2]}`,
    message: match[3]!,
  }));
}

/** The lines of `file` marked `error:`, as `file:line`. */
function markedLines(file: string): Array<string> {
  return readFileSync(join(errorsDir, file), "utf8")
    .split("\n")
    .flatMap((line, index) => (/(\/\/|<!--) error:/.test(line) ? [`${file}:${index + 1}`] : []));
}

describe("svelte-check", () => {
  it("reports misspelled areas, misspelled nest keys and foreign attributes", () => {
    const errors = svelteCheckErrors(errorsDir);

    expect(errors.map(error => error.at).sort()).toEqual(markedLines("TypeErrors.svelte").sort());
    expect(errors.map(error => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("'inputt' does not exist"),
        expect.stringContaining("'iconn' does not exist"),
        expect.stringContaining("'contnet'"),
      ]),
    );
  }, 60_000);
});
