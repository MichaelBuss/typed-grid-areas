/**
 * The Reading type errors page shows each mistake in `typeErrors.ts` with
 * the error tsc reports for it. This test compiles the mistakes against the
 * built core, as a consumer gets it, and captures tsc's output into
 * `typeErrors.captured.json`, which the page reads: when the error format
 * changes, the capture no longer matches and this test fails. Re-capture
 * with `npx vitest run --project node -u` and re-read the page.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mistakes } from "./typeErrors.ts";
import { repoTsc, siteDir } from "./test-utils/tsc.ts";

const workDir = join(siteDir, "node_modules", ".cache", "typed-grid-areas-type-errors");

type CapturedError = { line: number; message: string };

/** tsc's errors for each mistake, by name: the line each is on, and its message. */
function compileMistakes(): Record<string, Array<CapturedError>> {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  for (const { name, code } of mistakes) {
    writeFileSync(join(workDir, `${name}.ts`), code);
  }
  writeFileSync(
    join(workDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      files: mistakes.map(({ name }) => `${name}.ts`),
    }),
  );
  let output = "";
  try {
    // From the project's folder, so tsc names each file without a path.
    execFileSync(process.execPath, [repoTsc, "-p", ".", "--pretty", "false"], {
      cwd: workDir,
      encoding: "utf8",
    });
  } catch (error) {
    output = String((error as { stdout?: string }).stdout);
  }

  const errors: Record<string, Array<CapturedError>> = Object.fromEntries(
    mistakes.map(({ name }) => [name, []]),
  );
  // Each error starts `<file>.ts(<line>,<column>): error TS…`; its further lines are indented.
  const start = /^(\w+)\.ts\((\d+),\d+\): (error [\s\S]*?)(?=^\S|$(?![\s\S]))/gm;
  for (const [, file, line, message] of output.matchAll(start)) {
    errors[file!]!.push({ line: Number(line), message: message!.trimEnd() });
  }
  return errors;
}

describe("the mistakes on the Reading type errors page", () => {
  const errors = compileMistakes();

  it("each get exactly one error, the useful part on its second line", () => {
    const useful: Record<string, string> = {
      unknownArea: '{ _unknownArea: "iconn"; }',
      unknownLayer: '{ _unknownArea: "badgee"; }',
      raggedRow: "{ _raggedRow: { row: 2; cells: 1; expected: 2; }; }",
      columnCount: "{ _columnCountError: { expected: 2; got: 3; }; }",
      rowCount: "{ _rowCountError: { expected: 2; got: 1; }; }",
    };
    expect(Object.keys(errors).sort()).toEqual(Object.keys(useful).sort());
    for (const [name, part] of Object.entries(useful)) {
      expect(errors[name], name).toHaveLength(1);
      expect(errors[name]![0]!.message.split("\n")[1], name).toContain(part);
    }
  });

  it("match the errors the page shows", async () => {
    const captured = Object.fromEntries(
      Object.entries(errors).map(([name, messages]) => [name, messages[0]]),
    );
    await expect(`${JSON.stringify(captured, null, 2)}\n`).toMatchFileSnapshot(
      "./typeErrors.captured.json",
    );
  });
});
