# PROTOTYPE (issue #4): type-level template parsing spike

Can text templates (`` `icon cardTag / information information` ``) be checked at compile time?
**Viable with limits.** Throwaway. Run with the repo's tsc 7.0.2.

- `lib.ts`: the type code (`defineLayout`, plus `defineLayoutRect` with rectangle checks, and `defineLayoutPlain` as a baseline)
- `ok.ts`: passing cases and parser asserts. `errors.ts`: one failing case per check.
- `gen-stress.mjs`: generates `stress-{plain,parse,rect}.ts` (30 calls × 3 layouts × 2 breakpoints, 6 areas, 4×5 templates). The generated files aren't committed.

|                | Plain `string` | Parse   | Parse + rectangle |
| -------------- | -------------- | ------- | ----------------- |
| Check time     | 0.009s         | 0.076s  | 0.139s            |
| Instantiations | 5,904          | 140,515 | 313,222           |
| Memory         | 32.8 MB        | 61.7 MB | 78.0 MB           |

Checked at type level: unknown areas, rows with different cell counts, track counts (`minmax(…)` = one track; `repeat(` or a non-literal string skips the check), `align` keys, and `when`/`unless` values.
Checked at runtime: rectangles, which roughly double the cost at type level.

Limits: one error per template; the error's first line echoes the template, and the branded reason (`{ _unknownArea: "iconn" }`) is on the second line; no autocomplete inside the template string. Layer cells (`a+b`) aren't handled yet.
