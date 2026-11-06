---
status: accepted
---

# The README is the reference; the docs site explains and demonstrates

The library gets a docs site (#1), but the README stays the complete API reference, every adapter's section included. The site covers why the API looks the way it does, how the generated CSS works, and live demos, and it links to the README for each adapter's API instead of repeating it. The README ships inside every published package and matches the installed version, and the agent skill relies on that: it sends consumers' agents to `node_modules/typed-grid-areas/README.md` for their adapter's section, and lists the README among its sources. The README's code blocks are also type-checked, so it can't fall behind the API unnoticed.

## Considered options

- **Move the reference to the site and shrink the README to an overview**: one place to read everything, but the site only shows the latest release, so an app on an older version would read the wrong API, and the agent skill would lose an offline, version-matched reference.

## Consequences

- An adapter's API is documented in one place, the README. A site page that needs it links to the README's section rather than copying it.
- The site's own code blocks are type-checked, the same way the README's are.
