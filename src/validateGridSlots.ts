/**
 * Extracts the gridArea value from an element's inline style.
 *
 * @param element - The element to check
 * @returns {string | null} The gridArea value or null if not set
 */
function getGridAreaStyle(element: Element): string | null {
  if (element instanceof HTMLElement) {
    const gridArea = element.style.gridArea;
    return gridArea !== "" ? gridArea : null;
  }
  return null;
}

type SlotIssue = {
  tagName: string;
  index: number;
  dataSlot: string | null;
  gridArea: string | null;
};

/**
 * Validates that all direct children of a grid container have proper slot props.
 * Checks for both data-slot attribute and gridArea style, and validates they match.
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
  const partialSlots: Array<SlotIssue> = [];
  const mismatchedSlots: Array<SlotIssue> = [];

  let childIndex = 0;
  for (const child of Array.from(container.children)) {
    const dataSlot = child.getAttribute("data-slot");
    const gridArea = getGridAreaStyle(child);
    const tagName = child.tagName.toLowerCase();

    const hasDataSlot = dataSlot !== null;
    const hasGridArea = gridArea !== null;

    if (!hasDataSlot && !hasGridArea) {
      // Completely missing slot props
      unwiredChildren.push({ tagName, index: childIndex, dataSlot, gridArea });
    } else if (hasDataSlot && !hasGridArea) {
      // Has data-slot but missing gridArea style
      partialSlots.push({ tagName, index: childIndex, dataSlot, gridArea });
    } else if (!hasDataSlot && hasGridArea) {
      // Has gridArea but missing data-slot
      partialSlots.push({ tagName, index: childIndex, dataSlot, gridArea });
    } else if (hasDataSlot && hasGridArea && dataSlot !== gridArea) {
      // Both present but values don't match
      mismatchedSlots.push({ tagName, index: childIndex, dataSlot, gridArea });
    } else if (hasDataSlot && !areaSet.has(dataSlot)) {
      // Valid slot props but unknown area name
      unknownSlots.push({ tagName, index: childIndex, dataSlot, gridArea });
    }

    childIndex++;
  }

  if (unwiredChildren.length > 0) {
    const details = unwiredChildren
      .map(({ tagName, index }) => `  - <${tagName}> at index ${index}`)
      .join("\n");

    warnings.push(
      `Found ${unwiredChildren.length} child element(s) without slot props:\n${details}\n` +
        `Hint: Did you forget to spread {...slots.name} on these elements?`,
    );
  }

  if (partialSlots.length > 0) {
    const details = partialSlots
      .map(({ tagName, index, dataSlot, gridArea }) => {
        const has = dataSlot !== null ? `data-slot="${dataSlot}"` : `style.gridArea="${gridArea}"`;
        const missing = dataSlot !== null ? "style.gridArea" : "data-slot";
        return `  - <${tagName}> at index ${index} has ${has} but missing ${missing}`;
      })
      .join("\n");

    warnings.push(
      `Found ${partialSlots.length} child element(s) with incomplete slot props:\n${details}\n` +
        `Hint: Make sure to spread the full slot props {...slots.name} instead of setting attributes manually. And make sure the child takes a style prop.`,
    );
  }

  if (mismatchedSlots.length > 0) {
    const details = mismatchedSlots
      .map(
        ({ tagName, index, dataSlot, gridArea }) =>
          `  - <${tagName}> at index ${index} has data-slot="${dataSlot}" but style.gridArea="${gridArea}"`,
      )
      .join("\n");

    warnings.push(
      `Found ${mismatchedSlots.length} child element(s) with mismatched slot values:\n${details}\n` +
        `Hint: The data-slot attribute and style.gridArea should have the same value. Use {...slots.name} to ensure consistency.`,
    );
  }

  if (unknownSlots.length > 0) {
    const details = unknownSlots
      .map(
        ({ dataSlot, tagName, index }) =>
          `  - <${tagName}> at index ${index} has data-slot="${dataSlot}"`,
      )
      .join("\n");

    warnings.push(
      `Found ${unknownSlots.length} child element(s) with unknown slot names:\n${details}\n` +
        `Valid slot names are: ${areas.join(", ")}.`,
    );
  }

  return warnings;
}
