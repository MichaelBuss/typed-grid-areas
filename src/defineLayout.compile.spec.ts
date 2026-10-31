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

/** Seconds of tsc check time allowed for the stress file (spec #4). */
const CHECK_BUDGET_SECONDS = 0.15;

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

function writeProject(name: string, source: string): string {
  const dir = join(workDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "index.ts"),
    `import { defineLayout } from ${JSON.stringify(defineLayoutPath)};\n${source}`,
  );
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

describe("defineLayout at compile time", () => {
  it(`type-checks 30 definitions of 3 layouts with 2 breakpoints each in ≤ ${CHECK_BUDGET_SECONDS}s`, () => {
    const project = writeProject(
      "stress",
      Array.from({ length: 30 }, (_, i) => stressDefinition(i)).join(""),
    );

    // Best of three, so a busy machine doesn't fail the budget.
    const checkTimes = Array.from({ length: 3 }, () => {
      const { ok, output } = runTsc(project, "--extendedDiagnostics");
      expect(ok, output).toBe(true);
      const seconds = /Check time:\s+([\d.]+)s/.exec(output)?.[1];
      expect(seconds, output).toBeDefined();
      return Number(seconds);
    });

    expect(Math.min(...checkTimes)).toBeLessThanOrEqual(CHECK_BUDGET_SECONDS);
  });

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
