import type { GridConfig } from "typed-grid-areas";

/** Where a grid reference keeps what it refers to, out of the way of area names. */
export const GRID: unique symbol = Symbol("typed-grid-areas grid");

/** Where an area reference keeps its area's name. */
export const AREA: unique symbol = Symbol("typed-grid-areas area");

/** What a grid reference refers to: a definition, and the outer area it fills when nested. */
export type GridTarget = {
  readonly definition: GridConfig<string>;
  /** The area of an outer grid this grid fills, when it's reached through that grid. */
  readonly outerArea: string | undefined;
};

/**
 * A reference to one area of a grid, for `[tgaArea]`: `Card.icon`.
 */
export type AreaRef<TArea extends string = string> = { readonly [AREA]: TArea };

/** Any grid reference, whatever its areas: what `[tgaGrid]` takes. */
export type AnyGridRef = { readonly [GRID]: GridTarget };

/**
 * A reference to a grid, for `[tgaGrid]`, with a property per area: an area
 * reference (`Card.icon`), or for an area nested through `nest` the nested
 * grid's reference (`Card.content`, whose areas are `Card.content.icon`, …).
 */
export type GridRef<TAreaName extends string, TNest = {}> = AnyGridRef & {
  readonly [K in TAreaName]: K extends keyof TNest ? TNest[K] : AreaRef<K>;
};

/** Options of `createGrid`. */
export type GridOptions<TAreaName extends string> = {
  /**
   * Grids nested into areas of this one: `nest: { content: Content }` makes
   * `Card.content` the reference of the `Content` grid filling `content`.
   */
  nest?: { readonly [K in TAreaName]?: AnyGridRef };
};

/** Defines read-only, enumerable properties, whatever their names (`constructor`, `__proto__`). */
function define(target: object, properties: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(properties)) {
    Object.defineProperty(target, key, { value, enumerable: true });
  }
}

/** The same grid reached through an outer grid's area. */
function filling(ref: AnyGridRef, outerArea: string): AnyGridRef {
  const nested = { [GRID]: { definition: ref[GRID].definition, outerArea } };
  define(nested, { ...ref });
  return Object.freeze(nested);
}

/**
 * Turns a definition into the typed reference its templates use: the grid
 * itself for `[tgaGrid]`, with a property per area for `[tgaArea]`. An area
 * nested through `nest` is the nested grid's reference instead.
 *
 * Create references at module level, once per definition, and expose them
 * to the template from the component (`protected readonly Card = Card`).
 *
 * @example
 * ```ts
 * const Content = createGrid(defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }));
 * const Card = createGrid(
 *   defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
 *   { nest: { content: Content } },
 * );
 * // <div [tgaGrid]="Card"> … <div [tgaGrid]="Card.content"> <span [tgaArea]="Card.content.icon">
 * ```
 */
export function createGrid<
  TAreaName extends string,
  const TNest extends GridOptions<TAreaName>["nest"] = {},
>(definition: GridConfig<TAreaName>, options: { nest?: TNest } = {}): GridRef<TAreaName, TNest> {
  const ref = { [GRID]: { definition, outerArea: undefined } };
  const areas: Record<string, unknown> = {};
  for (const area of definition.areas) {
    const nested = options.nest?.[area] as AnyGridRef | undefined;
    areas[area] = nested === undefined ? Object.freeze({ [AREA]: area }) : filling(nested, area);
  }
  define(ref, areas);
  return Object.freeze(ref) as unknown as GridRef<TAreaName, TNest>;
}
