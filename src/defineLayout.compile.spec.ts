/**
 * Runs the repo's tsc on generated files: a stress file that must type-check
 * within the compile budget, and a file of mistakes whose error messages must
 * name the problem.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(__dirname, "..");
const workDir = join(root, "node_modules", ".cache", "typed-grid-areas-compile");
const tsc = join(root, "node_modules", "typescript", "bin", "tsc");
const defineLayoutPath = join(root, "src", "defineLayout");

/**
 * Seconds of tsc check time allowed for the stress file (spec #4), on the
 * reference machine (a recent Apple Silicon laptop, where it takes ~0.065s).
 *
 * Absolute check times vary several-fold between machines (CI runners are
 * ~3.5x slower), so the test also times a control project in the same run:
 * the same definitions, ten times over, with `defineLayout` retyped to take
 * templates as plain strings, so none of the type-level checks run. Its time
 * measures the machine, not the library's types; the budget is scaled by how much
 * slower than the reference the control ran (never tightened below 0.15s). A
 * regression in type-level cost slows only the stress project, so it still
 * fails the budget anywhere.
 */
const CHECK_BUDGET_SECONDS = 0.15;

/** Plain-typed definitions in the control project: enough to time well above tsc's 1ms resolution. */
const CONTROL_DEFINITIONS = 300;

/** Check time of the control project on the reference machine. */
const CONTROL_REFERENCE_SECONDS = 0.03;

function stressDefinition(i: number): string {
  return `
export const grid${i} = defineLayout({
  areas: ["icon${i}?", "title${i}", "tag${i}?", "body${i}", "badge${i}?"],
  layouts: [
    {
      template: \`
        icon${i}  tag${i}
        title${i} title${i}
        body${i}  body${i}\`,
      rows: "auto auto minmax(0, 1fr)",
      columns: "min-content minmax(0, 1fr)",
      align: { tag${i}: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: "icon${i} title${i} tag${i} / body${i} body${i} body${i}",
          columns: "min-content minmax(0, 1fr) auto",
        },
        "@lg": {
          template: "icon${i}+badge${i} title${i} tag${i} / icon${i} body${i} body${i}",
          rows: "auto minmax(0, 1fr)",
          columns: "12rem minmax(0, 1fr) auto",
          align: { badge${i}: { justify: "end", align: "start" } },
        },
      },
    },
    {
      when: ["icon${i}"],
      unless: ["tag${i}"],
      template: "icon${i} title${i} / body${i} body${i}",
      columns: "min-content minmax(0, 1fr)",
      breakpoints: {
        "@md": { template: "icon${i} title${i} body${i}", columns: "min-content auto 1fr" },
        "@[40rem]": { template: "icon${i} title${i} / icon${i} body${i}", rows: "auto 1fr" },
      },
    },
    {
      unless: ["icon${i}"],
      template: "title${i} tag${i} / body${i} body${i}",
      rows: "auto 1fr",
      breakpoints: {
        "@sm": { template: "title${i} tag${i} . / body${i} body${i} body${i}" },
        "@xl": { template: "title${i} body${i} tag${i}", align: { title${i}: { align: "center" } } },
      },
    },
  ],
});
`;
}

const mistakes = `
const areas = ["icon", "information", "cardTag?"] as const;
defineLayout({
  areas,
  layouts: [
    { template: "icon iconn / information information" },
    { template: "icon cardTag+badge / information information" },
    { template: "icon cardTag / information" },
    { template: "icon cardTag / information information", columns: "min-content minmax(0, 1fr) auto" },
    { template: "icon cardTag / information information", rows: "auto" },
  ],
});
`;

/**
 * Rebinds `defineLayout` to a signature that takes the same input shape with
 * templates as plain strings, so the library is still checked but none of the
 * type-level template checks run.
 */
const untypedDefineLayout = `
import { defineLayout as typedDefineLayout, type LayoutInput } from ${JSON.stringify(defineLayoutPath)};
const defineLayout = typedDefineLayout as unknown as (config: {
  areas: ReadonlyArray<string>;
  layouts: ReadonlyArray<LayoutInput<string>>;
}) => unknown;
`;

function writeProject(
  name: string,
  source: string,
  header = `import { defineLayout } from ${JSON.stringify(defineLayoutPath)};\n`,
): string {
  const dir = join(workDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.ts"), `${header}${source}`);
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      extends: join(root, "tsconfig.json"),
      include: [],
      files: ["index.ts"],
      compilerOptions: { types: ["node"] },
    }),
  );
  return join(dir, "tsconfig.json");
}

function runTsc(project: string, ...args: Array<string>): { ok: boolean; output: string } {
  try {
    const output = execFileSync(
      process.execPath,
      [tsc, "-p", project, "--pretty", "false", ...args],
      {
        encoding: "utf8",
      },
    );
    return { ok: true, output };
  } catch (error) {
    return { ok: false, output: String((error as { stdout?: string }).stdout) };
  }
}

/** tsc's check time for a project, which must type-check cleanly. */
function checkSeconds(project: string): number {
  const { ok, output } = runTsc(project, "--extendedDiagnostics");
  expect(ok, output).toBe(true);
  const seconds = /Check time:\s+([\d.]+)s/.exec(output)?.[1];
  expect(seconds, output).toBeDefined();
  return Number(seconds);
}

describe("defineLayout at compile time", () => {
  it(`type-checks 30 definitions of 3 layouts with 2 breakpoints each in ≤ ${CHECK_BUDGET_SECONDS}s, scaled to machine speed`, () => {
    const definitions = (count: number) =>
      Array.from({ length: count }, (_, i) => stressDefinition(i)).join("");
    const stress = writeProject("stress", definitions(30));
    const control = writeProject("control", definitions(CONTROL_DEFINITIONS), untypedDefineLayout);

    // Interleaved, best of five each, so a busy moment hits both projects alike.
    const stressTimes: Array<number> = [];
    const controlTimes: Array<number> = [];
    for (let run = 0; run < 5; run++) {
      stressTimes.push(checkSeconds(stress));
      controlTimes.push(checkSeconds(control));
    }
    const machineSlowdown = Math.max(1, Math.min(...controlTimes) / CONTROL_REFERENCE_SECONDS);

    expect(Math.min(...stressTimes)).toBeLessThanOrEqual(CHECK_BUDGET_SECONDS * machineSlowdown);
    // Ten tsc runs take longer than Vitest's default 5s timeout on CI runners.
  }, 60_000);

  it("names each problem in its error message", () => {
    const { ok, output } = runTsc(writeProject("mistakes", mistakes));

    expect(ok).toBe(false);
    expect(output).toContain('{ _unknownArea: "iconn"; }');
    expect(output).toContain('{ _unknownArea: "badge"; }');
    expect(output).toContain("{ _raggedRow: { row: 2; cells: 1; expected: 2; }; }");
    expect(output).toContain("{ _columnCountError: { expected: 2; got: 3; }; }");
    expect(output).toContain("{ _rowCountError: { expected: 2; got: 1; }; }");
  });
});
