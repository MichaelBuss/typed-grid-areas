#!/usr/bin/env node
// The release-guidance comment: one comment per PR, updated in place, that
// tells a human (or an AFK agent) what will ship, at which bump kind, whether
// a changeset is present, and whether the body closes an issue. Informational
// only — it never fails a PR.
//
// Every public workspace is a package of its own. What a package ships is
// what `npm pack` puts in its tarball: its package.json, the entries of its
// `files`, and the repo's README.md and LICENSE (copied in when it packs). A
// `files` entry that is the build's output directory ships the sources the
// build compiles into it (see `shippedSources`), so a PR that changes those
// sources changes what ships.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readWorkspaces, type Workspace } from "./workspaces.ts";

/** Repo paths a package ships. */
export type Shipped = {
  include: readonly string[];
  exclude: readonly string[];
};

/** A published package and the repo paths it ships. */
export type ShippingPackage = {
  name: string;
  shipped: Shipped;
};

export type BumpKind = "patch" | "minor" | "major";

export type ChangesetEntry = {
  package: string;
  kind: BumpKind;
  note: string;
};

function normalize(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
}

/** A path names itself and, when it's a directory, everything under it. */
function andBelow(path: string): string[] {
  const normalized = normalize(path);
  return normalized.includes("*") ? [normalized] : [normalized, `${normalized}/**`];
}

/**
 * The repo paths one `files` entry of a workspace ships. An entry that is the
 * build's output folder ships the sources the build compiles into it: those
 * the workspace declares for it in its manifest's `buildSources` (for a build
 * tool that reads no tsconfig.build.json, such as svelte-package), else those
 * its tsconfig.build.json includes when that config's `outDir` is the entry
 * (tsc, ng-packagr). Any other entry ships itself.
 */
export function shippedSources(root: string, workspace: Workspace, entry: string): Shipped {
  const within = (path: string) => `${normalize(workspace.dir)}/${normalize(path)}`;
  const declared = workspace.buildSources?.[normalize(entry)];
  if (declared !== undefined) {
    return { include: declared.map(within).flatMap(andBelow), exclude: [] };
  }
  const buildPath = join(root, workspace.dir, "tsconfig.build.json");
  if (existsSync(buildPath)) {
    const build = JSON.parse(readFileSync(buildPath, "utf8")) as {
      compilerOptions: { outDir: string };
      include: string[];
      exclude?: string[];
    };
    if (normalize(entry) === normalize(build.compilerOptions.outDir)) {
      return {
        include: build.include.map(within).flatMap(andBelow),
        exclude: (build.exclude ?? []).map(within).flatMap(andBelow),
      };
    }
  }
  return { include: andBelow(within(entry)), exclude: [] };
}

/** The repo's public workspaces, each with what it ships. */
export function shippingPackages(root: string): ShippingPackage[] {
  return readWorkspaces(root)
    .filter(workspace => !workspace.private)
    .map(workspace => {
      const within = (path: string) => `${normalize(workspace.dir)}/${normalize(path)}`;
      const include = [within("package.json"), within("README.md"), within("LICENSE")];
      const exclude: string[] = [];
      for (const entry of workspace.files ?? []) {
        const sources = shippedSources(root, workspace, entry);
        include.push(...sources.include);
        exclude.push(...sources.exclude);
      }
      // Every package carries the repo's README and LICENSE.
      include.push("README.md", "LICENSE");
      return { name: workspace.name, shipped: { include, exclude } };
    });
}

export function globMatch(pattern: string, file: string): boolean {
  const normalized = normalize(file);
  let rest = pattern;
  let source = "^";
  while (rest.length > 0) {
    if (rest.startsWith("**/")) {
      source += "(?:.*/)?";
      rest = rest.slice(3);
      continue;
    }
    if (rest === "**") {
      source += ".*";
      rest = "";
      continue;
    }
    if (rest.startsWith("**")) {
      source += ".*";
      rest = rest.slice(2);
      continue;
    }
    if (rest.startsWith("*")) {
      source += "[^/]*";
      rest = rest.slice(1);
      continue;
    }
    const ch = rest.at(0);
    if (ch === undefined) {
      break;
    }
    source += /[.+^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch;
    rest = rest.slice(1);
  }
  return new RegExp(`${source}$`).test(normalized);
}

export function isShippedPath(file: string, shipped: Shipped): boolean {
  const normalized = normalize(file);
  const included = shipped.include.some(pattern => globMatch(pattern, normalized));
  if (!included) {
    return false;
  }
  return !shipped.exclude.some(pattern => globMatch(pattern, normalized));
}

export function parseChangeset(content: string): ChangesetEntry[] {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (match === null) {
    return [];
  }
  const [, frontmatter = "", body = ""] = match;
  // @changesets/changelog-github reads these lines as links, not as the note.
  const note = body.replace(/^\s*(?:pr|pull|pull\s+request|commit|author|user):.*$/gim, "").trim();
  const entries: ChangesetEntry[] = [];
  for (const line of frontmatter.split(/\r?\n/)) {
    const entry = /^\s*["']?([^"':]+)["']?:\s*(patch|minor|major)\s*$/.exec(line);
    if (entry !== null) {
      entries.push({
        package: entry[1]!.trim(),
        kind: entry[2] as BumpKind,
        note,
      });
    }
  }
  return entries;
}

export function closesIssue(body: string): boolean {
  return /\b(closes?|closed|fixes?|fixed|resolves?|resolved)\s*:?\s+#\d+/i.test(body);
}

export type Guidance = {
  headline: string;
  markdown: string;
};

export function guidance(input: {
  changedFiles: readonly string[];
  packages: readonly ShippingPackage[];
  changesets: readonly ChangesetEntry[];
  closesIssue: boolean;
}): Guidance {
  const sections = input.packages
    .map(({ name, shipped }) => ({
      name,
      files: input.changedFiles.filter(file => isShippedPath(file, shipped)),
      own: input.changesets.filter(entry => entry.package === name),
    }))
    .filter(section => section.files.length > 0 || section.own.length > 0);
  const lines: string[] = [];

  if (sections.length === 0) {
    lines.push("**No shipped files change in this PR.**");
    lines.push("**No changeset**, and none needed.");
  }
  for (const { name, files, own } of sections) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(`### \`${name}\``);
    lines.push("");
    lines.push(
      files.length === 0
        ? "**No shipped files change.**"
        : `**Shipped files change:** ${formatFiles(files)}`,
    );
    if (own.length > 0) {
      lines.push("");
      lines.push("**Changeset** (what the release notes will say):");
      lines.push("");
      for (const entry of own) {
        lines.push(`- **${entry.kind}** — ${entry.note}`);
      }
    } else {
      lines.push("");
      lines.push(
        "**No changeset yet — none of these changes will ship when this merges.** Add one with `npm run changeset`, and write a note worth reading in a changelog. Assumed bump for a fix-shaped PR is **patch**; set it explicitly: `patch` for fixes, `minor` for new features, `major` for breaking changes.",
      );
    }
  }

  if (input.closesIssue) {
    lines.push("");
    lines.push("The body closes an issue, so the release notes can link it.");
  } else {
    lines.push("");
    lines.push(
      "Nudge: the body doesn't close an issue. If this PR resolves one, adding `Closes #123` (its real number) links the release notes and the tracker together — never a gate, just a kindness to future readers.",
    );
  }

  const markdown = lines.join("\n");
  const own = sections.flatMap(section => section.own);
  const headline =
    sections.length === 0
      ? "No shipped files change in this PR"
      : sections.some(section => section.own.length === 0)
        ? "Shipped files change without a changeset"
        : `Changeset: ${own.map(entry => `${entry.kind} for ${entry.package}`).join("; ")}`;
  return {
    headline,
    markdown,
  };
}

function formatFiles(files: readonly string[]): string {
  if (files.length <= 8) {
    return files.join(", ");
  }
  const shown = files.slice(0, 8).join(", ");
  return `${shown}, and ${files.length - 8} more`;
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

function flag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return argv[index + 1];
}

async function writeGithubOutput(result: Guidance): Promise<void> {
  const path = process.env.GITHUB_OUTPUT;
  if (path === undefined) {
    return;
  }
  const block = [
    `headline=${result.headline}`,
    "detail<<EOF",
    result.headline,
    "EOF",
    "markdown<<EOF",
    result.markdown,
    "EOF",
    "",
  ].join("\n");
  await writeFile(path, block, { flag: "a" });
}

export async function releaseGuidanceCli(argv: readonly string[]): Promise<number> {
  const changedPath = flag(argv, "--changed-files");
  const body = flag(argv, "--pr-body") ?? process.env.PR_BODY ?? "";
  if (changedPath === undefined) {
    process.stderr.write(
      "Usage: node scripts/release-guidance.ts --changed-files changed.txt [--pr-body body.md]\n",
    );
    return 1;
  }
  const packages = shippingPackages(process.cwd());
  const changedFiles = (await readFile(changedPath, "utf8"))
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== "");
  const changesets: ChangesetEntry[] = [];
  for (const file of changedFiles) {
    if (!/^\.changeset\/[^/]+\.md$/.test(file) || file.endsWith("README.md")) {
      continue;
    }
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    changesets.push(...parseChangeset(content));
  }
  const result = guidance({
    changedFiles,
    packages,
    changesets,
    closesIssue: closesIssue(body),
  });
  await writeGithubOutput(result);
  process.stdout.write(`${result.markdown}\n`);
  return 0;
}

if (isCliEntry()) {
  process.exitCode = await releaseGuidanceCli(process.argv.slice(2));
}
