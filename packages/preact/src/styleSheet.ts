/**
 * Putting each definition's CSS on the page (ADR 0005). Preact has nothing
 * that reaches `<head>`, so in the browser a grid inserts its style tag
 * itself, and on the server it registers its definition with the
 * `createGridStyleSheet()` the app renders inside.
 */
import { createContext, h, type VNode } from "preact";
import { gridStyleTags, insertGridStyle, isDevelopment } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";

/** The definitions rendered inside one sheet's `collect`. */
type Collected = Set<GridConfig<string>>;

const SheetContext = createContext<Collected | undefined>(undefined);

/** A server render's grid CSS: what `createGridStyleSheet()` returns. */
export type GridStyleSheet = {
  /** Wraps the app (any element), so the grids rendered inside register their CSS here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  collect(vnode: VNode<any>): VNode<any>;
  /** The style tags for every definition rendered inside `collect`, for `<head>`. */
  toString(): string;
};

/**
 * Collects the CSS of the grids in one server render, to put in `<head>`:
 *
 * ```tsx
 * const sheet = createGridStyleSheet();
 * const body = renderToString(sheet.collect(<App />));
 * const html = `<head>${sheet}</head><body>${body}</body>`;
 * ```
 *
 * Use a new sheet per render. In the browser, grids put their CSS in
 * `<head>` themselves (reusing the tags the server rendered), so no sheet is
 * needed there.
 */
export function createGridStyleSheet(): GridStyleSheet {
  const collected: Collected = new Set();
  return {
    collect: vnode => h(SheetContext.Provider, { value: collected }, vnode),
    toString: () => gridStyleTags(collected),
  };
}

export { SheetContext };

/** Definitions already warned about rendering on the server without a sheet. */
const warnedWithoutSheet = new WeakSet<GridConfig<string>>();

/**
 * Puts a definition's CSS on the page, during render (so before any child's
 * layout effect measures the grid): into the sheet when rendering inside
 * one, otherwise into the document's `<head>`. With neither, it's a server
 * render without a sheet, which warns in development.
 */
export function putGridStyle(sheet: Collected | undefined, definition: GridConfig<string>): void {
  if (sheet !== undefined) {
    sheet.add(definition);
  } else if (typeof document !== "undefined") {
    insertGridStyle(document, definition);
  } else if (isDevelopment() && !warnedWithoutSheet.has(definition)) {
    warnedWithoutSheet.add(definition);
    // eslint-disable-next-line no-console
    console.warn(
      "typed-grid-areas: a grid was rendered on the server outside a grid style sheet, so its " +
        "CSS isn't in the page. Render with `const sheet = createGridStyleSheet()` and " +
        "`renderToString(sheet.collect(<App />))`, and put `${sheet}` in <head>.",
    );
  }
}
