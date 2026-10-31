import { ReactNode } from "react";
import { render } from "vitest-browser-react";

export type Rect = { x: number; y: number; width: number; height: number };

interface MountedDesign {
  /**
   * The element filling an area, found by its path of area names from the
   * outermost grid: `slot("content", "icon")` is the `icon` slot of the grid
   * nested into `content`. For a nested grid with breakpoints this is its
   * size container, the element that fills the outer area.
   */
  slot: (...path: [string, ...string[]]) => HTMLElement;
  /** An element's bounding rect, relative to the design's top-left corner. */
  rect: (element: Element) => Rect;
  /** The design's own bounding rect (at 0, 0). */
  bounds: () => Rect;
}

/**
 * Mounts a complete design (a rendered grid component, with real content and
 * nested grids) into a real browser at a given width, and exposes where the
 * browser actually laid every part out.
 */
export async function mountDesign(
  design: ReactNode,
  { width }: { width: number },
): Promise<MountedDesign> {
  const { container } = await render(<div style={{ width }}>{design}</div>);
  const root = container.firstElementChild?.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mountDesign: nothing was rendered");
  }

  /** The grid an element renders: itself, or the grid inside its size container. */
  const gridOf = (element: HTMLElement): HTMLElement => {
    const grid = element.matches("[data-grid-id]")
      ? element
      : element.querySelector<HTMLElement>(":scope > [data-grid-id]");
    if (grid === null) {
      throw new Error("mountDesign: expected a grid");
    }
    return grid;
  };

  const slot = (...path: [string, ...string[]]): HTMLElement => {
    let element = root;
    for (const area of path) {
      const found = gridOf(element).querySelector<HTMLElement>(`:scope > [data-area=${area}]`);
      if (found === null) {
        throw new Error(`mountDesign: slot "${path.join(".")}" was not rendered`);
      }
      element = found;
    }
    return element;
  };

  const rect = (element: Element): Rect => {
    const origin = root.getBoundingClientRect();
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x: x - origin.x, y: y - origin.y, width, height };
  };

  return { slot, rect, bounds: () => rect(root) };
}
