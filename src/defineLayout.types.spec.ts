/**
 * Compile-time checks of `defineLayout`. Each `@ts-expect-error` sits on the
 * line of the property the error must be reported on, so `just typecheck`
 * fails if an error goes missing or moves. The exact error text is checked
 * in `defineLayout.compile.spec.ts`.
 */
import { defineLayout } from "./defineLayout";

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
