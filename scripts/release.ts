#!/usr/bin/env node
// The release script: the one place a version ships. The changesets GitHub
// Action runs it on every push to main that has no pending changesets — i.e.
// right after the Version Packages PR merges — but any other main merge lands
// here too, so everything is idempotent: every public workspace whose version
// npm doesn't have yet is published, a version npm already has is skipped, and
// the `<name>@<version>` tag and GitHub Release are only created when missing.
// npm publishes via trusted publishing (OIDC, --provenance). When npm
// publishing is not configured yet for a package, the failure is instructive:
// exact human setup steps naming each package, never a silent skip, never an
// opaque error.
//
// `--dry-run` prints what would be published, and from which folder, and
// fails the same way for packages that need setup, without touching npm,
// git or GitHub beyond reading what npm already has.

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readWorkspaces, type Workspace } from "./workspaces.ts";

/** The versions npm has of a package, or "unpublished" when npm has never seen it. */
export type NpmVersions = readonly string[] | "unpublished";

export type ReleaseStep =
  | { action: "publish"; name: string; version: string; directory: string; tag: string }
  | { action: "skip"; name: string; version: string; tag: string }
  | { action: "placeholder"; name: string; version: string };

export function planRelease(
  workspaces: readonly Workspace[],
  npm: ReadonlyMap<string, NpmVersions>,
): ReleaseStep[] {
  return workspaces
    .filter(workspace => !workspace.private)
    .map((workspace): ReleaseStep => {
      const { name, version } = workspace;
      const onNpm = npm.get(name) ?? [];
      if (onNpm === "unpublished") {
        return { action: "placeholder", name, version };
      }
      const tag = `${name}@${version}`;
      if (onNpm.includes(version)) {
        return { action: "skip", name, version, tag };
      }
      const directory =
        workspace.publishDirectory === undefined
          ? workspace.dir
          : `${workspace.dir}/${workspace.publishDirectory.replace(/^\.\/|\/$/g, "")}`;
      return { action: "publish", name, version, directory, tag };
    });
}

export function isNpmSetupError(stderr: string): boolean {
  return /E404|E403|ENEEDAUTH|402 Payment Required|403 Forbidden|404 Not Found|not have permission/.test(
    stderr,
  );
}

export function isNpmAlreadyPublished(stderr: string): boolean {
  return /E409|cannot publish over|previously published/i.test(stderr);
}

const scopeOf = (name: string) => (name.startsWith("@") ? name.split("/")[0] : undefined);

export function npmSetupInstructions(input: {
  /** Packages npm has never seen, which need a placeholder before trusted publishing. */
  placeholders: readonly string[];
  /** Packages npm refused to publish, which need trusted publishing configured. */
  trustedPublishing: readonly string[];
}): string {
  const all = [...new Set([...input.placeholders, ...input.trustedPublishing])];
  const list = (names: readonly string[]) => names.map(name => `\`${name}\``).join(", ");
  const steps: string[] = [];

  const scopes = [...new Set(input.placeholders.map(scopeOf))].filter(scope => scope !== undefined);
  for (const scope of scopes) {
    steps.push(
      `Create the \`${scope}\` organisation on npmjs.com, if it doesn't exist yet, so its packages can be published.`,
    );
  }
  if (input.placeholders.length > 0) {
    const commands = input.placeholders
      .map(
        name =>
          `mkdir -p placeholder && cd placeholder\necho '{ "name": "${name}", "version": "0.0.0" }' > package.json\nnpm publish --access public\ncd .. && rm -rf placeholder`,
      )
      .join("\n\n");
    steps.push(
      `npm has never seen ${list(input.placeholders)}, and only lets you configure trusted publishing on a package that exists. Publish a placeholder of each once, from your own machine and npm account:\n\n${`\`\`\`sh\n${commands}\n\`\`\``.replace(/^/gm, "   ")}`,
    );
  }
  steps.push(
    `On npmjs.com, configure **Trusted Publishing** in the settings of each of ${list(all)}: GitHub Actions, repository \`MichaelBuss/typed-grid-areas\`, workflow \`.github/workflows/publish.yml\`, with publishing allowed (not stage-only).`,
  );
  steps.push(
    "Re-run the failed release workflow — it skips anything already published and finishes the rest.",
  );

  return `npm can't publish ${list(all)} yet — trusted publishing is not set up for ${all.length === 1 ? "it" : "them"}. A human needs to:

${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
}

type ShResult = { status: number; stdout: string; stderr: string };

function sh(command: string, args: readonly string[], cwd?: string): ShResult {
  const result = spawnSync(command, args, { encoding: "utf8", cwd });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function isCliEntry(): boolean {
  const argv1 = process.argv[1];
  if (argv1 === undefined) {
    return false;
  }
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv1);
  } catch {
    return import.meta.url === pathToFileURL(resolve(argv1)).href;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** What npm has of a package; undefined when that can't be determined. */
async function npmVersions(name: string): Promise<NpmVersions | undefined> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(attempt * 2000);
    }
    const result = sh("npm", ["view", name, "versions", "--json"]);
    if (result.status !== 0) {
      if (/E404|404 Not Found/.test(result.stderr)) {
        return "unpublished";
      }
      continue;
    }
    try {
      const parsed = JSON.parse(result.stdout) as string[] | string;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      continue;
    }
  }
  return undefined;
}

async function appendSummary(text: string): Promise<void> {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (path === undefined) {
    return;
  }
  await appendFile(path, text);
}

const SETUP_COMMENT_MARKER = "<!-- typed-grid-areas-npm-setup -->";

async function commentOnMergedPr(instructions: string): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.GITHUB_SHA;
  if (repo === undefined || sha === undefined) {
    return;
  }
  const pr = sh("gh", ["api", `repos/${repo}/commits/${sha}/pulls`, "--jq", ".[0].number"]);
  const number = pr.stdout.trim();
  if (pr.status !== 0 || number === "") {
    return;
  }
  const body = `${SETUP_COMMENT_MARKER}\n\n${instructions}`;
  const existing = sh("gh", [
    "api",
    "--paginate",
    `repos/${repo}/issues/${number}/comments`,
    "--jq",
    `[.[] | select(.body | contains("${SETUP_COMMENT_MARKER}"))][0].id`,
  ]);
  const id = existing.stdout.trim();
  if (existing.status === 0 && id !== "" && id !== "null") {
    sh("gh", [
      "api",
      "--method",
      "PATCH",
      `repos/${repo}/issues/comments/${id}`,
      "-F",
      `body=${body}`,
    ]);
    return;
  }
  sh("gh", ["pr", "comment", number, "--repo", repo, "--body", body]);
}

function ensureTag(tag: string): boolean {
  // Push unconditionally: a prior run may have tagged locally without
  // pushing, and pushing an existing tag is a harmless no-op.
  if (sh("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`]).status !== 0) {
    if (sh("git", ["tag", tag]).status !== 0) {
      return false;
    }
  }
  return sh("git", ["push", "origin", tag]).status === 0;
}

function ensureGithubRelease(tag: string): boolean {
  if (sh("gh", ["release", "view", tag]).status === 0) {
    return true;
  }
  const withNotes = sh("gh", ["release", "create", tag, "--generate-notes", "--title", tag]);
  if (withNotes.status === 0) {
    return true;
  }
  return sh("gh", ["release", "create", tag]).status === 0;
}

export type ReleaseOptions = {
  /** The repo root, whose package.json lists the workspaces. */
  root: string;
  dryRun: boolean;
  npmVersions: (name: string) => Promise<NpmVersions | undefined>;
  write: (text: string) => void;
  writeError?: (text: string) => void;
};

export async function releaseCli(options: ReleaseOptions): Promise<number> {
  const { root, dryRun, write } = options;
  const writeError = options.writeError ?? write;
  const workspaces = readWorkspaces(root);

  const npm = new Map<string, NpmVersions>();
  for (const workspace of workspaces.filter(workspace => !workspace.private)) {
    const versions = await options.npmVersions(workspace.name);
    if (versions === undefined) {
      writeError(
        `Cannot determine what npm already has for ${workspace.name}; not risking a double publish.\n`,
      );
      return 1;
    }
    npm.set(workspace.name, versions);
  }

  const plan = planRelease(workspaces, npm);
  const placeholders = plan.filter(step => step.action === "placeholder").map(step => step.name);
  const trustedPublishing: string[] = [];
  let failed = false;

  if (!dryRun && plan.some(step => step.action === "publish")) {
    // Every package builds against the core's build output, so build them all, in workspace order.
    const build = sh("npm", ["run", "build"], root);
    write(build.stdout);
    writeError(build.stderr);
    if (build.status !== 0) {
      writeError("The build failed; nothing is released.\n");
      return 1;
    }
  }

  for (const step of plan) {
    if (step.action === "placeholder") {
      continue;
    }
    if (step.action === "skip") {
      write(`${step.name}@${step.version} is already on npm; ensuring tag and release exist.\n`);
      if (!dryRun && !(ensureTag(step.tag) && ensureGithubRelease(step.tag))) {
        writeError(`Tag or release ${step.tag} could not be ensured.\n`);
        failed = true;
      }
      continue;
    }
    if (dryRun) {
      write(
        `Would publish ${step.name}@${step.version} from ${step.directory}, tagged ${step.tag}.\n`,
      );
      continue;
    }

    write(`Publishing ${step.name}@${step.version} from ${step.directory} with provenance.\n`);
    const publish = sh(
      "npm",
      ["publish", "--provenance", "--access", "public"],
      join(root, step.directory),
    );
    // Pass npm's own output through, success included: it is the only place
    // that says whether the version went live or was staged for approval.
    write(publish.stdout);
    writeError(publish.stderr);
    if (publish.status !== 0 && isNpmAlreadyPublished(publish.stderr)) {
      write(`npm already has ${step.tag} (a prior run got there first); skipping.\n`);
    } else if (publish.status !== 0) {
      if (isNpmSetupError(publish.stderr)) {
        trustedPublishing.push(step.name);
      }
      writeError(`npm publish failed; ${step.tag} is not released.\n`);
      failed = true;
      continue;
    }

    if (!ensureTag(step.tag)) {
      writeError(`Published, but the ${step.tag} tag could not be created or pushed.\n`);
      failed = true;
      continue;
    }
    if (!ensureGithubRelease(step.tag)) {
      writeError(
        `Published and tagged, but the GitHub Release ${step.tag} could not be created.\n`,
      );
      failed = true;
      continue;
    }
    write(`Released ${step.tag}: npm, tag, GitHub Release.\n`);
  }

  if (placeholders.length > 0 || trustedPublishing.length > 0) {
    const instructions = npmSetupInstructions({ placeholders, trustedPublishing });
    write(`\n${instructions}\n`);
    if (!dryRun) {
      await appendSummary(`## npm publish needs human setup\n\n${instructions}\n`);
      await commentOnMergedPr(instructions);
    }
    return 1;
  }
  return failed ? 1 : 0;
}

if (isCliEntry()) {
  process.exitCode = await releaseCli({
    root: join(dirname(fileURLToPath(import.meta.url)), ".."),
    dryRun: process.argv.includes("--dry-run"),
    npmVersions,
    write: text => process.stdout.write(text),
    writeError: text => process.stderr.write(text),
  });
}
