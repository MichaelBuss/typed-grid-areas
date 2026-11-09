import { gridMarkup, insertGridStyle } from "../adapter/index.ts";
import type { GridConfig } from "../types.ts";

interface MountGridOptions<TAreaName extends string> {
  /** Width in px of the wrapper the grid is rendered into. */
  width: number;
  /** The slots to render; every other area is left absent. */
  present: ReadonlyArray<TAreaName>;
  /** Consumer classes to put on individual slots. */
  slotClassNames?: Partial<Record<TAreaName, string>>;
  /** Content to put inside individual slots, as HTML (slots are empty otherwise). */
  slotHtml?: Partial<Record<TAreaName, string>>;
  /**
   * If set, the wrapper sits inside an unrelated size container
   * (`container-type: inline-size`) of this width in px.
   */
  ancestorContainerWidth?: number;
  /**
   * Grids nested into areas of this one: the nested grid's outermost element
   * stands in for that area's slot (mount it with `outerArea` set to the area).
   */
  nested?: Partial<Record<TAreaName, HTMLElement>>;
  /** The area of an outer grid this grid fills; its `data-area` goes on the outermost element. */
  outerArea?: string;
}

interface MountedGrid<TAreaName extends string> {
  /** The grid container's computed `grid-template-areas`. */
  templateAreas: () => string;
  /** A slot's bounding rect, relative to the grid container's top-left corner. */
  rect: (area: TAreaName) => { x: number; y: number; width: number; height: number };
  /** A rendered slot's DOM element. */
  slot: (area: TAreaName) => HTMLElement;
  /** The grid's outermost element: its size container when it has breakpoints. */
  outermost: HTMLElement;
}

const mounted = new Set<HTMLElement>();

afterEach(() => {
  for (const element of mounted) {
    element.remove();
  }
  mounted.clear();
});

/** Applies `style` to `element`, one declaration at a time. */
function setStyle(element: HTMLElement, style: Record<string, string | number>): void {
  for (const [property, value] of Object.entries(style)) {
    element.style.setProperty(property, typeof value === "number" ? `${value}px` : value);
  }
}

/**
 * Mounts a definition into a real browser at a given container width, as an
 * adapter does: its CSS in `<head>`, the elements of `gridMarkup` and a slot
 * per present area, all through plain DOM calls. Exposes where the browser
 * actually laid everything out.
 */
export function mountGrid<TAreaName extends string>(
  config: GridConfig<TAreaName>,
  {
    width,
    present,
    slotClassNames,
    slotHtml,
    ancestorContainerWidth,
    nested,
    outerArea,
  }: MountGridOptions<TAreaName>,
): MountedGrid<TAreaName> {
  const markup = gridMarkup(config);
  insertGridStyle(document, config);

  const { sizeContainer, grid: gridElement } = markup.elements(outerArea);
  const grid = document.createElement("div");
  for (const [name, value] of Object.entries(gridElement.attributes)) {
    grid.setAttribute(name, value);
  }
  for (const area of present) {
    const nestedGrid = nested?.[area];
    if (nestedGrid !== undefined) {
      grid.append(nestedGrid);
      continue;
    }
    const slot = document.createElement("div");
    for (const [name, value] of Object.entries(markup.slot(area))) {
      slot.setAttribute(name, String(value));
    }
    const className = slotClassNames?.[area];
    if (className !== undefined) {
      slot.className = className;
    }
    slot.style.minHeight = "10px";
    slot.innerHTML = slotHtml?.[area] ?? "";
    grid.append(slot);
  }

  let outermost: HTMLElement = grid;
  if (sizeContainer !== undefined) {
    outermost = document.createElement("div");
    for (const [name, value] of Object.entries(sizeContainer.attributes)) {
      outermost.setAttribute(name, value);
    }
    outermost.style.cssText = sizeContainer.styleText;
    outermost.append(grid);
  }

  const wrapper = document.createElement("div");
  setStyle(wrapper, { width });
  wrapper.append(outermost);

  let root = wrapper;
  if (ancestorContainerWidth !== undefined) {
    root = document.createElement("div");
    setStyle(root, { width: ancestorContainerWidth, "container-type": "inline-size" });
    root.append(wrapper);
  }
  document.body.append(root);
  mounted.add(root);

  const slot = (area: TAreaName): HTMLElement => {
    const element = grid.querySelector<HTMLElement>(`:scope > [data-area=${area}]`);
    if (element === null) {
      throw new Error(`mountGrid: slot "${area}" was not rendered`);
    }
    return element;
  };

  return {
    templateAreas: () => getComputedStyle(grid).gridTemplateAreas,
    rect: area => {
      const gridRect = grid.getBoundingClientRect();
      const { x, y, width, height } = slot(area).getBoundingClientRect();
      return { x: x - gridRect.x, y: y - gridRect.y, width, height };
    },
    slot,
    outermost,
  };
}
