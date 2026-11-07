/**
 * The site deploys to GitHub Pages only once a release is out, so it never
 * documents unreleased API: after the release workflow has published (a
 * release tag points at the commit it released), and on manual dispatch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { repoDir } from "./test-utils/tsc.ts";

type Step = { id?: string; run?: string; uses?: string; with?: Record<string, unknown> };
type Job = {
  needs?: string | Array<string>;
  if?: string;
  uses?: string;
  outputs?: Record<string, string>;
  permissions?: Record<string, string>;
  steps?: Array<Step>;
};
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };

const workflow = (file: string): Workflow =>
  parse(readFileSync(join(repoDir, ".github", "workflows", file), "utf8"));

describe("the Pages workflow", () => {
  const pages = workflow("pages.yml");

  it("runs only when called by another workflow or dispatched by hand, never on a push", () => {
    expect(Object.keys(pages.on).sort()).toEqual(["workflow_call", "workflow_dispatch"]);
  });

  it("builds the site through its workspace's script and deploys its dist to Pages", () => {
    const steps = Object.values(pages.jobs).flatMap(job => job.steps ?? []);
    expect(steps.some(step => step.run?.includes("npm run build -w @typed-grid-areas/site"))).toBe(
      true,
    );
    const upload = steps.find(step => step.uses?.startsWith("actions/upload-pages-artifact@"));
    expect(upload?.with?.path).toBe("packages/site/dist");
    expect(steps.some(step => step.uses?.startsWith("actions/deploy-pages@"))).toBe(true);
  });
});

describe("the release workflow", () => {
  const release = workflow("publish.yml");
  const callers = Object.entries(release.jobs).filter(
    ([, job]) => job.uses === "./.github/workflows/pages.yml",
  );

  it("deploys the site once, after its release job", () => {
    expect(callers).toHaveLength(1);
    const [, deploy] = callers[0]!;
    expect([deploy.needs].flat()).toEqual(["release"]);
    expect(deploy.permissions).toMatchObject({ pages: "write", "id-token": "write" });
  });

  it("deploys only when a release tag points at the commit it released", () => {
    const [, deploy] = callers[0]!;
    const job = release.jobs.release!;
    const output = /needs\.release\.outputs\.(\w+) == 'true'/.exec(deploy.if ?? "")?.[1];
    expect(output, "the deploy job's if").toBeDefined();
    const step = /steps\.(\w+)\.outputs\.(\w+)/.exec(job.outputs?.[output!] ?? "");
    expect(step, `the release job's ${output} output`).not.toBeNull();
    const check = job.steps?.find(candidate => candidate.id === step![1]);
    expect(check?.run).toContain("git tag --points-at HEAD");
    // After the release itself, which tags what it published.
    const steps = job.steps ?? [];
    const changesets = steps.findIndex(candidate =>
      candidate.uses?.startsWith("changesets/action@"),
    );
    expect(steps.indexOf(check!)).toBeGreaterThan(changesets);
  });
});
