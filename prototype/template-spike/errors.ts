import { defineLayout, defineLayoutRect } from "./lib";

const areas = ["icon?", "information", "cardTag?", "children?"] as const;

// (a) unknown cell in a multi-line template
export const A = defineLayout({
  areas,
  layouts: [
    {
      template: `
        iconn       cardTag
        information information`,
    },
  ],
});

// (b) ragged rows ("/"-separated)
export const B = defineLayout({
  areas,
  layouts: [{ template: "icon cardTag / information information information" }],
});

// (c1) columns track count (minmax with inner space is one track)
export const C1 = defineLayout({
  areas,
  layouts: [{ template: "icon cardTag / information information", columns: "min-content minmax(0, 1fr) auto" }],
});

// (c2) rows track count
export const C2 = defineLayout({
  areas,
  layouts: [{ template: "icon cardTag / information information", rows: "auto" }],
});

// (c3) breakpoint columns vs breakpoint template
export const C3 = defineLayout({
  areas,
  layouts: [
    {
      template: "icon cardTag",
      breakpoints: { "@sm": { template: "icon information cardTag", columns: "min-content minmax(0, 1fr)" } },
    },
  ],
});

// (d1) align key
export const D1 = defineLayout({
  areas,
  layouts: [{ template: "icon cardTag", align: { cardTagg: { justify: "end" } } }],
});

// (d2) when value
export const D2 = defineLayout({
  areas,
  layouts: [{ when: ["cardTagg"], template: "icon cardTag" }],
});

// (d3) unless value
export const D3 = defineLayout({
  areas,
  layouts: [{ unless: ["iconn"], template: "icon cardTag" }],
});

// (e) when area not placed in template
export const E = defineLayout({
  areas,
  layouts: [{ when: ["children"], template: "icon cardTag" }],
});

// (f) non-rectangular area (rect variant only)
export const F = defineLayoutRect({
  areas: ["a", "b"],
  layouts: [{ template: "a b / b a" }],
});
