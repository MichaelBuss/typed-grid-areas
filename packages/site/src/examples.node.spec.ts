/**
 * The example apps in `examples/`, which the Try it page links to: one per
 * stable adapter, each a standalone app on the published packages (never an
 * npm workspace), and a CI workflow that installs, type-checks and builds
 * every one of them on PRs that touch them and after each release.
 */
import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { designSource } from "./designs.ts";
import { examples } from "./examples.ts";
import { repoDir } from "./test-utils/tsc.ts";

const examplesDir = join(repoDir, "examples");
const stable = ["react", "vue", "svelte", "solid", "preact", "angular", "lit"];

type Manifest = {
  name: string;
  private?: boolean;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: Array<string>;
};

const manifest = (path: string): Manifest => JSON.parse(readFileSync(path, "utf8"));

/** An example's own source files (not its dependencies or build output). */
const sources = (adapter: string) =>
  globSync("src/**/*.{ts,tsx,vue,svelte}", { cwd: join(examplesDir, adapter) }).map(file =>
    readFileSync(join(examplesDir, adapter, file), "utf8"),
  );

describe("the example apps", () => {
  it("are one per stable adapter, and the Try it page links to each", () => {
    const folders = readdirSync(examplesDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    expect(folders.sort()).toEqual([...stable].sort());
    expect(examples.map(example => example.adapter)).toEqual(stable);
  });

  it("are not npm workspaces", () => {
    const root = manifest(join(repoDir, "package.json"));
    const workspaces = (root.workspaces ?? []).flatMap(pattern =>
      globSync(pattern, { cwd: repoDir }),
    );
    expect(workspaces.length).toBeGreaterThan(0);
    for (const dir of workspaces) {
      expect(dir.replaceAll("\\", "/")).not.toMatch(/^examples\b/);
    }
  });

  describe.each(stable)("%s", adapter => {
    const dir = join(examplesDir, adapter);
    const pkg = () => manifest(join(dir, "package.json"));

    it("depends on the published core and adapter through ^ ranges, never the private acceptance package", () => {
      const { dependencies = {}, devDependencies = {} } = pkg();
      const all = { ...dependencies, ...devDependencies };
      expect(dependencies["typed-grid-areas"]).toMatch(/^\^\d+\.\d+\.\d+$/);
      expect(dependencies[`@typed-grid-areas/${adapter}`]).toMatch(/^\^\d+\.\d+\.\d+$/);
      expect(Object.keys(all)).not.toContain("@typed-grid-areas/acceptance");
      for (const [name, range] of Object.entries(all)) {
        expect(range, name).not.toMatch(/^(file|link|workspace):|^\*$/);
      }
    });

    it("is a private app that can be type-checked and built", () => {
      expect(pkg().private).toBe(true);
      expect(Object.keys(pkg().scripts ?? {})).toEqual(
        expect.arrayContaining(["build", "typecheck"]),
      );
    });

    it("defines the PreferenceCard as the acceptance package does: optional areas, a breakpoint, a nested grid", () => {
      const designs = globSync("src/**/designs.ts", { cwd: dir });
      expect(designs).toHaveLength(1);
      const source = readFileSync(join(dir, designs[0]!), "utf8");
      expect(source).toContain(designSource("preferenceCardGrid"));
      expect(source).toContain(designSource("preferenceContentGrid"));
      expect(sources(adapter).join("\n")).toMatch(/nest: \{ content: /);
    });

    it("invites the reader to misspell an area and see the type error", () => {
      expect(sources(adapter).join("\n")).toMatch(/misspell/i);
    });

    it("keeps no lockfile, so CI and StackBlitz install the latest published versions", () => {
      expect(existsSync(join(dir, "package-lock.json"))).toBe(false);
    });
  });
});

type Step = { run?: string; uses?: string; with?: Record<string, unknown> };
type Job = {
  needs?: string | Array<string>;
  if?: string;
  uses?: string;
  strategy?: { matrix?: Record<string, Array<string>> };
  defaults?: { run?: { "working-directory"?: string } };
  steps?: Array<Step>;
};
type Workflow = { on: Record<string, { paths?: Array<string> } | null>; jobs: Record<string, Job> };

const workflow = (file: string): Workflow =>
  parse(readFileSync(join(repoDir, ".github", "workflows", file), "utf8"));

describe("the examples workflow", () => {
  const examplesWorkflow = workflow("examples.yml");
  const jobs = Object.values(examplesWorkflow.jobs);

  it("runs on PRs that touch examples/, and when another workflow calls it", () => {
    expect(examplesWorkflow.on.pull_request?.paths).toContain("examples/**");
    expect(Object.keys(examplesWorkflow.on)).toContain("workflow_call");
  });

  it("installs, type-checks and builds every example, each in its own folder", () => {
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.strategy?.matrix?.example).toEqual(stable);
    expect(job!.defaults?.run?.["working-directory"]).toBe("examples/${{ matrix.example }}");
    const runs = (job!.steps ?? []).flatMap(step => (step.run ? [step.run] : []));
    expect(runs).toEqual(["npm install", "npm run typecheck", "npm run build"]);
  });

  it("runs after each release, against what was just published", () => {
    const release = workflow("publish.yml");
    const callers = Object.values(release.jobs).filter(
      job => job.uses === "./.github/workflows/examples.yml",
    );
    expect(callers).toHaveLength(1);
    expect([callers[0]!.needs].flat()).toEqual(["release"]);
    expect(callers[0]!.if).toBe("needs.release.outputs.released == 'true'");
  });
});
