import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

/** The site workspace's folder. */
export const siteDir = resolve(import.meta.dirname, "..", "..");

/** The repo's root folder. */
export const repoDir = resolve(siteDir, "..", "..");

/**
 * The repo's own TypeScript (the root's), which the library's packages are
 * checked with, not the 6.0 the site pins for `astro check`.
 */
export const repoTsc = join(
  dirname(createRequire(join(repoDir, "package.json")).resolve("typescript/package.json")),
  "bin",
  "tsc",
);
