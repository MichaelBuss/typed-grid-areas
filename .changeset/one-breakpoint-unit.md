---
"typed-grid-areas": minor
---

Breakpoints in a definition now share one unit, so they're always ordered correctly. Previously a breakpoint in a unit other than `px`, `rem` or `em` (such as `"@[20ch]"`) was ordered after all others, so a narrower one could override a wider one and hide areas the wider layout shows.

Every breakpoint key in every layout of a definition must use the same unit; named sizes (`@xs` to `@7xl`) count as `rem`. An arbitrary key is a plain, non-negative number and one of `px`, `rem`, `em`, `ch`, `ex`, `vw`, `vh`, `vi` or `vb`. `defineLayout` reports `{ _unsupportedBreakpoint: "@[50%]" }` on a key that isn't allowed (percentages, `calc()`, container query units, unknown names) and `{ _mixedBreakpointUnits: "…" }` on every key when units are mixed; in development it also warns about keys that aren't literals. `ArbitraryBreakpoint` is narrowed to `` `@[${number}${BreakpointUnit}]` ``, and the new `BreakpointUnit` type lists the units.
