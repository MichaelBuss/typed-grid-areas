// The repo's npm workspaces, as the release scripts see them: in the order
// the root package.json lists them (the core first, so it builds and
// publishes before the adapters that depend on it), each package once.

import { existsSync, globSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Workspace = {
  name: string;
  version: string;
  /** The workspace's folder, relative to the repo root, with forward slashes. */
  dir: string;
  /** `private: true` packages are never published or versioned. */
  private: boolean;
  /**
   * `publishConfig.directory`: the build output folder, relative to `dir`, to
   * publish instead of the workspace itself, for tools that write a complete
   * publishable package (its own package.json) into a build folder.
   */
  publishDirectory: string | undefined;
  /** The manifest's `files`. */
  files?: readonly string[] | undefined;
};

type Manifest = {
  name: string;
  version?: string;
  private?: boolean;
  files?: string[];
  publishConfig?: { directory?: string };
  workspaces?: string[] | { packages?: string[] };
};

function readManifest(path: string): Manifest {
  return JSON.parse(readFileSync(path, "utf8")) as Manifest;
}

export function readWorkspaces(root: string): Workspace[] {
  const rootManifest = readManifest(join(root, "package.json"));
  const patterns = Array.isArray(rootManifest.workspaces)
    ? rootManifest.workspaces
    : (rootManifest.workspaces?.packages ?? []);
  const dirs: string[] = [];
  for (const pattern of patterns) {
    for (const dir of globSync(pattern, { cwd: root }).sort()) {
      const normalized = dir.replaceAll("\\", "/");
      if (!dirs.includes(normalized) && existsSync(join(root, normalized, "package.json"))) {
        dirs.push(normalized);
      }
    }
  }
  return dirs.map(dir => {
    const manifest = readManifest(join(root, dir, "package.json"));
    return {
      name: manifest.name,
      version: manifest.version ?? "0.0.0",
      dir,
      private: manifest.private === true,
      publishDirectory: manifest.publishConfig?.directory,
      files: manifest.files,
    };
  });
}
