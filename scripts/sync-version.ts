#!/usr/bin/env node
// The version-sync invariant: package.json is the version's single source of
// truth; package-lock.json carries the identical version after this script
// runs. `changeset version` only writes package.json, so `npm run version`
// chains this after it.

import { existsSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type Versioned = { version: string };

export type Lockfile = Versioned & {
  packages?: { ""?: Versioned };
};

export type SyncInput = {
  pkg: Versioned;
  lock?: Lockfile | undefined;
};

export type SyncResult = {
  lock?: Lockfile | undefined;
  changed: readonly string[];
};

export function syncVersions({ pkg, lock }: SyncInput): SyncResult {
  const version = pkg.version;
  const changed: string[] = [];
  if (lock !== undefined && lock.version !== version) {
    lock.version = version;
    if (lock.packages?.[""] !== undefined) {
      lock.packages[""].version = version;
    }
    changed.push("package-lock.json");
  }
  return { lock, changed };
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

export async function syncVersionCli(): Promise<number> {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as Versioned;
  const lockPath = join(root, "package-lock.json");
  const lock = existsSync(lockPath)
    ? (JSON.parse(await readFile(lockPath, "utf8")) as Lockfile)
    : undefined;
  const result = syncVersions({ pkg, lock });
  if (lock !== undefined && result.changed.includes("package-lock.json")) {
    await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  }
  process.stdout.write(
    result.changed.length === 0
      ? `All manifests agree at ${pkg.version}\n`
      : `Synced ${result.changed.join(", ")} to ${pkg.version}\n`,
  );
  return 0;
}

if (isCliEntry()) {
  process.exitCode = await syncVersionCli();
}
