/**
 * Compiles components with Angular's compiler (`ngc`, `strictTemplates`) the
 * way an app's build does, and checks that templates naming an area or a
 * grid wrongly fail to compile, each with an error of its own.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const packageDir = resolve(import.meta.dirname, "..");
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-templates");
const ngc = join(
  dirname(createRequire(import.meta.url).resolve("@angular/compiler-cli/package.json")),
  "bundles",
  "src",
  "bin",
  "ngc.js",
);

/** A component whose template is `template`, using the PreferenceCard-like `Card`. */
function component(template: string): string {
  return `
import { Component } from "@angular/core";
import { defineLayout } from "typed-grid-areas";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "@typed-grid-areas/angular";

const Content = createGrid(
  defineLayout({
    areas: ["icon?", "title"],
    layouts: [{ template: "title", breakpoints: { "@sm": { template: "icon title" } } }],
  }),
);
const Card = createGrid(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);

@Component({
  selector: "app-example",
  imports: [TgaGrid, TgaArea, TgaSizeContainer],
  template: \`${template}\`,
})
export class Example {
  protected readonly Card = Card;
}
`;
}

const cases = {
  valid: `
    <div [tgaGrid]="Card">
      <label [tgaArea]="Card.input"><input type="checkbox" /></label>
      <div tgaSizeContainer>
        <div [tgaGrid]="Card.content">
          <span [tgaArea]="Card.content.icon">★</span>
          <h2 [tgaArea]="Card.content.title">Title</h2>
        </div>
      </div>
    </div>`,
  misspelledArea: `<div [tgaGrid]="Card"><span [tgaArea]="Card.inputt"></span></div>`,
  misspelledNestedArea: `<div [tgaGrid]="Card.content"><span [tgaArea]="Card.content.iconn"></span></div>`,
  areaAsString: `<div [tgaGrid]="Card"><span tgaArea="input"></span></div>`,
  boundString: `<div [tgaGrid]="Card"><span [tgaArea]="'input'"></span></div>`,
  gridAsArea: `<div [tgaGrid]="Card"><div [tgaArea]="Card.content"></div></div>`,
  areaAsGrid: `<div [tgaGrid]="Card.input"></div>`,
};

let output: string;

beforeAll(() => {
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  for (const [name, template] of Object.entries(cases)) {
    writeFileSync(join(workDir, `${name}.ts`), component(template));
  }
  writeFileSync(
    join(workDir, "tsconfig.json"),
    JSON.stringify({
      extends: join(packageDir, "tsconfig.json"),
      include: [],
      files: Object.keys(cases).map(name => `${name}.ts`),
      compilerOptions: {
        noEmit: true,
        types: [],
        paths: { "@typed-grid-areas/angular": [join(packageDir, "src", "index.ts")] },
        allowImportingTsExtensions: true,
      },
      // Every case imports every directive; only the ones it misuses matter.
      angularCompilerOptions: {
        strictTemplates: true,
        extendedDiagnostics: { checks: { unusedStandaloneImports: "suppress" } },
      },
    }),
  );
  try {
    output = execFileSync(process.execPath, [ngc, "-p", join(workDir, "tsconfig.json")], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const { stdout, stderr } = error as { stdout: string; stderr: string };
    output = `${stdout}${stderr}`;
  }
  // ngc colours its output whatever `pretty` says.
  output = output.replace(/\x1b\[[0-9;]*m/g, "");
}, 120_000);

/** The compiler's errors in one case's file, as their first lines. */
function errorsIn(name: keyof typeof cases): Array<string> {
  return output
    .split("\n")
    .filter(line => line.startsWith(`${name}.ts:`) && line.includes(" error "));
}

describe("templates, with strictTemplates", () => {
  it("compile when every grid and area is named right", () => {
    expect(errorsIn("valid")).toEqual([]);
  });

  it.each([
    ["a misspelled area", "misspelledArea", "inputt"],
    ["a misspelled area of a nested grid", "misspelledNestedArea", "iconn"],
    ["an area as a plain attribute string", "areaAsString", "string"],
    ["an area as a bound string", "boundString", "string"],
    ["a grid where an area belongs", "gridAsArea", "AreaRef"],
    ["an area where a grid belongs", "areaAsGrid", "AnyGridRef"],
  ] as const)("fail with %s", (_, name, mentions) => {
    const errors = errorsIn(name);
    expect(errors, output).toHaveLength(1);
    expect(errors[0]).toContain(mentions);
  });
});
