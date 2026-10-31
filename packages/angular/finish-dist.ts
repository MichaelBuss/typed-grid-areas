/**
 * Finishes the package ng-packagr wrote into `dist/`, which is what's
 * published (`publishConfig.directory`): adds the repo's README and LICENSE,
 * and drops the workspace-only fields ng-packagr copies into its manifest.
 * `files` names `dist` itself, so inside `dist` it would ship nothing.
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const packageDir = import.meta.dirname;
const dist = join(packageDir, "dist");
const root = resolve(packageDir, "..", "..");

for (const file of ["README.md", "LICENSE"]) {
  copyFileSync(join(root, file), join(dist, file));
}

const manifestPath = join(dist, "package.json");
const {
  files: _files,
  publishConfig: _publishConfig,
  ...manifest
} = JSON.parse(readFileSync(manifestPath, "utf8"));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
