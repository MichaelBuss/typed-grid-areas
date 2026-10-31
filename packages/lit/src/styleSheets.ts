/**
 * Getting a definition's CSS to the root its grid renders in (ADR 0005): the
 * document's `<head>`, or a shadow root's adopted style sheets, where one
 * shared sheet per definition is adopted once per root.
 */
import { type CSSResult, unsafeCSS } from "lit";
import { gridMarkup, insertGridStyle } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";

/** Each style sheet's CSS result, with the ids of the definitions whose CSS it holds. */
const covering = new Map<CSSResult, ReadonlySet<string>>();

/** Each definition's own CSS result, by grid id: one shared style sheet per definition. */
const definitionStyles = new Map<string, CSSResult>();

/** A CSS result holding the CSS of `definitions`, known to cover them. */
export function stylesFor(definitions: ReadonlyArray<GridConfig<string>>): CSSResult {
  const result = unsafeCSS(definitions.map(definition => gridMarkup(definition).css).join("\n"));
  covering.set(result, new Set(definitions.map(definition => gridMarkup(definition).id)));
  return result;
}

/**
 * Puts a definition's CSS in the root `element` renders in: into `<head>` in
 * the document, or adopted into a shadow root unless a sheet that holds it
 * (its own, or one from `gridStyles` in `static styles`) already is.
 */
export function putGridStyle(element: Element, definition: GridConfig<string>): void {
  const root = element.getRootNode();
  if (root instanceof ShadowRoot) {
    adoptGridStyle(root, definition);
  } else if (root.nodeType === Node.DOCUMENT_NODE) {
    insertGridStyle(root as Document, definition);
  }
}

function adoptGridStyle(root: ShadowRoot, definition: GridConfig<string>): void {
  const { id } = gridMarkup(definition);
  const adopted = new Set(root.adoptedStyleSheets);
  for (const [result, ids] of covering) {
    if (ids.has(id) && result.styleSheet !== undefined && adopted.has(result.styleSheet)) {
      return;
    }
  }

  let own = definitionStyles.get(id);
  if (own === undefined) {
    own = stylesFor([definition]);
    definitionStyles.set(id, own);
  }
  if (own.styleSheet !== undefined) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, own.styleSheet];
  }
}
