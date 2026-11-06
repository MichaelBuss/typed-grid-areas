---
status: accepted
---

# A precompiled definition's CSS ships as a stylesheet, not through the adapter

When the build plugin (`@typed-grid-areas/vite`) precompiles a definition (#10), its CSS is emitted through the bundler as a real `.css` file, and the adapter renders no `<style>` tag for that definition. This narrows ADR 0005, which has adapters put every definition's CSS on the page with their framework's tools: that still holds for definitions that aren't precompiled. We chose a stylesheet so precompiling removes the CSS from the JavaScript, not just the code that generates it: the browser caches it, it applies before any script runs, and a page with no JavaScript still lays out.

## Considered options

- **Keep the CSS as a string the adapter inserts**: no change to ADR 0005 and nothing new for adapters to detect, but the CSS stays in the JavaScript bundle and still needs the adapter to run before grids lay out.

## Consequences

- Each adapter has to tell a precompiled definition from a runtime one, and skip its style tag for the former.
- Lit is the exception: its CSS lives in each component's shadow root, which a document stylesheet can't reach, so Lit keeps inserting the precompiled CSS string into the shadow roots itself.
- A definition the plugin can't evaluate at build time falls back to runtime CSS through the adapter, with a build warning (an error with the plugin's `strict` option).
