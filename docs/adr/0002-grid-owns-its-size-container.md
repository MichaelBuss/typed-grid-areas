---
status: accepted
---

# A grid owns its own size container

Breakpoints measure the space a grid itself is given. A CSS container query can never measure the element it styles, so a grid with breakpoints renders an extra wrapper element that is the size container, with the grid inside it. When the grid is nested, the outer grid's area goes on the wrapper. Grids without breakpoints render no wrapper. We chose this so a breakpoint's meaning is local to its own definition, and so nothing depends on a container somewhere above the grid that someone has to remember to add and not delete.

## Considered options

- **Make the grid itself the container** (the original behaviour): doesn't work. Breakpoints silently measured the nearest container above the grid, or never fired if there wasn't one (#6).
- **Require a container above the grid**: no extra element, but correctness depends on code outside the definition, and a nested grid's breakpoints would measure the outer grid.
- **Named containers chosen in the config**: most flexible, but more API for a need we haven't seen yet.

## Consequences

- Whether the DOM has a wrapper depends on whether the definition has breakpoints.
- A grid with breakpoints can't take its width from its content (inline-size containment). That's fine in a `1fr` or stretched track, but it collapses to zero width in an `auto` or `min-content` track of a parent grid.
- The same breakpoint switches at different outer widths depending on how deeply the grid is nested. In the PreferenceCard prototype, `@sm` switched at a card width of 384px for one flat grid and 440–472px for nested ones.
