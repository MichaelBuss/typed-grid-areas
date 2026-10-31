import {
  BreakpointLayoutConfig,
  BreakpointKey,
  GridLayout,
  LayoutConfig,
  TrackSize,
  GridConfig,
} from "./types";
import { cellAreas, parseCell } from "./engine/cells";

/**
 * Creates a normalized key from a condition (when + unless) for comparison.
 * Order within each list doesn't matter. Returns an empty string for a
 * layout with no condition.
 *
 * @param when - The areas that must be present
 * @param unless - The areas that must be absent
 * @returns {string} A normalized string key for comparison
 */
function normalizeCondition(
  when: Array<string> | undefined,
  unless: Array<string> | undefined,
): string {
  if ((when === undefined || when.length === 0) && (unless === undefined || unless.length === 0)) {
    return "";
  }
  return `${[...(when ?? [])].sort().join("\0")}\u0001${[...(unless ?? [])].sort().join("\0")}`;
}

/**
 * Reports names in one half of a condition (`when` or `unless`) that aren't
 * areas of the grid. A `when` area the layout leaves out is fine: the layout
 * still applies when it's present, and hides it.
 */
function validateConditionAreas(
  clause: "when" | "unless",
  names: Array<string> | undefined,
  areas: ReadonlyArray<string>,
  context: string,
): Array<string> {
  const areaSet = new Set(areas);
  return (names ?? [])
    .filter(name => !areaSet.has(name))
    .map(
      name =>
        `${context}: Unknown area "${name}" in '${clause}' clause. Valid areas are: ${areas.join(", ")}.`,
    );
}

/**
 * Whether a track list's length is its track count: not when a track uses
 * `repeat()`, which stands for any number of tracks.
 */
function isCountable(tracks: ReadonlyArray<TrackSize>): boolean {
  return !tracks.some(track => track.includes("repeat("));
}

interface ValidateLayoutDimensionsOptions {
  layout: GridLayout<string>;
  rows: Array<TrackSize> | undefined;
  columns: Array<TrackSize> | undefined;
  context: string;
}

/**
 * Validates a grid layout's dimensions against rows/columns arrays.
 *
 * @param options - Validation options
 * @param options.layout - The 2D grid layout
 * @param options.rows - Optional row track sizes
 * @param options.columns - Optional column track sizes
 * @param options.context - Context string for error messages
 * @returns {Array<string>} Array of error messages
 */
function validateLayoutDimensions({
  layout,
  rows,
  columns,
  context,
}: ValidateLayoutDimensionsOptions): Array<string> {
  const errors: Array<string> = [];

  const firstRow = layout[0];
  if (firstRow === undefined) {
    errors.push(`${context}: Layout has no rows.`);
    return errors;
  }

  const rowCount = layout.length;
  const firstRowLength = firstRow.length;

  // Check rows array length
  if (rows !== undefined && isCountable(rows) && rows.length !== rowCount) {
    errors.push(
      `${context}: rows array length (${rows.length}) doesn't match layout row count (${rowCount}).`,
    );
  }

  // Check columns array length
  if (columns !== undefined && isCountable(columns) && columns.length !== firstRowLength) {
    errors.push(
      `${context}: columns array length (${columns.length}) doesn't match layout column count (${firstRowLength}).`,
    );
  }

  // Check for inconsistent column counts across rows
  for (let i = 1; i < layout.length; i++) {
    const row = layout[i];
    if (row === undefined) {
      continue;
    }
    if (row.length !== firstRowLength) {
      errors.push(
        `${context}: Row ${i} has ${row.length} columns, but row 0 has ${firstRowLength}. All rows must have the same number of columns.`,
      );
    }
  }

  return errors;
}

interface ValidateCellsOptions {
  layout: GridLayout<string>;
  areas: ReadonlyArray<string>;
  context: string;
}

/**
 * Whether a cell is well formed: a base (an area name or `.`) followed by
 * any layers (area names), joined by `+`, each name at most once.
 */
function isWellFormed(cell: string): boolean {
  const { base, layers } = parseCell(cell);
  const names = cellAreas(cell);
  return (
    base !== "" &&
    layers.every(layer => layer !== "" && layer !== ".") &&
    new Set(names).size === names.length
  );
}

/**
 * Validates a layout's cells: every cell is `.`, an area name, or a base
 * (an area name or `.`) and the layers over it joined by `+`, each name is
 * an area of the grid, and every area and layer covers a rectangle of cells.
 */
function validateCells({ layout, areas, context }: ValidateCellsOptions): Array<string> {
  const errors: Array<string> = [];
  const areaSet = new Set(areas);
  const covered = new Map<string, { cells: Array<[number, number]>; asBase: boolean }>();

  layout.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!isWellFormed(cell)) {
        errors.push(
          `${context}: Malformed cell "${cell}" at row ${rowIndex}, column ${colIndex}. A cell is ".", an area name, or a base (an area name or ".") and area names layered over it, joined by "+" (each at most once).`,
        );
        return;
      }
      const { base } = parseCell(cell);
      for (const name of cellAreas(cell)) {
        if (!areaSet.has(name)) {
          errors.push(
            `${context}: Unknown area name "${name}" at row ${rowIndex}, column ${colIndex}. Valid areas are: ${areas.join(", ")}.`,
          );
          continue;
        }
        const entry = covered.get(name) ?? { cells: [], asBase: false };
        entry.cells.push([rowIndex, colIndex]);
        entry.asBase ||= name === base;
        covered.set(name, entry);
      }
    });
  });

  for (const [name, { cells, asBase }] of covered) {
    const rows = cells.map(([rowIndex]) => rowIndex);
    const cols = cells.map(([, colIndex]) => colIndex);
    const top = Math.min(...rows);
    const bottom = Math.max(...rows);
    const left = Math.min(...cols);
    const right = Math.max(...cols);
    if ((bottom - top + 1) * (right - left + 1) !== cells.length) {
      errors.push(
        `${context}: ${asBase ? "Area" : "Layer"} "${name}" isn't a rectangle, so it will cover rows ${top}-${bottom}, columns ${left}-${right} (its bounding box).`,
      );
    }
  }

  return errors;
}

interface ValidateBreakpointsOptions {
  breakpoints: Partial<Record<BreakpointKey, BreakpointLayoutConfig<string>>> | undefined;
  areas: ReadonlyArray<string>;
  layoutIndex: number;
}

/**
 * Validates breakpoint configurations.
 *
 * @param options - Validation options
 * @param options.breakpoints - Optional breakpoint config
 * @param options.areas - Valid area names
 * @param options.layoutIndex - Index of the parent layout for error messages
 * @returns {Array<string>} Array of error messages
 */
function validateBreakpoints({
  breakpoints,
  areas,
  layoutIndex,
}: ValidateBreakpointsOptions): Array<string> {
  if (breakpoints === undefined) {
    return [];
  }

  const errors: Array<string> = [];

  for (const [breakpoint, config] of Object.entries(breakpoints)) {
    if (config === undefined) {
      continue;
    }
    const context = `Layout ${layoutIndex}, breakpoint "${breakpoint}"`;

    errors.push(
      ...validateLayoutDimensions({
        layout: config.layout,
        rows: config.rows,
        columns: config.columns,
        context,
      }),
    );
    errors.push(...validateCells({ layout: config.layout, areas, context }));
  }

  return errors;
}

/**
 * A condition as written, for messages: `when: icon; unless: tag`.
 */
function describeCondition(
  when: Array<string> | undefined,
  unless: Array<string> | undefined,
): string {
  return [
    ...(when?.length ? [`when: ${when.join(", ")}`] : []),
    ...(unless?.length ? [`unless: ${unless.join(", ")}`] : []),
  ].join("; ");
}

/**
 * Reports layouts whose condition (the same `when` and `unless` areas, in any
 * order) repeats an earlier layout's: the later one always wins, so the
 * earlier one never applies. Base layouts have no condition and are skipped.
 */
function validateDuplicateConditions<TAreaName extends string>(
  layouts: Array<LayoutConfig<TAreaName>>,
): Array<string> {
  const warnings: Array<string> = [];
  const seenConditions = new Map<string, number>();

  layouts.forEach(({ when, unless }, i) => {
    const key = normalizeCondition(when, unless);
    if (key === "") {
      return;
    }

    const previousIndex = seenConditions.get(key);
    if (previousIndex !== undefined) {
      warnings.push(
        `Layout ${i} has the same condition as Layout ${previousIndex} (${describeCondition(when, unless)}). ` +
          `Layout ${i} will override Layout ${previousIndex} since it appears later.`,
      );
    }

    seenConditions.set(key, i);
  });

  return warnings;
}

/**
 * Validates a grid configuration and returns an array of error messages.
 * Returns an empty array if the configuration is valid.
 *
 * @param config - The grid configuration to validate
 * @returns {Array<string>} Array of error message strings
 */
export function validateGridConfig<TAreaName extends string>(
  config: GridConfig<TAreaName>,
): Array<string> {
  const errors: Array<string> = [];
  const { areas, layouts } = config;

  // Validate areas array
  if (areas.length === 0) {
    errors.push("Config has no areas defined. Define at least one area.");
  }

  // Validate layouts array
  if (layouts.length === 0) {
    errors.push("Config has no layouts defined. Define at least one layout.");
  }

  errors.push(...validateDuplicateConditions(layouts));

  // Validate each layout
  for (let i = 0; i < layouts.length; i++) {
    const layoutConfig = layouts[i];
    if (layoutConfig === undefined) {
      continue;
    }
    const context = `Layout ${i}`;

    errors.push(
      ...validateLayoutDimensions({
        layout: layoutConfig.layout,
        rows: layoutConfig.rows,
        columns: layoutConfig.columns,
        context,
      }),
    );
    errors.push(...validateCells({ layout: layoutConfig.layout, areas, context }));
    errors.push(...validateConditionAreas("when", layoutConfig.when, areas, context));
    errors.push(...validateConditionAreas("unless", layoutConfig.unless, areas, context));
    errors.push(
      ...validateBreakpoints({ breakpoints: layoutConfig.breakpoints, areas, layoutIndex: i }),
    );
  }

  return errors;
}
