# typed-grid-areas — Skill Spec

typed-grid-areas describes a component's CSS grid once, as its areas and a few text templates, and derives the layout for every combination of absent optional areas at every breakpoint as generated CSS. Each UI framework renders it through an adapter package.

## Domains

| Domain  | Description                                                             | Skills           |
| ------- | ----------------------------------------------------------------------- | ---------------- |
| layouts | Describing a grid with `defineLayout` and rendering it with an adapter. | typed-grid-areas |

## Skill Inventory

| Skill            | Type | Domain  | What it covers                                                                                                  | Failure modes |
| ---------------- | ---- | ------- | --------------------------------------------------------------------------------------------------------------- | ------------- |
| typed-grid-areas | core | layouts | Writing, converting and debugging layouts: derivation rules, overrides, breakpoints, layers, adapter rendering. | 4             |

## Failure Mode Inventory

### typed-grid-areas (4 failure modes)

| #   | Mistake                                         | Priority | Source                                   | Cross-skill? |
| --- | ----------------------------------------------- | -------- | ---------------------------------------- | ------------ |
| 1   | Overriding cases the derivation already handles | HIGH     | `packages/core/src/engine/derive.ts`     | —            |
| 2   | Override without breakpoints ignores width      | HIGH     | `packages/core/src/engine/rules.ts`      | —            |
| 3   | Nested grid with breakpoints in an auto track   | HIGH     | README (Breakpoints)                     | —            |
| 4   | Slot wrapped instead of a direct child          | MEDIUM   | `packages/core/src/adapter/slotCheck.ts` | —            |

## Subsystems & Reference Candidates

| Skill            | Subsystems                                                        | Reference candidates                             |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| typed-grid-areas | Adapters: React, Vue, Svelte, Solid, Preact, Angular, Lit, Octane | `references/examples.md`, `references/errors.md` |

## Recommended Skill File Structure

- **Core skills:** `typed-grid-areas`, shipped in the core package (`packages/core/skills/`), since every adapter user installs the core.
- **Framework skills:** none. The skill's steps hold for every adapter; its examples use React and point at each adapter's README section.
- **Reference files:** `references/examples.md` (worked examples) and `references/errors.md` (every type error and warning).

## Coverage and batch history

- **typed-grid-areas 0.2.0, #20 (PR #40):** the skill was authored at the repo root, covering writing, converting and debugging layouts. Its code blocks are type-checked by `packages/react/src/readme.compile.spec.ts`.
- **#41:** the skill moved into the core package with its references under `references/`, registered with Intent in domain `layouts`. Decisions: it ships in the core rather than a package of its own (the steps hold for every adapter); the compile spec stays the type-checker of record for the `tsx` examples, with `intent maintainer check` as an extra layer in `ci.yml` instead of the generated `check-skills.yml`; snippets that relied on the compile spec's implicit `defineLayout` import now import it, so Intent's own example check types them. Its sources (the derivation engine, the grid-config validator, the adapter slot check and the repo README) are the `sources` of its frontmatter, mirrored in `skill_tree.yaml`. `review.ignore` leaves out changesets, changelogs, CI, agent docs, release scripts and specs, so the Version Packages PR passes the gate.
- **Remaining work:** none planned. Adapter-specific skills are out of scope until an adapter needs guidance its README section doesn't give.
