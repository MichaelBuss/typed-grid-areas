import { GridConfig } from "../types.ts";

/** Options of `createSlotCheck`. */
export type SlotCheckOptions = {
  /**
   * How to make your own element a slot in this adapter's framework, worded
   * to complete "Put it inside a slot, or …": "make it a slot with asChild",
   * "make it a slot with a `child` snippet".
   */
  strayChildRemedy: string;
};

/**
 * A grid instance's slot check: given the mounted grid element, the warnings
 * to log about how its slots are wired. Those are required areas with no
 * slot among the grid's direct children, and direct children that aren't
 * one of its slots, each prefixed `typed-grid-areas: `.
 *
 * A set of problems is reported once: checking again returns no warnings
 * until the set changes. Create one check per grid instance.
 *
 * The check runs wherever it's called; gate it on your framework's own
 * development flag (or `isDevelopment()`).
 */
export function createSlotCheck(
  config: GridConfig<string>,
  { strayChildRemedy }: SlotCheckOptions,
): (grid: Element) => Array<string> {
  let lastReported = "";
  return grid => {
    const warnings = slotWarnings(grid, config, strayChildRemedy).map(
      warning => `typed-grid-areas: ${warning}`,
    );
    const key = warnings.join("\n");
    if (key === lastReported) {
      return [];
    }
    lastReported = key;
    return warnings;
  };
}

function slotWarnings(
  grid: Element,
  config: GridConfig<string>,
  strayChildRemedy: string,
): Array<string> {
  const children = Array.from(grid.children);
  const rendered = new Set(children.map(child => child.getAttribute("data-area")));
  const optional = new Set(config.optionalAreas ?? []);

  const missing = config.areas
    .filter(area => !optional.has(area) && !rendered.has(area))
    .map(
      area =>
        `no slot for the required area "${area}". Render its slot component, or declare the ` +
        `area optional ("${area}?").`,
    );

  const strays = children.flatMap((child, index) => {
    const area = child.getAttribute("data-area");
    if (area !== null && config.areas.includes(area)) {
      return [];
    }
    return [
      `<${child.tagName.toLowerCase()}> at index ${index} is a direct child of the grid but not ` +
        `one of its slots (${config.areas.join(", ")}). Put it inside a slot, or ` +
        `${strayChildRemedy}.`,
    ];
  });

  return [...missing, ...strays];
}
