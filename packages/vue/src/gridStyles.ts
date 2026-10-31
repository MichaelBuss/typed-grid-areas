/**
 * Putting definitions' CSS on the page (ADR 0005). Vue has no API for
 * `<head>`, so in the browser each grid inserts its definition's tag itself,
 * and on the server it registers its definition in the request's SSR
 * context, for the app's server entry to render with `renderGridStyles`.
 */
import { inject, ssrContextKey } from "vue";
import { gridStyleTags, insertGridStyle } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";

/**
 * Where a request's definitions are kept on its SSR context. `Symbol.for`, so
 * a second copy of this package (one bundled into the app, one external)
 * still finds them.
 */
const DEFINITIONS = Symbol.for("typed-grid-areas/vue definitions");

type WithDefinitions = { [DEFINITIONS]?: Set<GridConfig<string>> };

/**
 * Puts a definition's CSS on the page, from a component's `setup`: into the
 * current request's SSR context when server rendering, into `<head>` in the
 * browser.
 */
export function useGridStyle(definition: GridConfig<string>): void {
  // `inject` with a default, since the context is only provided on the server.
  const ssrContext = inject<WithDefinitions | null>(ssrContextKey, null);
  if (ssrContext !== null) {
    (ssrContext[DEFINITIONS] ??= new Set()).add(definition);
  } else if (typeof document !== "undefined") {
    insertGridStyle(document, definition);
  }
}

/**
 * The style tags of every definition rendered with an SSR context, one per
 * definition, as HTML for the server-rendered `<head>`. In the browser each
 * grid then finds its tag and adds no second one.
 *
 * @example
 * ```js
 * const ctx = {};
 * const html = await renderToString(app, ctx);
 * head += renderGridStyles(ctx);
 * ```
 */
export function renderGridStyles(ssrContext: object): string {
  return gridStyleTags((ssrContext as WithDefinitions)[DEFINITIONS] ?? []);
}
