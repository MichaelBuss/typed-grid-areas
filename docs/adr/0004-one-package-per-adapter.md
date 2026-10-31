---
status: accepted
---

# One package per adapter, in a monorepo

The core stays `typed-grid-areas`, and every adapter, React included, ships as its own package, `@typed-grid-areas/<framework>`, from one npm-workspaces monorepo. Adapters for eight frameworks (#3) need build steps and package metadata of their own: `ng-packagr` for Angular, the Qwik optimizer and a `qwik` export condition, `svelte-package` and a `svelte` condition, uncompiled JSX under a `solid` condition, source-only publishing for Octane. In one package, all of that would land in one `package.json` and one build, and every framework's toolchain would be a dev dependency of the core.

## Considered options

- **Subpaths of one package** (`typed-grid-areas/vue`, as `/react` was): one version and one changeset, but one manifest carrying every framework's export conditions and metadata, and one build running every framework's compiler.
- **Monorepo, with React left at `typed-grid-areas/react`**: no breaking change, but React would be the one adapter that lives in the core package and is versioned with it.

## Consequences

- Moving React out breaks `typed-grid-areas/react` imports. We take that at 0.2.0, while the package is days old.
- Publishing needs the `@typed-grid-areas` npm organisation and trusted publishing configured per package.
- Anything adapters share has to be public core API, since they import the core as a package.
