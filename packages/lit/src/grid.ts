import { type CSSResult, html, nothing, type TemplateResult } from "lit";
import { ref, type RefOrCallback } from "lit/directives/ref.js";
import { styleMap, type StyleInfo } from "lit/directives/style-map.js";
import { gridMarkup } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";
import { gridElement } from "./gridElement.ts";
import { stylesFor } from "./styleSheets.ts";

/**
 * Options of a grid template function (`Card(content, options)`). They go on
 * the grid element, never on its size container. Lit can't spread arbitrary
 * attributes: for other attributes or event listeners on the grid, use `ref`.
 */
export type GridOptions = {
  /** The grid's `class` attribute. */
  class?: string;
  /** The grid's `style`: an attribute's text, or an object as `styleMap` takes it. */
  style?: string | StyleInfo;
  /** Receives the grid element, as Lit's `ref` directive does. */
  ref?: RefOrCallback;
};

/**
 * The template function a definition renders as: `Card(content, options)`
 * renders the grid with `content` as its slots. It carries one member per
 * area, named exactly like the area: the area's name, to bind as
 * `data-area=${Card.icon}` on the element that fills it. An area nested
 * through `nest` is the nested grid's template function instead, with that
 * grid's areas as its members (`Card.content.icon`).
 */
export type Grid<TAreaName extends string, TNest = {}> = ((
  content: unknown,
  options?: GridOptions,
) => TemplateResult) & {
  readonly [K in TAreaName]: K extends keyof TNest ? TNest[K] : K;
};

/** Any grid template function, whatever its areas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGrid = Grid<any, any>;

/** Options of `createGrid`. */
export type CreateGridOptions<TAreaName extends string> = {
  /**
   * Grids nested into areas of this one: `nest: { content: Content }` makes
   * `Card.content(…)` render `Content` as the `content` slot of `Card`.
   */
  nest?: { readonly [K in TAreaName]?: AnyGrid };
};

/** What every grid template function carries, out of sight of its area members. */
const GRID = Symbol("typed-grid-areas grid");

type GridInternals = {
  /** Renders the grid; `outerArea` is the area of an outer grid it fills. */
  render: (content: unknown, options: GridOptions, outerArea?: string) => TemplateResult;
  /** The area members. */
  members: Record<string, unknown>;
  /** The grid's definition, then its nested grids' (each once). */
  definitions: ReadonlyArray<GridConfig<string>>;
};

type WithInternals = { [GRID]: GridInternals };

function internals(grid: AnyGrid): GridInternals {
  return (grid as unknown as WithInternals)[GRID];
}

/**
 * Defines `members` on a template function. `defineProperty`, because an area
 * may be named like a function's own read-only properties (`name`, `length`).
 */
function withMembers<TFunction extends object>(
  fn: TFunction,
  gridInternals: GridInternals,
): TFunction {
  for (const [key, value] of Object.entries(gridInternals.members)) {
    Object.defineProperty(fn, key, { value, enumerable: true, configurable: true });
  }
  Object.defineProperty(fn, GRID, { value: gridInternals });
  return fn;
}

function createRender(definition: GridConfig<string>): GridInternals["render"] {
  const markup = gridMarkup(definition);
  return (content, options, outerArea) => {
    const { sizeContainer, grid } = markup.elements(outerArea);
    const style =
      options.style === undefined
        ? nothing
        : typeof options.style === "string"
          ? options.style
          : styleMap(options.style);
    const area = grid.attributes["data-area"] ?? nothing;
    const ownRef = options.ref === undefined ? nothing : ref(options.ref);
    // Compact on purpose: no whitespace of the adapter's own in the server output.
    // prettier-ignore
    const element = html`<div data-area=${area} data-grid-id=${gridElement(definition)} class=${options.class ?? nothing} style=${style} ${ownRef}>${content}</div>`;
    if (sizeContainer === undefined) {
      return element;
    }
    const containerArea = sizeContainer.attributes["data-area"] ?? nothing;
    // prettier-ignore
    return html`<div data-area=${containerArea} style=${sizeContainer.styleText}>${element}</div>`;
  };
}

/**
 * Turns a definition into the template function it renders as.
 *
 * `Card(content, { class, style, ref })` renders the grid (inside its own
 * size container when the definition has breakpoints); `Card.icon` is the
 * `icon` area's name, which makes any element its slot:
 * `<div data-area=${Card.icon}>`. Slots are direct children of the grid.
 *
 * Create grids at module level, once per definition.
 *
 * @example
 * ```ts
 * const Card = createGrid(
 *   defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
 *   { nest: { content: Content } },
 * );
 *
 * Card(html`
 *   <label data-area=${Card.input}>…</label>
 *   ${Card.content(html`<span data-area=${Card.content.icon}>…</span>`)}
 * `);
 * ```
 */
export function createGrid<
  TAreaName extends string,
  const TNest extends CreateGridOptions<TAreaName>["nest"] = {},
>(definition: GridConfig<TAreaName>, options: { nest?: TNest } = {}): Grid<TAreaName, TNest> {
  const members: Record<string, unknown> = {};
  const definitions = new Map([[gridMarkup(definition).id, definition as GridConfig<string>]]);
  for (const area of definition.areas) {
    const nested = options.nest?.[area] as AnyGrid | undefined;
    if (nested === undefined) {
      members[area] = area;
      continue;
    }
    const nestedInternals = internals(nested);
    const renderNested = (content: unknown, nestedOptions: GridOptions = {}) =>
      nestedInternals.render(content, nestedOptions, area);
    members[area] = withMembers(renderNested, nestedInternals);
    for (const nestedDefinition of nestedInternals.definitions) {
      definitions.set(gridMarkup(nestedDefinition).id, nestedDefinition);
    }
  }

  const render = createRender(definition);
  const grid = (content: unknown, gridOptions: GridOptions = {}) => render(content, gridOptions);
  return withMembers(grid, {
    render,
    members,
    definitions: Array.from(definitions.values()),
  }) as unknown as Grid<TAreaName, TNest>;
}

const styles = new WeakMap<GridInternals, CSSResult>();

/**
 * A grid's CSS, and its nested grids', as a `CSSResult` for a LitElement's
 * `static styles`. That's how the CSS gets into server-rendered declarative
 * shadow roots, so server rendering needs it. In the browser it's optional:
 * a grid adopts its CSS into its shadow root by itself, and never a second
 * time when `gridStyles` already put it there.
 *
 * @example
 * ```ts
 * class PreferenceCard extends LitElement {
 *   static styles = [gridStyles(Card), css`.gap { gap: 1rem }`];
 * }
 * ```
 */
export function gridStyles(grid: AnyGrid): CSSResult {
  const gridInternals = internals(grid);
  let result = styles.get(gridInternals);
  if (result === undefined) {
    result = stylesFor(gridInternals.definitions);
    styles.set(gridInternals, result);
  }
  return result;
}
