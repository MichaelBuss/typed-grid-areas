/**
 * Compile-time checks of `defineLayout`. Each `@ts-expect-error` sits on the
 * line of the property the error must be reported on, so `just typecheck`
 * fails if an error goes missing or moves. The exact error text is checked
 * in `defineLayout.compile.spec.ts`.
 */
import { ArrangementInput, defineLayout } from "./defineLayout.ts";
import { BreakpointKey } from "./types.ts";

const areas = ["icon?", "information", "cardTag?", "badge?"] as const;

describe("defineLayout type checks", () => {
  it("accepts valid definitions", () => {
    const nonLiteralTemplate: string = "icon information";
    const nonLiteralTracks: string = "1fr 1fr 1fr";

    defineLayout({
      areas,
      layouts: [
        {
          template: `
            icon        cardTag
            information information`,
          rows: "auto minmax(0, 1fr)",
          columns: "min-content minmax(0, 1fr)",
          align: { cardTag: { justify: "end" }, information: { align: "center" } },
          breakpoints: {
            "@sm": {
              template: "icon information cardTag",
              columns: "[start] min-content minmax(0, 1fr) auto [end]",
              align: { icon: { align: "start" } },
            },
            "@[27rem]": { template: "icon+badge information cardTag", columns: "repeat(3, 1fr)" },
          },
        },
        {
          when: ["icon"],
          unless: ["cardTag", "badge"],
          template: "icon\tinformation / . information",
        },
        { template: nonLiteralTemplate, columns: nonLiteralTracks },
      ],
    });
  });

  it("rejects an unknown area in a template cell", () => {
    defineLayout({
      areas,
      layouts: [
        {
          // @ts-expect-error -- { _unknownArea: "iconn" }
          template: "iconn information",
        },
      ],
    });
  });

  it("rejects an unknown area inside a layered cell", () => {
    defineLayout({
      areas,
      layouts: [
        {
          // @ts-expect-error -- { _unknownArea: "badgee" }
          template: "icon+badgee information",
        },
      ],
    });
  });

  it("rejects an unknown area in a breakpoint template", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            "@sm": {
              // @ts-expect-error -- { _unknownArea: "informaton" }
              template: "icon / informaton",
            },
          },
        },
      ],
    });
  });

  it("rejects rows with different cell counts", () => {
    defineLayout({
      areas,
      layouts: [
        {
          // @ts-expect-error -- { _raggedRow: { row: 2; cells: 1; expected: 2 } }
          template: `
            icon cardTag
            information`,
        },
      ],
    });
  });

  it("rejects a column track count that doesn't match the template", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          // @ts-expect-error -- { _columnCountError: { expected: 2; got: 3 } }
          columns: "min-content minmax(0, 1fr) auto",
        },
      ],
    });
  });

  it("rejects a row track count that doesn't match the template", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon / information",
          // @ts-expect-error -- { _rowCountError: { expected: 2; got: 1 } }
          rows: "minmax(0, 1fr)",
        },
      ],
    });
  });

  it("rejects a track count mismatch in a breakpoint", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            "@md": {
              template: "icon / information",
              // @ts-expect-error -- { _columnCountError: { expected: 1; got: 2 } }
              columns: "1fr 1fr",
            },
          },
        },
      ],
    });
  });

  it("rejects an unknown align key", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          // @ts-expect-error -- 'iconn' does not exist in type
          align: { iconn: { justify: "end" } },
        },
      ],
    });
  });

  it("rejects an unknown align key in a breakpoint", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            // @ts-expect-error -- 'iconn' does not exist in type
            "@sm": { template: "icon information", align: { iconn: { justify: "end" } } },
          },
        },
      ],
    });
  });

  it("rejects unknown when and unless values", () => {
    defineLayout({
      areas,
      layouts: [
        {
          // @ts-expect-error -- '"iconn"' is not assignable
          when: ["iconn"],
          template: "icon information",
        },
      ],
    });
    defineLayout({
      areas,
      layouts: [
        {
          // @ts-expect-error -- '"cardtag"' is not assignable
          unless: ["cardtag"],
          template: "icon information",
        },
      ],
    });
  });

  it("accepts breakpoints that share a unit, counting named sizes as rem", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            "@[27.5rem]": { template: "information icon" },
            "@md": { template: "icon / information" },
          },
        },
      ],
    });
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: { "@[20ch]": { template: "icon / information" } },
        },
        {
          when: ["cardTag"],
          template: "icon information cardTag",
          breakpoints: { "@[40ch]": { template: "icon / information / cardTag" } },
        },
      ],
    });
  });

  it("leaves non-literal breakpoint keys unchecked", () => {
    const breakpoints: Record<string, ArrangementInput<"icon" | "information">> = {
      "@[20ch]": { template: "icon information" },
      "@sm": { template: "information icon" },
    };
    const typedBreakpoints: Partial<Record<BreakpointKey, ArrangementInput<"icon">>> = {};

    defineLayout({ areas, layouts: [{ template: "icon information", breakpoints }] });
    defineLayout({
      areas,
      layouts: [{ template: "icon", breakpoints: typedBreakpoints }],
    });
  });

  it("rejects breakpoint keys that aren't a named size or a number with an allowed unit", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            // @ts-expect-error -- { _unsupportedBreakpoint: "@[50%]" }
            "@[50%]": { template: "information icon" },
            // @ts-expect-error -- { _unsupportedBreakpoint: "@[calc(1rem + 2ch)]" }
            "@[calc(1rem + 2ch)]": { template: "information icon" },
            // @ts-expect-error -- { _unsupportedBreakpoint: "@[10cqw]" }
            "@[10cqw]": { template: "information icon" },
            // @ts-expect-error -- { _unsupportedBreakpoint: "@huge" }
            "@huge": { template: "information icon" },
            // @ts-expect-error -- { _unsupportedBreakpoint: "@[-5rem]" }
            "@[-5rem]": { template: "information icon" },
          },
        },
      ],
    });
  });

  it("rejects every breakpoint of a layout that mixes units", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          breakpoints: {
            // @ts-expect-error -- { _mixedBreakpointUnits: "…: ch is mixed with rem" }
            "@[20ch]": { template: "information icon" },
            // @ts-expect-error -- { _mixedBreakpointUnits: "…: rem is mixed with ch" }
            "@sm": { template: "icon / information" },
          },
        },
      ],
    });
  });

  it("rejects breakpoints in different units across layouts", () => {
    defineLayout({
      areas,
      layouts: [
        {
          template: "icon information",
          // @ts-expect-error -- { _mixedBreakpointUnits: "…: ch is mixed with px" }
          breakpoints: { "@[20ch]": { template: "information icon" } },
        },
        {
          when: ["cardTag"],
          template: "icon information cardTag",
          breakpoints: {
            // @ts-expect-error -- { _mixedBreakpointUnits: "…: px is mixed with ch" }
            "@[500px]": { template: "icon / information / cardTag" },
          },
        },
      ],
    });
  });

  it("names areas without their '?' in the result", () => {
    const layout = defineLayout({ areas, layouts: [{ template: "icon information" }] });

    expectTypeOf(layout.areas).toEqualTypeOf<
      ReadonlyArray<"icon" | "information" | "cardTag" | "badge">
    >();
    expectTypeOf(layout.optionalAreas).toEqualTypeOf<
      ReadonlyArray<"icon" | "information" | "cardTag" | "badge">
    >();
  });
});
