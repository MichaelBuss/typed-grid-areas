---
status: accepted
---

# The reference ships in every package; the docs site explains and demonstrates

The library gets a docs site (#1), but the complete API reference, every adapter's section included, stays a Markdown file shipped inside every published package: `REFERENCE.md` at the repo root. The site covers why the API looks the way it does, how the generated CSS works, and live demos, and it links to the reference for each adapter's API instead of repeating it. The reference matches the installed version, and the agent skill relies on that: it sends consumers' agents to `node_modules/typed-grid-areas/REFERENCE.md` for their adapter's section, and lists the reference among its sources. The reference's code blocks are also type-checked, so it can't fall behind the API unnoticed.

The README is the overview that npm and GitHub show: a short pitch (what the library does, one example, a table of adapters) that links to the docs site and to the reference. It ships beside the reference, and its code blocks are type-checked the same way.

## Amended (#63)

This ADR first made the README itself the reference. That left every npm page a 1,400-line reference, with a section for each of nine frameworks, which made the library look bigger and harder than it is and never showed what it does at a glance. The reference moved, unchanged and with the same headings, to `REFERENCE.md`; everything the decision protects (shipping with the package, the agent skill's offline, version-matched copy, type-checked code blocks) holds for it.

## Considered options

- **Move the reference to the site and shrink the README to an overview**: one place to read everything, but the site only shows the latest release, so an app on an older version would read the wrong API, and the agent skill would lose an offline, version-matched reference.
- **Keep the reference in the README**: one file, but the README is every package's npm page, and a full reference there can't also be a pitch (#63).

## Consequences

- An adapter's API is documented in one place, `REFERENCE.md`. A site page that needs it links to its section, at the documenting package's release tag, rather than copying it.
- The README stays short: it shows the library and points at the docs site and the reference, and doesn't document options.
- The site's own code blocks are type-checked, the same way the README's and the reference's are.
