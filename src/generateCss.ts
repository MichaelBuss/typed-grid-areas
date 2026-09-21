import {
  CONTAINER_BREAKPOINTS,
  ContainerBreakpoint,
  GridConfig,
  GridLayout,
  GridStyles,
  NestedStyles,
  SlotProps,
  TrackSize,
} from "./types";

/**
 * Converts a 2D layout array to a CSS grid-template-areas string.
 *
 * @example
 * layoutToGridTemplateAreas([['icon', 'tag'], ['info', 'info']])
 * // Returns: "'icon tag' 'info info'"
 */
function layoutToGridTemplateAreas<TAreaName extends string>(
  layout: GridLayout<TAreaName>,
): string {
  return layout.map(row => `'${row.join(" ")}'`).join(" ");
}

/**
 * Converts an array of track sizes to a CSS grid-template-rows/columns string.
 *
 * @example
 * tracksToGridTemplate(['min-content', '1fr', 'auto'])
 * // Returns: "min-content 1fr auto"
 */
function tracksToGridTemplate(tracks: Array<TrackSize>): string {
  return tracks.join(" ");
}

/**
 * Generates the selector for an area name.
 * Uses [data-slot=name] format.
 */
function areaToSelector(area: string): string {
  return `[data-slot=${area}]`;
}

/**
 * Generates a :has() selector for the given conditions.
 *
 * Areas in `when` must be present (direct children).
 * All other areas from the full list are automatically treated as "must NOT be present".
 *
 * Uses direct child selector (>) for better performance and to avoid
 * false positives with nested grids.
 *
 * @example
 * generateHasSelector(['icon', 'tag'], ['icon', 'tag', 'info'])
 * // Returns: "&:has(> [data-slot=icon]):has(> [data-slot=tag]):not(:has(> [data-slot=info]))"
 */
function generateHasSelector(when: Array<string>, allAreas: ReadonlyArray<string>): string {
  const hasParts = when.map(area => `:has(> ${areaToSelector(area)})`);
  const notAreas = allAreas.filter(area => !when.includes(area));
  const notParts = notAreas.map(area => `:not(:has(> ${areaToSelector(area)}))`);

  return `&${[...hasParts, ...notParts].join("")}`;
}

/**
 * Helper to safely get or initialize a nested styles object
 */
function getOrCreateNestedStyles(styles: NestedStyles, key: string): NestedStyles {
  const existing = styles[key];
  if (typeof existing === "object") {
    return existing;
  }
  const newObj: NestedStyles = {};
  styles[key] = newObj;
  return newObj;
}

/**
 * Type guard to check if a string is a valid container breakpoint
 */
function isContainerBreakpoint(value: string): value is ContainerBreakpoint {
  return value in CONTAINER_BREAKPOINTS;
}

/**
 * Creates a typed slots object from an array of area names.
 *
 * Each slot contains a data-slot attribute and gridArea style.
 */
export function createSlots<TAreaName extends string>(
  areas: ReadonlyArray<TAreaName>,
): Record<TAreaName, SlotProps> {
  return Object.fromEntries(
    areas.map(area => [area, { "data-slot": area, style: { gridArea: area } }]),
  ) as unknown as Record<TAreaName, SlotProps>;
}

/**
 * Converts a camelCase CSS property name to kebab-case.
 *
 * @example
 * camelToKebab('gridTemplateAreas') // 'grid-template-areas'
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Converts a NestedStyles object to CSS declarations string.
 */
function stylesToCssDeclarations(styles: NestedStyles): string {
  const declarations: Array<string> = [];

  for (const key of Object.keys(styles)) {
    const value = styles[key];
    // Only include non-nested properties (not starting with & or @)
    if (
      !key.startsWith("&") &&
      !key.startsWith("@") &&
      value !== undefined &&
      typeof value !== "object"
    ) {
      declarations.push(`${camelToKebab(key)}: ${value};`);
    }
  }

  return declarations.join(" ");
}

/**
 * Recursively converts a GridStyles object to a CSS string.
 */
function stylesToCss(styles: NestedStyles, parentSelector: string, indent = ""): string {
  const lines: Array<string> = [];

  // Collect base declarations for this level
  const baseDeclarations = stylesToCssDeclarations(styles);
  if (baseDeclarations.length > 0) {
    lines.push(`${indent}${parentSelector} { ${baseDeclarations} }`);
  }

  // Process nested selectors
  for (const key of Object.keys(styles)) {
    const value = styles[key];

    if (typeof value === "object") {
      if (key.startsWith("&")) {
        // Pseudo-selector: replace & with parent selector
        const nestedSelector = key.replace(/^&/, parentSelector);
        lines.push(stylesToCss(value, nestedSelector, indent));
      } else if (key.startsWith("@")) {
        // At-rule (like @container): wrap in the at-rule
        const nestedCss = stylesToCss(value, parentSelector, `${indent}  `);
        lines.push(`${indent}${key} {\n${nestedCss}\n${indent}}`);
      }
    }
  }

  return lines.join("\n");
}

interface ApplyLayoutStylesOptions {
  targetStyles: NestedStyles;
  layout: GridLayout<string>;
  rows?: Array<TrackSize>;
  columns?: Array<TrackSize>;
  isBreakpoint?: boolean;
}

/**
 * Applies layout styles (areas, rows, columns) to a styles object.
 *
 * For breakpoints (isBreakpoint=true), rows/columns are always explicitly set
 * to prevent base layout values from cascading. This makes breakpoints self-contained.
 */
function applyLayoutStyles({
  targetStyles,
  layout,
  rows,
  columns,
  isBreakpoint = false,
}: ApplyLayoutStylesOptions): void {
  targetStyles.gridTemplateAreas = layoutToGridTemplateAreas(layout);

  if (rows !== undefined && rows.length > 0) {
    targetStyles.gridTemplateRows = tracksToGridTemplate(rows);
  } else if (isBreakpoint) {
    // Breakpoints are self-contained - reset to prevent base cascade
    targetStyles.gridTemplateRows = "none";
  }

  if (columns !== undefined && columns.length > 0) {
    targetStyles.gridTemplateColumns = tracksToGridTemplate(columns);
  } else if (isBreakpoint) {
    // Breakpoints are self-contained - reset to prevent base cascade
    targetStyles.gridTemplateColumns = "none";
  }
}

/**
 * Generates CSS string from a grid configuration and id.
 *
 * @param id - Unique identifier for CSS scoping
 * @param config - Grid configuration from createGrid().build()
 * @returns {string} CSS string for use in a style tag
 */
export function generateCss<TAreaName extends string>(
  id: string,
  config: GridConfig<TAreaName>,
): string {
  const { areas, layouts } = config;

  // Build styles object
  const styles: GridStyles = {};

  for (const layoutDef of layouts) {
    const { layout, rows, columns, when = [], breakpoints = {} } = layoutDef;

    // No conditions - this is a base layout
    if (when.length === 0) {
      applyLayoutStyles({ targetStyles: styles, layout, rows, columns });

      // Add breakpoint overrides for base layout
      for (const breakpoint of Object.keys(breakpoints)) {
        if (isContainerBreakpoint(breakpoint)) {
          const breakpointConfig = breakpoints[breakpoint];
          if (breakpointConfig !== undefined) {
            const containerQuery = `@container (min-width: ${CONTAINER_BREAKPOINTS[breakpoint]})`;
            const nestedStyles = getOrCreateNestedStyles(styles, containerQuery);
            applyLayoutStyles({
              targetStyles: nestedStyles,
              layout: breakpointConfig.layout,
              rows: breakpointConfig.rows,
              columns: breakpointConfig.columns,
              isBreakpoint: true,
            });
          }
        }
      }
    } else {
      // Conditional layout - generate :has() selector
      // Areas not in `when` are automatically treated as "must NOT be present"
      const selector = generateHasSelector(when, areas);
      const conditionalStyles = getOrCreateNestedStyles(styles, selector);
      applyLayoutStyles({ targetStyles: conditionalStyles, layout, rows, columns });

      // Add breakpoint overrides for conditional layout
      for (const breakpoint of Object.keys(breakpoints)) {
        if (isContainerBreakpoint(breakpoint)) {
          const breakpointConfig = breakpoints[breakpoint];
          if (breakpointConfig !== undefined) {
            const containerQuery = `@container (min-width: ${CONTAINER_BREAKPOINTS[breakpoint]})`;
            const containerStyles = getOrCreateNestedStyles(styles, containerQuery);
            const nestedConditional = getOrCreateNestedStyles(containerStyles, selector);
            applyLayoutStyles({
              targetStyles: nestedConditional,
              layout: breakpointConfig.layout,
              rows: breakpointConfig.rows,
              columns: breakpointConfig.columns,
              isBreakpoint: true,
            });
          }
        }
      }
    }
  }

  // Generate CSS string with the container selector
  const containerSelector = `[data-grid-id="${id}"]`;
  return stylesToCss(styles, containerSelector);
}
