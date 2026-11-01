/**
 * Putting definitions' CSS on the page outside React (ADR 0005): one
 * `<style data-typed-grid-areas="<grid id>">` per definition, rendered on the
 * server or inserted in the browser, found by that attribute so it's never
 * there twice.
 */
import { GridConfig } from "../types.ts";
import { gridMarkup } from "./gridMarkup.ts";

/** The attribute identifying a definition's style tag; its value is the grid id. */
export const GRID_STYLE_ATTRIBUTE = "data-typed-grid-areas";

/**
 * Puts a definition's CSS on a page, in the browser: its style tag in
 * `<head>`, unless the page already has one (inserted earlier, or rendered by
 * the server), which is returned instead. Never removes a tag.
 *
 * A new tag goes after earlier grids' tags and ahead of the page's other
 * styles, so the `typed-grid-areas` cascade layer is declared first.
 */
export function insertGridStyle(page: Document, definition: GridConfig<string>): HTMLStyleElement {
  return insert(page, definition, gridMarkup(definition).css);
}

/**
 * `insertGridStyle` for a server's DOM whose document is then serialized as
 * the page's HTML (Angular's Domino): the CSS is escaped as `gridStyleTags`
 * escapes it, so the serialized tag is the one `gridStyleTags` renders.
 */
export function insertServerGridStyle(
  page: Document,
  definition: GridConfig<string>,
): HTMLStyleElement {
  return insert(page, definition, escapeCss(gridMarkup(definition).css));
}

function insert(page: Document, definition: GridConfig<string>, text: string): HTMLStyleElement {
  const { id } = gridMarkup(definition);
  // `?? null`: Domino's querySelector returns undefined when nothing matches.
  const existing =
    page.querySelector<HTMLStyleElement>(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`) ?? null;
  if (existing !== null) {
    return existing;
  }

  const style = page.createElement("style");
  style.setAttribute(GRID_STYLE_ATTRIBUTE, id);
  style.textContent = text;

  const head = page.head;
  const grids = head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}]`);
  const lastGrid = grids[grids.length - 1];
  if (lastGrid !== undefined) {
    lastGrid.after(style);
  } else {
    head.insertBefore(style, head.querySelector('style, link[rel~="stylesheet" i]') ?? null);
  }
  return style;
}

/** CSS that can't close its style tag: `\/` is `/` to CSS, but no longer an end tag to HTML. */
function escapeCss(css: string): string {
  return css.replace(/<\/(style)/gi, "<\\/$1");
}

/**
 * The style tags for a set of definitions, as an HTML string to put in the
 * server-rendered `<head>`: one per distinct definition, in the order given.
 * CSS can't close its tag early: `</style` in it is escaped.
 */
export function gridStyleTags(definitions: Iterable<GridConfig<string>>): string {
  const tags = new Map<string, string>();
  for (const definition of definitions) {
    const { id, css } = gridMarkup(definition);
    if (!tags.has(id)) {
      tags.set(id, `<style ${GRID_STYLE_ATTRIBUTE}="${id}">${escapeCss(css)}</style>`);
    }
  }
  return Array.from(tags.values()).join("");
}
