---
status: accepted
---

# Rendering your own element as a slot is spelled the framework's way, not `asChild` everywhere

React's adapter makes your own element a slot (or the grid) with `asChild`, which clones the single child element and merges props onto it. Not every framework can clone a child: Solid's JSX produces real DOM nodes, Octane templates pass children as render functions, Svelte passes snippets, and Angular and Lit put attributes on the user's element directly. Each adapter spells the concept the way its framework's component libraries already do: `asChild` in React, Preact and Vue (Reka UI's `as-child`), `as` in Solid (Kobalte), a `child` snippet in Svelte (Bits UI), `render={<el />}` in Octane, and in Angular and Lit you put the slot directive or `data-area` binding on any element, so there's nothing to opt into.

## Considered options

- **`asChild` in every adapter**: one spelling to document, but in Solid, Svelte and Octane it would need runtime tricks that fight the framework (and break with its compiler), while its users already know their libraries' idiom.

## Consequences

- The core's slot check can't name the remedy in its stray-child warning: each adapter supplies its own wording ("make it a slot with asChild", "… with `as`", "… with a `child` snippet").
- The README teaches the concept once and each adapter's section names its spelling.
