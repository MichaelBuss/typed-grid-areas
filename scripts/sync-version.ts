#!/usr/bin/env node
// The version-sync invariant: each workspace's package.json is the single
// source of truth for its version and dependency ranges; package-lock.json
// carries the identical values after this script runs. `changeset version`
// only writes the package.json files (bumping versions, and the ranges of
// workspaces that depend on a bumped one), so `npm run version` chains this
// after it, and `npm ci` keeps accepting the lockfile.

import { existsSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readWorkspaces } from "./workspaces.ts";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

export type Manifest = { version: string } & {
  [field in DependencyField]?: Record<string, string>;
};

export type Lockfile = {
  version?: string;
  packages?: Record<string, Partial<Manifest> & Record<string, unknown>>;
};

export type SyncInput = {
  /** Each workspace's folder (relative to the root, as the lockfile keys it) and manifest. */
  workspaces: ReadonlyArray<{ dir: string; manifest: Manifest }>;
  lock?: Lockfile | undefined;
};

export type SyncResult = {
  lock?: Lockfile | undefined;
  changed: readonly string[];
};

export function syncVersions({ workspaces, lock }: SyncInput): SyncResult {
  let changed = false;
  for (const { dir, manifest } of workspaces) {
    const entry = lock?.packages?.[dir];
    if (entry === undefined) {
      continue;
    }
    if (entry.version !== manifest.version) {
      entry.version = manifest.version;
      changed = true;
    }
    for (const field of DEPENDENCY_FIELDS) {
      if (JSON.stringify(entry[field]) === JSON.stringify(manifest[field])) {
        continue;
      }
      if (manifest[field] === undefined) {
        delete entry[field];
      } else {
        entry[field] = { ...manifest[field] };
      }
      changed = true;
    }
  }
  return { lock, changed: changed ? ["package-lock.json"] : [] };
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

export async function syncVersionCli(
  root = join(dirname(fileURLToPath(import.meta.url)), ".."),
): Promise<number> {
  const workspaces = await Promise.all(
    readWorkspaces(root).map(async ({ dir }) => ({
      dir,
      manifest: JSON.parse(await readFile(join(root, dir, "package.json"), "utf8")) as Manifest,
    })),
  );
  const lockPath = join(root, "package-lock.json");
  const lock = existsSync(lockPath)
    ? (JSON.parse(await readFile(lockPath, "utf8")) as Lockfile)
    : undefined;
  const result = syncVersions({ workspaces, lock });
  if (lock !== undefined && result.changed.includes("package-lock.json")) {
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  process.stdout.write(
    result.changed.length === 0
      ? "package-lock.json already agrees with every workspace\n"
      : `Synced ${result.changed.join(", ")} to every workspace's package.json\n`,
  );
  return 0;
}

if (isCliEntry()) {
  process.exitCode = await syncVersionCli();
}
