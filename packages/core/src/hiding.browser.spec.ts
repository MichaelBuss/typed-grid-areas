import { defineLayout } from "./defineLayout.ts";
import { mountGrid } from "./test-utils/mountGrid.ts";

// A consumer class that sets display, as slots often do for their own content.
const consumerStyle = document.createElement("style");
consumerStyle.textContent = ".flex-slot { display: flex; }";

beforeAll(() => {
  document.head.append(consumerStyle);
});

afterAll(() => {
  consumerStyle.remove();
});

/** The computed `display` of an area's slot, which a consumer class sets to `flex`. */
function displayOf<TAreaName extends string>(
  grid: ReturnType<typeof mountGrid<TAreaName>>,
  area: TAreaName,
): string {
  return getComputedStyle(grid.slot(area)).display;
}

describe("hiding an area a layout leaves out", () => {
  const hiding = defineLayout({
    areas: ["icon", "info", "tag"],
    layouts: [
      { template: "info tag" },
      { when: ["icon"], template: "icon info" },
      { when: ["icon", "tag"], unless: ["info"], template: "icon tag" },
    ],
  });

  it("sets display: none over a consumer's own display", () => {
    const grid = mountGrid(hiding, {
      width: 200,
      present: ["icon", "info", "tag"],
      slotClassNames: { tag: "flex-slot" },
    });

    expect(displayOf(grid, "tag")).toBe("none");
    expect(displayOf(grid, "info")).toBe("block");
  });

  it("leaves a consumer's display alone while a layout places the area", () => {
    const grid = mountGrid(hiding, {
      width: 200,
      present: ["info", "tag"],
      slotClassNames: { tag: "flex-slot" },
    });

    expect(displayOf(grid, "tag")).toBe("flex");
  });

  it("stops hiding when a later layout places the area", () => {
    const grid = mountGrid(hiding, {
      width: 200,
      present: ["icon", "tag"],
      slotClassNames: { tag: "flex-slot" },
    });

    expect(displayOf(grid, "tag")).toBe("flex");
    expect(displayOf(grid, "icon")).toBe("block");
  });
});

describe("hiding an area that a later layout only brings in at some widths", () => {
  // `tag` is left out below @sm (384px) and from @lg (512px) on, in between
  // it is placed (when `icon` is present), so the hiding splits into ranges.
  const split = defineLayout({
    areas: ["icon", "info", "tag"],
    layouts: [
      { template: "icon info" },
      {
        when: ["icon"],
        template: "icon info",
        breakpoints: {
          "@sm": { template: "icon info tag" },
          "@lg": { template: "icon info" },
        },
      },
    ],
  });
  const present = ["icon", "info", "tag"] as const;
  const slotClassNames = { tag: "flex-slot" };

  it.each([
    [200, "none"],
    [383, "none"],
    [384, "flex"],
    [500, "flex"],
    [511, "flex"],
    [512, "none"],
    [900, "none"],
  ])("at %ipx the area's display is %s", (width, display) => {
    const grid = mountGrid(split, { width, present, slotClassNames });

    expect(displayOf(grid, "tag")).toBe(display);
  });

  it("keeps hiding it at every width while the later layout's condition doesn't hold", () => {
    for (const width of [200, 450, 900]) {
      const grid = mountGrid(split, {
        width,
        present: ["info", "tag"],
        slotClassNames,
      });

      expect(displayOf(grid, "tag")).toBe("none");
    }
  });
});

describe("an area a later, unconditional layout places", () => {
  const unconditional = defineLayout({
    areas: ["icon", "info"],
    layouts: [{ template: "info" }, { template: "icon info" }],
  });

  it("is never hidden", () => {
    for (const width of [200, 900]) {
      const grid = mountGrid(unconditional, {
        width,
        present: ["icon", "info"],
        slotClassNames: { icon: "flex-slot" },
      });

      expect(displayOf(grid, "icon")).toBe("flex");
    }
  });
});

describe("an area a layout is only chosen without", () => {
  const without = defineLayout({
    areas: ["icon", "info"],
    layouts: [{ unless: ["icon"], template: "info" }, { template: "icon info" }],
  });

  it("is shown when it's present, whichever layout applies", () => {
    const grid = mountGrid(without, {
      width: 200,
      present: ["icon", "info"],
      slotClassNames: { icon: "flex-slot" },
    });

    expect(displayOf(grid, "icon")).toBe("flex");
  });
});
