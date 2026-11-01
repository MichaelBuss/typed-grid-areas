# Agent skill: shipped in the core, maintained with TanStack Intent

The core ships one skill for consumers' agents, `packages/core/skills/typed-grid-areas/`: `SKILL.md` plus the files under `references/`, which `SKILL.md` links relatively. It is in the core's `files`, so it is in every `typed-grid-areas` tarball and an edit to it needs a changeset (`docs/agents/release.md`). Consumers enable it with `npx @tanstack/intent@latest install`.

## Tooling

`@tanstack/intent` is a root devDependency, pinned to an exact version because its CLI still changes between minor releases (`scaffold` was removed after launch). Run the installed copy, `npm exec --no -- intent …`, never a downloaded `latest`. Bump the pin on purpose, and re-run `intent maintainer check` when you do.

Intent's records live in `_artifacts/` at the repo root: `skill_tree.yaml` (the skill's path, references and sources), `domain_map.yaml` (its tasks) and `skill_spec.md` (decisions and history). The skill's `sources` are a list in its frontmatter; `npm exec --no -- intent maintainer sync` copies them, its description and its reference list into `skill_tree.yaml`, and keeps the core's `files` and `tanstack-intent` keyword in place. Paths in `sources` are relative to `packages/core`; the repo README is `MichaelBuss/typed-grid-areas:README.md`.

## Checks

- `packages/react/src/readme.compile.spec.ts` type-checks every `ts` and `tsx` block in the skill, as it does the README's. It is the check of record; Intent's own example check is an extra layer, and it only types a block that imports what it uses, so skill snippets import `defineLayout` explicitly.
- `packages/core/src/package.node.spec.ts` checks the skill's files are in the tarball, and nothing else outside `dist/`.
- CI runs `intent maintainer check` (validation, generated metadata and recorded reviews). There is no separate `check-skills.yml`; if `intent maintainer setup` writes one, delete it.

## Recording a review

The check fails while a change since the last recorded review is unreviewed: the skill, its sources, its records, or any file outside `review.ignore` in `skill_tree.yaml`. Before asking for review, on your branch:

```sh
npm exec --no -- intent maintainer review --base main
```

Read each item. Update the skill where a change made it wrong, then record the outcome and commit `.intent/review-state.json`:

```sh
npm exec --no -- intent maintainer review --unchanged "<why the guidance still holds>"
npm exec --no -- intent maintainer review --updated "<what changed in the guidance>"
```

Record last: any later edit to a reviewed file reopens its item. `intent stale` reports the same drift for a released version.
