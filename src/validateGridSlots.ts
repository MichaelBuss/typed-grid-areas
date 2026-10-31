type SlotIssue = {
  tagName: string;
  index: number;
  area: string | null;
};

/**
 * Validates that all direct children of a grid container are slots: each
 * carries a `data-area` attribute naming one of the grid's areas.
 *
 * @param container - The grid container element
 * @param areas - Array of valid area names
 * @returns {Array<string>} Array of warning message strings
 */
export function validateGridSlots(
  container: HTMLElement,
  areas: ReadonlyArray<string>,
): Array<string> {
  const warnings: Array<string> = [];
  const areaSet = new Set(areas);

  const unwiredChildren: Array<SlotIssue> = [];
  const unknownSlots: Array<SlotIssue> = [];

  Array.from(container.children).forEach((child, index) => {
    const area = child.getAttribute("data-area");
    const tagName = child.tagName.toLowerCase();

    if (area === null) {
      unwiredChildren.push({ tagName, index, area });
    } else if (!areaSet.has(area)) {
      unknownSlots.push({ tagName, index, area });
    }
  });

  if (unwiredChildren.length > 0) {
    const details = unwiredChildren
      .map(({ tagName, index }) => `  - <${tagName}> at index ${index}`)
      .join("\n");

    warnings.push(
      `Found ${unwiredChildren.length} child element(s) without slot props:\n${details}\n` +
        `Hint: Did you forget to spread {...slots.name} on these elements?`,
    );
  }

  if (unknownSlots.length > 0) {
    const details = unknownSlots
      .map(
        ({ area, tagName, index }) => `  - <${tagName}> at index ${index} has data-area="${area}"`,
      )
      .join("\n");

    warnings.push(
      `Found ${unknownSlots.length} child element(s) with unknown slot names:\n${details}\n` +
        `Valid slot names are: ${areas.join(", ")}.`,
    );
  }

  return warnings;
}
