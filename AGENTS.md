## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on MichaelBuss/typed-grid-areas (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Workspaces

Every package is an npm workspace under `packages/` with its own toolchain: adding an adapter or pinning a workspace's own TypeScript means editing only its folder. See `docs/agents/workspaces.md`.

### Release

Releases run through Changesets: PRs that change what ships add a changeset; version fields, tags and publishing are never touched by hand. See `docs/agents/release.md`.
