import type { Attachment } from "svelte/attachments";
import type { GridConfig } from "typed-grid-areas";
import { createSlotCheck } from "typed-grid-areas/adapter";

/**
 * The development slot check, as an attachment for the grid element: it
 * checks the grid's slots once mounted, then again whenever its direct
 * children or their `data-area` change (runes mode has no after-update
 * hook), logging each distinct set of problems once.
 */
export function slotCheckAttachment(definition: GridConfig<string>): Attachment<Element> {
  return grid => {
    const check = createSlotCheck(definition, {
      strayChildRemedy: "make it a slot with a `child` snippet",
    });
    const run = () => {
      for (const warning of check(grid)) {
        // eslint-disable-next-line no-console
        console.warn(warning);
      }
    };
    run();
    const observer = new MutationObserver(records => {
      if (records.some(record => record.target === grid || record.target.parentNode === grid)) {
        run();
      }
    });
    observer.observe(grid, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-area"],
    });
    return () => observer.disconnect();
  };
}
