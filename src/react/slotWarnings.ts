import { GridConfig } from "../types";

/**
 * What's wrong with how a mounted grid's slots are wired: required areas with
 * no slot among the grid's direct children, and direct children that aren't
 * one of its slots.
 */
export function slotWarnings(grid: Element, config: GridConfig<string>): Array<string> {
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
        `one of its slots (${config.areas.join(", ")}). Put it inside a slot, or make it a slot ` +
        `with asChild.`,
    ];
  });

  return [...missing, ...strays];
}
