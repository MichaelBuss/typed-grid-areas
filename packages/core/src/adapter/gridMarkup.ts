import { gridId } from "../engine/gridId.ts";
import { generateCss } from "../generateCss.ts";
import { hasBreakpoints, sizeContainerName } from "../markup.ts";
import { GridConfig, SlotProps } from "../types.ts";

/** The inline styles of a grid's size container, as camelCase properties. */
export type SizeContainerStyle = {
  containerType: "inline-size";
  containerName: string;
  display: "grid";
  gridTemplateColumns: "minmax(0, 1fr)";
};

/** The element a grid with breakpoints sits inside: its own size container. */
export type SizeContainerMarkup = {
  attributes: { "data-area"?: string };
  /** The styles as an object, for frameworks that take one (React, Vue, Lit's `styleMap`). */
  style: SizeContainerStyle;
  /** The same styles as a `style` attribute's text. */
  styleText: string;
};

/** The elements one grid instance renders, outermost first. */
export type GridElements = {
  /** Present when the definition has breakpoints; it then wraps the grid. */
  sizeContainer: SizeContainerMarkup | undefined;
  grid: { attributes: { "data-area"?: string; "data-grid-id": string } };
};

/** What an adapter renders for a definition, independent of any framework. */
export type GridMarkup<TAreaName extends string = string> = {
  /** The definition's grid id (`gridId`). */
  id: string;
  /**
   * The definition's CSS (`generateCss`). It belongs on the page once,
   * however many instances render, before its grids lay out.
   */
  css: string;
  /**
   * A key to emit the CSS once by, unique on the page: the same for every
   * instance of the definition (and for an identical definition, whose CSS
   * is identical), different for any other.
   */
  cssKey: string;
  /**
   * The elements of one instance. `outerArea` is the area of an outer grid
   * this grid fills when it is nested; its `data-area` goes on the outermost
   * element.
   */
  elements(outerArea?: string): GridElements;
  /** The attributes of the slot that fills `area`. */
  slot(area: TAreaName): SlotProps;
};

const cache = new WeakMap<GridConfig<string>, GridMarkup<string>>();

/**
 * What a framework adapter renders for a definition: the grid's (and its size
 * container's) attributes and styles, each slot's attributes, and the CSS to
 * put on the page once. Computed once per definition.
 */
export function gridMarkup<TAreaName extends string>(
  config: GridConfig<TAreaName>,
): GridMarkup<TAreaName> {
  const cached = cache.get(config);
  if (cached !== undefined) {
    return cached;
  }

  const id = gridId(config);
  const style: SizeContainerStyle | undefined = hasBreakpoints(config)
    ? {
        containerType: "inline-size",
        containerName: sizeContainerName(id),
        // Lets the grid fill its size container in both axes, as it would its cell.
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
      }
    : undefined;
  const styleText =
    style === undefined
      ? ""
      : `container-type: ${style.containerType}; container-name: ${style.containerName}; ` +
        `display: ${style.display}; grid-template-columns: ${style.gridTemplateColumns};`;

  const markup: GridMarkup<string> = {
    id,
    css: generateCss(config),
    cssKey: `typed-grid-areas-${id}`,
    elements(outerArea) {
      const area = outerArea === undefined ? {} : { "data-area": outerArea };
      if (style === undefined) {
        return { sizeContainer: undefined, grid: { attributes: { ...area, "data-grid-id": id } } };
      }
      // The size container is the outermost element: an outer grid's area goes there.
      return {
        sizeContainer: { attributes: area, style: { ...style }, styleText },
        grid: { attributes: { "data-grid-id": id } },
      };
    },
    slot(area) {
      return { "data-area": area };
    },
  };
  cache.set(config, markup);
  return markup;
}
