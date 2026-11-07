# Workspaces: one package per folder, each with its own toolchain

The repo is an npm-workspaces monorepo (ADR 0004). Every package is a workspace under `packages/`:

| Folder                | Package                        | Published         |
| --------------------- | ------------------------------ | ----------------- |
| `packages/core`       | `typed-grid-areas`             | yes               |
| `packages/react`      | `@typed-grid-areas/react`      | yes               |
| `packages/vue`        | `@typed-grid-areas/vue`        | yes               |
| `packages/svelte`     | `@typed-grid-areas/svelte`     | yes               |
| `packages/solid`      | `@typed-grid-areas/solid`      | yes               |
| `packages/preact`     | `@typed-grid-areas/preact`     | yes               |
| `packages/angular`    | `@typed-grid-areas/angular`    | yes, from `dist/` |
| `packages/lit`        | `@typed-grid-areas/lit`        | yes               |
| `packages/octane`     | `@typed-grid-areas/octane`     | yes, as source    |
| `packages/acceptance` | `@typed-grid-areas/acceptance` | never (`private`) |
| `packages/site`       | `@typed-grid-areas/site`       | never (`private`) |

The root holds no package, only what spans them: the workspace list, the release scripts (`scripts/`, with their own tests), the Changesets config and the `just` recipes. `just build`, `just test`, `just test-browser` and `just typecheck` run each workspace's own `build`, `test`, `test:browser` and `typecheck` script with `npm run <script> --workspaces --if-present`, so a workspace without one is skipped. The root's `workspaces` lists `packages/core` before `packages/*`, so the core always builds first.

## Adding an adapter is adding a workspace

Everything an adapter needs lives in its own folder; root config stays untouched, with one exception (an `overrides` entry, below).

- **Folder and name:** `packages/<framework>`, named `@typed-grid-areas/<framework>`, starting at `"version": "0.0.0"`. Its first changeset (`minor`) releases 0.1.0. Its `keywords` are `css-grid`, `grid-template-areas`, `layout`, `typescript` and `<framework>`, the folder's name (`scripts/npm-page.spec.ts` checks them).
- **Scripts:** its own `build`, `test` (unit and node projects), `test:browser` and `typecheck`, over its own `vitest.config.ts`, `tsconfig.json` and build config. Copy `packages/react` as the template, including `prepack` and `postpack`, which copy the repo's README and LICENSE into the tarball.
- **The core is a dependency like any other:** `"typed-grid-areas": "^<the core's current version>"`, imported only through its public entries (`typed-grid-areas`, `typed-grid-areas/adapter`). The workspace link resolves them to the core's built `dist/`, so the root recipes build the core first; before running one workspace's scripts on their own, run `npm run build:core`.
- **Acceptance tests:** add `"@typed-grid-areas/acceptance": "*"` to devDependencies and, in a browser spec, call `describePreferenceCard(mount)` and `describeIdCard(mount)`, where `mount` renders the design with your framework and returns its outermost element. Each `describe…` documents the markup it expects; `packages/react/src/acceptance.browser.spec.tsx` is the reference.
- **Development-only code** (the slot check, warnings) sits inside `if (process.env.NODE_ENV === "development") { … }`, alone in its `if` and wrapped in a `try` whose `catch` rethrows anything but a `ReferenceError` (no bundler, no `process`); `isDevelopment()` documents the shape. Or it sits inside the framework's own build-time flag (Svelte's `esm-env` `DEV`, Angular's `ngDevMode`). Only then do production builds drop it and development builds run it in a browser: bundlers can't see through `isDevelopment()` or `isDevMode()`, esbuild keeps code behind an early return or an `&&` with more terms, and bundlers leave `typeof process` alone, which is false in a browser. The packed-package spec checks it: write an entry using the packed adapter and call `describeDevelopmentCode` from `@typed-grid-areas/acceptance/bundles`; `packages/react/src/package.node.spec.ts` is the reference.
- **Framework tooling** (Vite plugins, compilers, test renderers) goes in the workspace's own devDependencies and its own `vitest.config.ts`, scoped there so it doesn't claim another workspace's files.

### The one root change an adapter may make: an `overrides` entry

npm only honours `overrides` in the root `package.json`, so when a third-party package's declared dependency range blocks the install (a peer range that excludes the framework version the adapter targets, or a dependency that would install a second copy of something the workspace pins), the adapter adds an entry there, scoped to that package:

```json
"overrides": { "vitest-browser-preact": { "preact": "^11.0.0" } }
```

Add one only when `npm install` fails without it, scope it to the package that declares the bad range (never a bare top-level override), and list it here with the upstream range it works around, so it can be dropped once upstream widens the range. The current entries:

- `vitest-browser-preact` → `preact: ^11.0.0`: it peers on `preact: ^10.0.0`; the Preact adapter targets Preact 11.
- `octane` → `typescript: $typescript` (the root's range): Octane peers on `typescript: ^5.9.3 || ^6.0.0 || >=7.1.0-0`, which rejects the root's 7.0.

## The docs site: `packages/site`

An Astro Starlight site (#1, ADR 0007), deployed to GitHub Pages at `https://michaelbuss.github.io/typed-grid-areas/` (base path `/typed-grid-areas/`). It renders live demos with the React adapter only, so its `build`, `typecheck` and `dev` scripts build `@typed-grid-areas/react` first. It pins TypeScript 6 for `astro check`; its tests compile code with the root's TypeScript 7, as the packages are checked.

- **Where it lives:** the repo slug, the Pages origin and the base path are in `src/site.ts`; the Astro config, the links the site builds and its specs read them there.
- **Stable adapters** are `src/examples.ts`'s list: the Try it page links each one's example, the code-block spec checks each one's blocks, and the specs check the Examples page has a code tab and `src/readme.ts` a README section for each. `examples.yml`'s matrix repeats it, and `src/examples.node.spec.ts` checks the two and the `examples/` folders agree.
- **Pages** are `src/content/docs/**/*.mdx`; their order is `src/sidebar.ts`. Link to the README with `readmeLink()` from `src/readme.ts` (each section at its package's release tag), never by hand.
- **Code blocks:** `src/codeBlocks.node.spec.ts` type-checks every ` ```ts `, ` ```tsx `, ` ```vue ` and ` ```svelte ` block, with the README's info strings for other adapters (` ```tsx preact `, ` ```tsx solid `, ` ```ts lit `, ` ```ts angular `). Each adapter's blocks are checked by its workspace's own checker on that workspace's TypeScript: `ngc` for Angular, the Vue workspace's `scripts/vue-tsc.cjs`, the Svelte workspace's `svelte-check`, the root's `tsc` for the rest. The adapters are the stable ones in `src/examples.ts`. A block can import the example designs from `./designs`. The spec writes the blocks to `.cache/` (git-ignored), not `node_modules`, where `svelte-check` reports nothing.
- **Type errors** on the Reading type errors page are tsc's real output for `src/typeErrors.ts`, captured in `src/typeErrors.captured.json`. When the error format changes, `src/typeErrors.node.spec.ts` fails: re-capture with `npx vitest run --project node -u` in the workspace, and re-read the page.
- **`test:browser`** builds the site and checks `dist/`: the page order, the generated content, and the Examples page's demos laying out in Chromium with JavaScript turned off.
- **Deploying:** `.github/workflows/pages.yml` runs only when `publish.yml` calls it after a release (a release tag at the released commit) or on manual dispatch, never on a push.
- **The playground** on Try it (`src/components/playground.tsx`) is the site's one React island; it's also embedded, without its CSS view, on the optional-areas page. `src/tryIt.built.spec.ts` drives it in Chromium.

## The example apps: `examples/`

`examples/<adapter>/` holds one small app per stable adapter, which the Try it page opens in StackBlitz (`https://stackblitz.com/github/MichaelBuss/typed-grid-areas/tree/main/examples/<adapter>`). They are **not** workspaces: each installs the published packages through `^` ranges, keeps no lockfile (`.npmrc` has `package-lock=false`), and pins TypeScript 6, since TypeScript 7's native binaries don't run in StackBlitz. Each has its own `typecheck` and `build` scripts, and its `designs.ts` is the acceptance package's PreferenceCard, copied (`packages/site/src/examples.node.spec.ts` checks it). `.github/workflows/examples.yml` installs, type-checks and builds every example on PRs that touch `examples/` (except the Version Packages PR, whose new ranges npm only has once it merges), and after each release (`publish.yml` calls it). An example's ranges on the core and its adapter are `^<current version>`, never edited by hand: the Version Packages PR moves them with each release (`scripts/sync-version.ts`, after `changeset version`), so the post-release run installs what that release published, and the site's examples spec fails when they lag. Nothing in `examples/` needs a changeset.

## Pinning a workspace's own TypeScript

The root and the core run TypeScript 7. A workspace whose tooling needs TypeScript 6 (Angular's compiler, `vue-tsc`, `svelte-check`, `svelte-package`) pins it under the plain name in its own devDependencies:

```json
"devDependencies": { "typescript": "~6.0.3" }
```

npm can't hoist it (the root's `typescript` is 7), so it installs into `packages/<framework>/node_modules`, and `npm run` in that workspace puts the workspace's `node_modules/.bin` ahead of the root's: its scripts get 6.0's `tsc`, everyone else keeps 7. Any other tool works the same way.

Pin a second TypeScript only under the name `typescript`. A copy under another name (`@typescript/typescript6`, an `npm:typescript@…` alias) is hoisted to the root, where its `tsc` bin can replace the root's. After `npm install`, `npx tsc --version` at the root must still print 7.

That rules out a tool's mode that needs TypeScript 7 beside its own 6 under an alias. `svelte-check --tsgo` wants `@typescript/native@npm:typescript@7` next to `typescript@~6`, so the Svelte workspace (#29) runs plain `svelte-check` on its pinned 6.0 instead. Revisit once `svelte-check` runs on TypeScript 7 alone.

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
