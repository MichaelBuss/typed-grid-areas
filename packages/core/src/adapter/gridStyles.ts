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
  const { id, css } = gridMarkup(definition);
  const existing = page.querySelector<HTMLStyleElement>(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`);
  if (existing !== null) {
    return existing;
  }

  const style = page.createElement("style");
  style.setAttribute(GRID_STYLE_ATTRIBUTE, id);
  style.textContent = css;

  const head = page.head;
  const grids = head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}]`);
  const lastGrid = grids[grids.length - 1];
  if (lastGrid !== undefined) {
    lastGrid.after(style);
  } else {
    head.insertBefore(style, head.querySelector('style, link[rel~="stylesheet" i]'));
  }
  return style;
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
      // `\/` is `/` to CSS, but no longer an end tag to HTML.
      const text = css.replace(/<\/(style)/gi, "<\\/$1");
      tags.set(id, `<style ${GRID_STYLE_ATTRIBUTE}="${id}">${text}</style>`);
    }
  }
  return Array.from(tags.values()).join("");
}
