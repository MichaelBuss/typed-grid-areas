---
status: accepted
---

# Adapters put the CSS on the page with their framework's own tools, never a head library

Each definition's CSS has to be on the page once, before its grids lay out, and in server-rendered HTML wherever the framework renders on the server (#3). Frameworks disagree about how a component gets something into `<head>`: React 19 hoists `<style href precedence>`, Solid has `useAssets`, Angular has `DOCUMENT`, Svelte has `<svelte:head>`, Lit adopts style sheets per shadow root, and Vue and Preact have nothing at all. Each adapter uses what its framework offers. Where the framework has nothing for the server, the adapter exports a small collector the app calls in its server entry (Vue's `renderGridStyles(ssrContext)`, Preact's `createGridStyleSheet()`), rather than depending on a head-management library such as unhead or react-helmet.

## Considered options

- **Depend on the ecosystem's head library** (unhead for Vue, `@solidjs/meta` for Solid): server CSS without a line in the app's server entry, but a runtime dependency (and its version churn) in every app using the adapter, including apps that don't render on the server.
- **An inline `<style>` next to each grid**: no head API needed, but it renders once per instance, and inside a nested grid it becomes a stray direct child of the outer grid.

## Consequences

- In the browser, adapters insert one `<style data-typed-grid-areas="<grid id>">` per definition, found by that attribute, so a tag the server already rendered is reused and hydration adds no second copy. The exceptions are frameworks that own the tag themselves: Octane's `injectStyle` and Lit's adopted style sheets. The core's `typed-grid-areas/adapter` entry provides the tag's attribute, the insertion (ahead of the page's other styles, so the `typed-grid-areas` cascade layer is declared first) and the server-side tag rendering, so adapters don't each reinvent them.
- Server-rendered CSS isn't always in `<head>`. Vue and Preact need one line in the server entry. Lit's CSS lands in each component's declarative shadow root (it can't reach into shadow roots from `<head>`). Octane's leads the server output, following Octane's own convention for scoped styles. Each adapter's README says where its CSS goes and what the app has to do.
- In a shadow root, "once per page" becomes once per shadow root: document styles can't reach inside, so Lit adopts one shared style sheet into each root that renders a grid.
