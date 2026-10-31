/**
 * What a `.tsrx` caller must not write. `@ts-expect-error` doesn't reach into
 * `.tsrx` templates, so each case is its own fixture, checked with
 * `tsrx-tsc`, which must report the misspelled member.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const packageDir = resolve(__dirname, "..");
const workDir = join(packageDir, "node_modules", ".cache", "typed-grid-areas-tsrx");
const tsrxTsc = join(packageDir, "node_modules", ".bin", "tsrx-tsc");

const prelude = `
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "@typed-grid-areas/octane";

const Content = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
const Card = createGridComponent(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);
`;

/** Type-checks one `.tsrx` module with `tsrx-tsc` and returns its diagnostics. */
function check(name: string, code: string): string {
  const dir = join(workDir, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "fixture.tsrx"), `${prelude}\n${code}\n`);
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      extends: join(packageDir, "tsconfig.json"),
      include: [],
      files: ["fixture.tsrx"],
      compilerOptions: {
        types: [],
        paths: { "@typed-grid-areas/octane": [join(packageDir, "src", "index.ts")] },
      },
    }),
  );
  try {
    execFileSync(tsrxTsc, ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "";
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? error);
  }
}

describe("grid components in a .tsrx caller", () => {
  it("type-check when every member names an area", () => {
    const output = check(
      "valid",
      `export function Example(props: { selectable: boolean }) @{
        <Card class="gap-4" render={<section />}>
          @if (props.selectable) {
            <Card.input render={<label for="notify" />}><input id="notify" type="checkbox" /></Card.input>
          }
          <Card.content>
            <Card.content.icon>{'★'}</Card.content.icon>
            <Card.content.title>{'Notify me'}</Card.content.title>
          </Card.content>
        </Card>
      }`,
    );

    expect(output).toBe("");
  });

  it("fail tsrx-tsc on a misspelled area", () => {
    const output = check(
      "misspelled-area",
      `export function Example() @{
        <Card>
          <Card.contnet />
        </Card>
      }`,
    );

    expect(output).toMatch(/error TS\d+: Property 'contnet' does not exist/);
  });

  it("fail tsrx-tsc on a misspelled nested area, inside @if too", () => {
    const output = check(
      "misspelled-nested-area",
      `export function Example(props: { selectable: boolean }) @{
        <Card>
          <Card.content>
            @if (props.selectable) {
              <Card.content.iconn />
            }
            <Card.content.title />
          </Card.content>
        </Card>
      }`,
    );

    expect(output).toMatch(/error TS\d+: Property 'iconn' does not exist/);
  });
});
