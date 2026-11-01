# Release: per-PR changesets, one Version Packages PR, npm

Releases run through [Changesets](https://github.com/changesets/changesets). The repo publishes several packages, each versioned on its own: the core, `typed-grid-areas`, and one `@typed-grid-areas/<framework>` per adapter (see `docs/agents/workspaces.md`). Version intent travels inside each PR as a changeset file. One **Version Packages PR** collects them and is the only publish lever: merging it publishes every package with a new version to npm, tags each `<name>@<version>` (`typed-grid-areas@0.2.0`, `@typed-grid-areas/react@0.1.0`) and cuts a GitHub Release per tag.

## The rules

- **Every PR that changes what ships adds a changeset** (`npm run changeset`), naming each package it changes. Pick the bump kind per package (`patch` for fixes, the usual default; `minor` for new features; `major` for breaking changes; on a 0.x package a breaking change is `minor`) and write the note for that package's consumer: what they can now do, not the PR title. What a package ships is what `npm pack` puts in its tarball: its `dist/` (built from its `src/`, minus specs and test helpers), its `package.json`, the repo's `README.md` and `LICENSE`, and, for the core, the agent skill under `packages/core/skills/` (so a PR that only edits the skill needs a changeset too). PRs that only touch tests, docs outside the README, CI, scripts, agent config or the private `packages/acceptance` need no changeset.
- **Every PR that resolves an issue writes `Closes #N` in its body**, so the release notes link the tracker. The release-guidance comment nudges this; nothing hard-fails.
- **Version fields are never edited by hand**, neither in any `package.json` nor in `package-lock.json`. The Version Packages PR writes them: `changeset version` bumps each package (and moves an adapter's `typed-grid-areas` range when the core it depends on bumps out of it), then `scripts/sync-version.ts` brings the lockfile to the same versions and ranges. Private workspaces are never versioned.
- **Tags are never pushed by hand.** `scripts/release.ts` creates each `<name>@<version>` tag after a successful publish.
- **Publishing is never triggered by hand.** No manual `npm publish`, no `workflow_dispatch` button: merging the Version Packages PR is the whole ceremony. The one exception is the placeholder a brand-new package needs once, below.

## How a release happens

1. PRs land on `main`, each carrying zero or more `.changeset/*.md` files.
2. On any push to `main` with pending changesets, `.github/workflows/publish.yml` (via `changesets/action`) opens or updates the Version Packages PR: bump kinds summed per package, every `package.json`, `package-lock.json` and each package's `CHANGELOG.md` written.
3. Merging that PR is the release: the workflow runs `scripts/release.ts`, which builds every workspace and publishes each public one whose version npm doesn't have yet, core first, with trusted publishing (OIDC, `--provenance`), then tags it and creates its GitHub Release. A version npm already has is skipped, and tags and releases are only created when missing, so re-runs and other merges to `main` stay green. A workspace that declares `publishConfig.directory` is published from that build folder.
4. If npm publishing isn't set up yet for a package, the publish fails **instructively**: exact setup steps, naming each package that needs them, appear in the workflow summary and as a comment on the merged PR. Do them and re-run the workflow.

`node scripts/release.ts --dry-run` prints what would be published, from which folder and with which tag, and fails the same way for packages that need setup; it only reads from npm.

## Setting up a new package on npm

npm only lets you configure trusted publishing on a package that already exists, so each new package needs one human step before its first release. When the release finds a package npm has never seen, it skips it, publishes the rest, and fails with these steps:

- **Organisation**: create the `@typed-grid-areas` organisation on npmjs.com (once, before the first scoped package).
- **Placeholder**: publish a placeholder of the package once from your own machine and account (`npm publish --access public` from a folder holding only a `package.json` with its name and version `0.0.0`; the failure prints the commands).
- **Trusted Publishing**: in the package's settings on npmjs.com, configure GitHub Actions, repository `MichaelBuss/typed-grid-areas`, workflow `.github/workflows/publish.yml`, with publishing allowed (not stage-only, which would need a human 2FA approval on every release). Then re-run the release workflow.

This blocks releasing that package, not building or merging it. Packages still waiting: `@typed-grid-areas/react`, and each adapter as it lands (`vue`, `svelte`, `solid`, `preact`, `angular`, `lit`, `octane`).

One-time GitHub setup: repo Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" must be on, or the changesets action can't open the Version Packages PR.

## Backfilled changesets

A backfilled changeset (`.changeset/backfill-<pr>-<slug>.md`, from before this setup) starts with `pr: #<n>` (and `author: @<login>` when it differs), so `@changesets/changelog-github` links the original PR instead of the setup PR.

## What an agent checks on its own PRs

The release-guidance job in `ci.yml` posts one comment per PR, updated in place. For each package, it reports which of its shipped files change and the changeset's bump kind and note (or how to add one); it also says whether the body closes an issue. It skips bot-authored PRs: the Version Packages PR _is_ the release. Read it before asking for review, and act on its nudges.
