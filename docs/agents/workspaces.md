# Workspaces: one package per folder, each with its own toolchain

The repo is an npm-workspaces monorepo (ADR 0004). Every package is a workspace under `packages/`:

| Folder                | Package                        | Published         |
| --------------------- | ------------------------------ | ----------------- |
| `packages/core`       | `typed-grid-areas`             | yes               |
| `packages/react`      | `@typed-grid-areas/react`      | yes               |
| `packages/acceptance` | `@typed-grid-areas/acceptance` | never (`private`) |

The root holds no package, only what spans them: the workspace list, the release scripts (`scripts/`, with their own tests), the Changesets config and the `just` recipes. `just build`, `just test`, `just test-browser` and `just typecheck` run each workspace's own `build`, `test`, `test:browser` and `typecheck` script with `npm run <script> --workspaces --if-present`, so a workspace without one is skipped. The root's `workspaces` lists `packages/core` before `packages/*`, so the core always builds first.

## Adding an adapter is adding a workspace

Everything an adapter needs lives in its own folder; root config stays untouched.

- **Folder and name:** `packages/<framework>`, named `@typed-grid-areas/<framework>`, starting at `"version": "0.0.0"`. Its first changeset (`minor`) releases 0.1.0.
- **Scripts:** its own `build`, `test` (unit and node projects), `test:browser` and `typecheck`, over its own `vitest.config.ts`, `tsconfig.json` and build config. Copy `packages/react` as the template, including `prepack` and `postpack`, which copy the repo's README and LICENSE into the tarball.
- **The core is a dependency like any other:** `"typed-grid-areas": "^<the core's current version>"`, imported only through its public entries (`typed-grid-areas`, `typed-grid-areas/adapter`). The workspace link resolves them to the core's built `dist/`, so the root recipes build the core first; before running one workspace's scripts on their own, run `npm run build:core`.
- **Acceptance tests:** add `"@typed-grid-areas/acceptance": "*"` to devDependencies and, in a browser spec, call `describePreferenceCard(mount)` and `describeIdCard(mount)`, where `mount` renders the design with your framework and returns its outermost element. Each `describe…` documents the markup it expects; `packages/react/src/acceptance.browser.spec.tsx` is the reference.
- **Framework tooling** (Vite plugins, compilers, test renderers) goes in the workspace's own devDependencies and its own `vitest.config.ts`, scoped there so it doesn't claim another workspace's files.

## Pinning a workspace's own TypeScript

The root and the core run TypeScript 7. A workspace whose tooling needs TypeScript 6 (Angular's compiler, `vue-tsc`, `svelte-check`, `svelte-package`) pins it under the plain name in its own devDependencies:

```json
"devDependencies": { "typescript": "~6.0.3" }
```

npm can't hoist it (the root's `typescript` is 7), so it installs into `packages/<framework>/node_modules`, and `npm run` in that workspace puts the workspace's `node_modules/.bin` ahead of the root's: its scripts get 6.0's `tsc`, everyone else keeps 7. Any other tool works the same way.

Pin a second TypeScript only under the name `typescript`. A copy under another name (`@typescript/typescript6`, an `npm:typescript@…` alias) is hoisted to the root, where its `tsc` bin can replace the root's. After `npm install`, `npx tsc --version` at the root must still print 7.

## Telling the release guidance what a build compiles

The release-guidance comment (`docs/agents/release.md`) maps a `files` entry that is a build folder back to the sources compiled into it, so a PR changing those sources is told it needs a changeset. It reads them from `tsconfig.build.json` when that config's `outDir` is the folder (tsc, and ng-packagr with `-c tsconfig.build.json`). A build tool that reads no `tsconfig.build.json` (svelte-package) declares them in the workspace's `package.json`, as folders or globs relative to the workspace:

```json
"buildSources": { "dist": ["src/lib"] }
```

`scripts/release-guidance.spec.ts` fails for any `files` entry that ships no source in the repo, naming the workspace.

## Publishing from a build folder

A tool that writes a complete publishable package (its own `package.json`) into a build folder, such as Angular's `ng-packagr`, declares it in the workspace's `package.json`:

```json
"publishConfig": { "directory": "dist" }
```

The release script builds every workspace and publishes that folder instead of the workspace. `node scripts/release.ts --dry-run` shows what it would publish, and from where.

A package npm has never seen can't get trusted publishing until a placeholder exists: the release fails with the steps for the maintainer (see `docs/agents/release.md`). That blocks releasing the package, not building or merging it.
