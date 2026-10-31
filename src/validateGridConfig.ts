import {
  BreakpointLayoutConfig,
  BreakpointKey,
  GridLayout,
  LayoutConfig,
  TrackSize,
  GridConfig,
} from "./types";

/**
 * Creates a normalized key from a when-clause for comparison.
 * Sorts the array alphabetically and joins with a delimiter.
 * Returns empty string for undefined/empty when-clauses.
 *
 * @param when - The when-clause array
 * @returns {string} A normalized string key for comparison
 */
function normalizeWhenClause(when: Array<string> | undefined): string {
  if (when === undefined || when.length === 0) {
    return "";
  }
  return [...when].sort().join("\0");
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
  if (rows !== undefined && rows.length !== rowCount) {
    errors.push(
      `${context}: rows array length (${rows.length}) doesn't match layout row count (${rowCount}).`,
    );
  }

  // Check columns array length
  if (columns !== undefined && columns.length !== firstRowLength) {
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

interface ValidateLayoutAreaNamesOptions {
  layout: GridLayout<string>;
  areas: ReadonlyArray<string>;
  context: string;
}

/**
 * Validates that all cell names in a layout are valid area names.
 *
 * @param options - Validation options
 * @param options.layout - The 2D grid layout
 * @param options.areas - Valid area names
 * @param options.context - Context string for error messages
 * @returns {Array<string>} Array of error messages
 */
function validateLayoutAreaNames({
  layout,
  areas,
  context,
}: ValidateLayoutAreaNamesOptions): Array<string> {
  const errors: Array<string> = [];
  const areaSet = new Set(areas);

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex++) {
    const row = layout[rowIndex];
    if (row === undefined) {
      continue;
    }
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      if (cell === undefined) {
        continue;
      }
      if (cell !== "." && !areaSet.has(cell)) {
        errors.push(
          `${context}: Unknown area name "${cell}" at row ${rowIndex}, column ${colIndex}. Valid areas are: ${areas.join(", ")}.`,
        );
      }
    }
  }

  return errors;
}

interface ValidateWhenClauseOptions {
  when: Array<string> | undefined;
  layout: GridLayout<string>;
  areas: ReadonlyArray<string>;
  context: string;
}

/**
 * Validates that all items in a 'when' array are valid area names and appear in the layout.
 *
 * @param options - Validation options
 * @param options.when - Optional when-clause array
 * @param options.layout - The 2D grid layout
 * @param options.areas - Valid area names
 * @param options.context - Context string for error messages
 * @returns {Array<string>} Array of error messages
 */
function validateWhenClause({
  when,
  layout,
  areas,
  context,
}: ValidateWhenClauseOptions): Array<string> {
  if (when === undefined || when.length === 0) {
    return [];
  }

  const errors: Array<string> = [];
  const areaSet = new Set(areas);
  const layoutCells = new Set(layout.flat());

  for (const item of when) {
    if (!areaSet.has(item)) {
      errors.push(
        `${context}: Unknown area "${item}" in 'when' clause. Valid areas are: ${areas.join(", ")}.`,
      );
    } else if (!layoutCells.has(item)) {
      errors.push(
        `${context}: Area "${item}" is in 'when' clause but doesn't appear in the layout. The layout will never match this condition.`,
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
    errors.push(...validateLayoutAreaNames({ layout: config.layout, areas, context }));
  }

  return errors;
}

/**
 * Validates that there are no duplicate 'when' clauses across layouts.
 * Two when-clauses are considered duplicates if they contain the same set of areas (order doesn't matter).
 *
 * @param layouts - Array of layout configurations
 * @returns {Array<string>} Array of warning messages
 */
function validateDuplicateWhenClauses<TAreaName extends string>(
  layouts: Array<LayoutConfig<TAreaName>>,
): Array<string> {
  const warnings: Array<string> = [];
  const seenWhenClauses = new Map<string, number>();

  for (let i = 0; i < layouts.length; i++) {
    const layoutConfig = layouts[i];
    if (layoutConfig === undefined) {
      continue;
    }

    const whenKey = normalizeWhenClause(layoutConfig.when);

    // Skip layouts without when-clauses (base layouts)
    if (whenKey === "") {
      continue;
    }

    const previousIndex = seenWhenClauses.get(whenKey);
    if (previousIndex !== undefined) {
      const whenDisplay = layoutConfig.when?.join(", ") ?? "";
      warnings.push(
        `Layout ${i} has the same 'when' clause as Layout ${previousIndex}: [${whenDisplay}]. ` +
          `Layout ${i} will override Layout ${previousIndex} since it appears later.`,
      );
    }

    seenWhenClauses.set(whenKey, i);
  }

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
    errors.push("Config has no areas defined. Use .areas([...]) to define at least one area.");
  }

  // Validate layouts array
  if (layouts.length === 0) {
    errors.push("Config has no layouts defined. Use .layout({...}) to define at least one layout.");
  }

  // Check for duplicate when-clauses
  errors.push(...validateDuplicateWhenClauses(layouts));

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
    errors.push(...validateLayoutAreaNames({ layout: layoutConfig.layout, areas, context }));
    errors.push(
      ...validateWhenClause({
        when: layoutConfig.when,
        layout: layoutConfig.layout,
        areas,
        context,
      }),
    );
    errors.push(
      ...validateBreakpoints({ breakpoints: layoutConfig.breakpoints, areas, layoutIndex: i }),
    );
  }

  return errors;
}
