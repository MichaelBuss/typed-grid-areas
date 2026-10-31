/**
 * The directive that marks an element as a grid: `data-grid-id=${gridElement(definition)}`.
 * Its `render()` is the grid id, so the attribute is in server output too;
 * in the browser its `update()` gets the element, to put the definition's
 * CSS in its root after each update.
 */
import {
  type AttributePart,
  Directive,
  directive,
  type PartInfo,
  PartType,
} from "lit/directive.js";
import { createSlotCheck, gridMarkup, isDevelopment } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";
import { putGridStyle } from "./styleSheets.ts";

/** How the stray-child warning says to make an element a slot in Lit (ADR 0006). */
const strayChildRemedy = "make it a slot with data-area=${Grid.<area>}";

class GridElementDirective extends Directive {
  /** Whether work after the current update is already queued. */
  private queued = false;
  /** This grid instance's slot check, created on its first development update. */
  private checkSlots: ((grid: Element) => Array<string>) | undefined;

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ATTRIBUTE) {
      throw new Error("typed-grid-areas: the grid directive belongs on the data-grid-id attribute");
    }
  }

  render(definition: GridConfig<string>): string {
    return gridMarkup(definition).id;
  }

  override update(part: AttributePart, [definition]: [GridConfig<string>]): string {
    if (!this.queued) {
      this.queued = true;
      // During the first commit the element is still in a template fragment:
      // its root is known once the update that renders it has finished.
      queueMicrotask(() => {
        this.queued = false;
        if (part.element.isConnected) {
          this.afterUpdate(part.element, definition);
        }
      });
    }
    return this.render(definition);
  }

  private afterUpdate(grid: Element, definition: GridConfig<string>): void {
    putGridStyle(grid, definition);
    if (isDevelopment()) {
      this.checkSlots ??= createSlotCheck(definition, { strayChildRemedy });
      for (const warning of this.checkSlots(grid)) {
        // eslint-disable-next-line no-console
        console.warn(warning);
      }
    }
  }
}

export const gridElement = directive(GridElementDirective);
