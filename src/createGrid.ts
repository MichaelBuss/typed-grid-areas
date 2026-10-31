import {
  BreakpointLayoutConfig,
  BreakpointKey,
  EmptyCell,
  GridConfig,
  LayoutConfig,
  TrackSize,
} from "./types";

// =============================================================================
// Tuple Types for Type-Safe Layout Configuration
// =============================================================================

/**
 * A readonly 2D grid layout tuple for type-safe layout configuration.
 * Each inner tuple represents a row of grid cells.
 */
type GridLayoutTuple<TCell extends string = string> = ReadonlyArray<ReadonlyArray<TCell>>;

/**
 * Extracts the row count from a layout tuple.
 */
type LayoutRowCount<TLayout extends GridLayoutTuple> = TLayout["length"];

/**
 * Extracts the column count from a layout tuple (from first row).
 */
type LayoutColCount<TLayout extends GridLayoutTuple> = TLayout extends readonly [
  infer TFirstRow extends ReadonlyArray<unknown>,
  ...ReadonlyArray<unknown>,
]
  ? TFirstRow["length"]
  : 0;

/**
 * Flattens a layout tuple to get all used cell values as a union type.
 */
type FlattenLayout<TLayout extends GridLayoutTuple> = TLayout[number][number];

/**
 * Finds items from TWhen that are NOT present in the layout.
 * Returns never if all items are present, otherwise returns the missing items.
 */
type FindMissingWhenItems<
  TWhen extends ReadonlyArray<string>,
  TLayout extends GridLayoutTuple,
> = Exclude<TWhen[number], FlattenLayout<TLayout>>;

// =============================================================================
// Type-Safe Layout Input
// =============================================================================

/**
 * Strict input type for .layout() that validates all constraints.
 * Errors appear directly on the invalid property for clear feedback.
 *
 * @template TAreaName - Available area names from .areas()
 * @template TLayout - The layout tuple being validated
 * @template TWhen - Optional when clause (subset of TAreaName)
 * @template TRows - Optional row track sizes
 * @template TCols - Optional column track sizes
 */
type StrictLayoutInput<
  TAreaName extends string,
  TLayout extends GridLayoutTuple<TAreaName | EmptyCell>,
  TWhen extends ReadonlyArray<TAreaName> | undefined,
  TRows extends ReadonlyArray<TrackSize> | undefined,
  TCols extends ReadonlyArray<TrackSize> | undefined,
> = {
  /**
   * Area names that must be present for this layout to apply.
   * Must be a subset of the areas defined in .areas().
   */
  when?: TWhen;

  /**
   * The grid layout. Each cell must be an area name or "." for empty.
   * When `when` is provided, all `when` items must appear in the layout.
   */
  layout: TLayout &
    (TWhen extends ReadonlyArray<TAreaName>
      ? FindMissingWhenItems<TWhen, TLayout> extends never
        ? unknown
        : { _missingFromLayout: FindMissingWhenItems<TWhen, TLayout> }
      : unknown);

  /**
   * Grid row track sizes. Length must match the number of rows in layout.
   */
  rows?: TRows &
    (TRows extends ReadonlyArray<TrackSize>
      ? TRows["length"] extends LayoutRowCount<TLayout>
        ? unknown
        : { _rowCountError: { expected: LayoutRowCount<TLayout>; got: TRows["length"] } }
      : unknown);

  /**
   * Grid column track sizes. Length must match the number of columns in layout.
   */
  columns?: TCols &
    (TCols extends ReadonlyArray<TrackSize>
      ? TCols["length"] extends LayoutColCount<TLayout>
        ? unknown
        : { _columnCountError: { expected: LayoutColCount<TLayout>; got: TCols["length"] } }
      : unknown);

  /**
   * Responsive breakpoint overrides.
   */
  breakpoints?: Partial<Record<BreakpointKey, BreakpointLayoutConfig<TAreaName>>>;
};

// =============================================================================
// Builder Interfaces
// =============================================================================

/**
 * Builder interface for adding layouts after .areas() is called.
 * Each .layout() call is type-checked against the available areas.
 */
interface GridAreasBuilder<TAreaName extends string> {
  /**
   * Add a layout configuration. Can be chained multiple times.
   * Layout cells are constrained to area names defined in .areas() plus ".".
   */
  layout<
    const TLayout extends GridLayoutTuple<TAreaName | EmptyCell>,
    const TWhen extends ReadonlyArray<TAreaName> | undefined = undefined,
    const TRows extends ReadonlyArray<TrackSize> | undefined = undefined,
    const TCols extends ReadonlyArray<TrackSize> | undefined = undefined,
  >(
    config: StrictLayoutInput<TAreaName, TLayout, TWhen, TRows, TCols>,
  ): GridAreasBuilder<TAreaName>;

  /**
   * Finalize and return the grid configuration.
   * Pass this to the GridAreas component.
   */
  build(): GridConfig<TAreaName>;
}

/**
 * Initial builder interface before .areas() is called.
 */
interface GridAreasBuilderInit {
  /**
   * Define the area names for this grid.
   * These names will be available for autocomplete in .layout() calls.
   */
  areas<const TAreas extends ReadonlyArray<string>>(
    areas: TAreas,
  ): GridAreasBuilder<TAreas[number]>;
}

// =============================================================================
// Builder Implementation
// =============================================================================

/**
 * Creates a type-safe grid configuration using a fluent builder pattern.
 *
 * The builder provides:
 * - Full autocomplete for area names in layouts
 * - Type errors on the correct property (columns, rows, layout)
 * - Validation that layout cells match defined areas
 * - Validation that all `when` items appear in the layout
 *
 * @example Module-level definition (recommended for static grids)
 * ```tsx
 * const cardGrid = createGrid()
 *   .areas(["icon", "info", "tag"])
 *   .layout({ layout: [["info"]] })
 *   .layout({
 *     when: ["icon", "info"],
 *     layout: [["icon", "info"]],
 *     columns: ["48px", "1fr"],
 *   })
 *   .build();
 *
 * function MyCard() {
 *   return (
 *     <GridAreas config={cardGrid}>
 *       {(slots) => (<>{slots.icon}...</>)}
 *     </GridAreas>
 *   );
 * }
 * ```
 */
export function createGrid(): GridAreasBuilderInit {
  return {
    areas<const TAreas extends ReadonlyArray<string>>(
      areas: TAreas,
    ): GridAreasBuilder<TAreas[number]> {
      const layouts: Array<LayoutConfig<TAreas[number]>> = [];

      const builder: GridAreasBuilder<TAreas[number]> = {
        layout(config) {
          // At runtime, config properties are always valid arrays (error types only exist at compile-time)
          // We need to cast and copy readonly arrays to mutable arrays for storage
          const runtimeConfig = config as {
            layout: GridLayoutTuple;
            rows?: ReadonlyArray<TrackSize>;
            columns?: ReadonlyArray<TrackSize>;
            when?: ReadonlyArray<string>;
            breakpoints?: typeof config.breakpoints;
          };

          layouts.push({
            layout: runtimeConfig.layout.map(row => [...row]),
            rows: runtimeConfig.rows ? [...runtimeConfig.rows] : undefined,
            columns: runtimeConfig.columns ? [...runtimeConfig.columns] : undefined,
            when: runtimeConfig.when ? [...runtimeConfig.when] : undefined,
            breakpoints: runtimeConfig.breakpoints,
          });
          return builder;
        },

        build(): GridConfig<TAreas[number]> {
          return {
            areas: [...areas],
            layouts,
          };
        },
      };

      return builder;
    },
  };
}
