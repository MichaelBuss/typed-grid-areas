import { defineLayout } from "../defineLayout.ts";
import { createSlotCheck } from "./index.ts";

const card = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info" }],
});

/** A mounted grid whose direct children are `children`, as `tag[data-area]` strings. */
function gridWith(...children: Array<string>): Element {
  const grid = document.createElement("div");
  for (const child of children) {
    const [tag, area] = child.split(":");
    const element = document.createElement(tag!);
    if (area !== undefined) {
      element.setAttribute("data-area", area);
    }
    grid.append(element);
  }
  return grid;
}

const remedy = { strayChildRemedy: "make it a slot with asChild" };

describe("the slot check", () => {
  it("reports a required area with no slot", () => {
    const check = createSlotCheck(card, remedy);

    expect(check(gridWith("div:icon"))).toEqual([
      'typed-grid-areas: no slot for the required area "info". Render its slot component, or ' +
        'declare the area optional ("info?").',
    ]);
  });

  it("reports nothing when only an optional slot is absent", () => {
    expect(createSlotCheck(card, remedy)(gridWith("div:info"))).toEqual([]);
  });

  it("reports a direct child that isn't a slot, with the adapter's remedy", () => {
    expect(createSlotCheck(card, remedy)(gridWith("div:info", "span"))).toEqual([
      "typed-grid-areas: <span> at index 1 is a direct child of the grid but not one of its " +
        "slots (icon, info). Put it inside a slot, or make it a slot with asChild.",
    ]);
    expect(
      createSlotCheck(card, { strayChildRemedy: "make it a slot with a child snippet" })(
        gridWith("div:info", "p:other"),
      ),
    ).toEqual([
      "typed-grid-areas: <p> at index 1 is a direct child of the grid but not one of its " +
        "slots (icon, info). Put it inside a slot, or make it a slot with a child snippet.",
    ]);
  });

  it("reports a set of problems once, until it changes", () => {
    const check = createSlotCheck(card, remedy);

    expect(check(gridWith("span"))).toHaveLength(2);
    expect(check(gridWith("span"))).toEqual([]);
    expect(check(gridWith("div:info"))).toEqual([]);
    expect(check(gridWith("span"))).toHaveLength(2);
  });

  it("reports whatever the environment, leaving development mode to the adapter", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(createSlotCheck(card, remedy)(gridWith())).toHaveLength(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
