# Release: per-PR changesets, one Version Packages PR, npm

Releases run through [Changesets](https://github.com/changesets/changesets). Version intent travels inside each PR as a changeset file. One **Version Packages PR** collects them and is the only publish lever: merging it publishes `typed-grid-areas` to npm, tags `vX.Y.Z` and cuts a GitHub Release.

## The rules

- **Every PR that changes what ships adds a changeset** (`npm run changeset`). Pick the bump kind (`patch` for fixes, the usual default; `minor` for new features; `major` for breaking changes) and write the note for a package consumer: what they can now do, not the PR title. What ships is what `npm pack` puts in the tarball: `dist/` (built from `src/`, minus specs and test helpers), `LICENSE`, `README.md` and `package.json`. PRs that only touch tests, docs outside the README, CI, scripts or agent config need no changeset.
- **Every PR that resolves an issue writes `Closes #N` in its body**, so the release notes link the tracker. The release-guidance comment nudges this; nothing hard-fails.
- **Version fields are never edited by hand**, neither in `package.json` nor in `package-lock.json`. The Version Packages PR writes them: `changeset version`, then `scripts/sync-version.ts` brings the lockfile to the same version.
- **Tags are never pushed by hand.** `scripts/release.ts` creates `vX.Y.Z` after a successful publish.
- **Publishing is never triggered by hand.** No manual `npm publish`, no `workflow_dispatch` button: merging the Version Packages PR is the whole ceremony.

## How a release happens

1. PRs land on `main`, each carrying zero or more `.changeset/*.md` files.
2. On any push to `main` with pending changesets, `.github/workflows/publish.yml` (via `changesets/action`) opens or updates the Version Packages PR: bump kinds summed, `package.json`, `package-lock.json` and `CHANGELOG.md` written.
3. Merging that PR is the release: the workflow runs `scripts/release.ts`, which publishes to npm with trusted publishing (OIDC, `--provenance`; `prepack` builds `dist/`), tags, and creates the GitHub Release. A version npm already has is skipped, and the tag and release are only created when missing, so re-runs and other merges to `main` stay green.
4. If npm publishing isn't configured yet, the publish fails **instructively**: exact setup steps appear in the workflow summary and as a comment on the merged PR. Do them and re-run the workflow.

## The first release

The package starts at `0.0.0` with backfilled changesets (`.changeset/backfill-<pr>-<slug>.md`) for what shipped before this setup, so the first Version Packages PR releases `0.1.0` with a changelog covering it. A backfilled changeset starts with `pr: #<n>` (and `author: @<login>` when it differs), so `@changesets/changelog-github` links the original PR instead of the setup PR.

One-time human setup, after the first Version Packages PR merges and the release fails with its instructions:

- **npm**: publish or claim `typed-grid-areas` on npmjs.com, then configure **Trusted Publishing** for it: GitHub Actions, repository `MichaelBuss/typed-grid-areas`, workflow `.github/workflows/publish.yml`, with publishing allowed (not stage-only, which would need a human 2FA approval on every release). Then re-run the release workflow.
- **GitHub**: repo Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" must be on, or the changesets action can't open the Version Packages PR.

## What an agent checks on its own PRs

The release-guidance job in `ci.yml` posts one comment per PR, updated in place. It reports which shipped files change, the changeset's bump kind and note (or how to add one), and whether the body closes an issue. It skips bot-authored PRs: the Version Packages PR _is_ the release. Read it before asking for review, and act on its nudges.
