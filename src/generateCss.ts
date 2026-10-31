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
 * Resolves a breakpoint key to the width it switches at: a named Tailwind
 * size (`"@sm"` -> `"24rem"`) or an arbitrary length (`"@[27rem]"` -> `"27rem"`).
 * Returns undefined for anything else.
 */
function breakpointWidth(key: string): string | undefined {
  if (key in CONTAINER_BREAKPOINTS) {
    return CONTAINER_BREAKPOINTS[key as ContainerBreakpoint];
  }
  return /^@\[(.+)\]$/.exec(key)?.[1];
}

/**
 * The container name of a grid's size container, derived from the grid's id.
 *
 * Breakpoint queries target this name, so only the grid's own size container
 * can answer them, never an unrelated container above or below it. Characters
 * that aren't valid in a CSS identifier (React's `useId()` emits some) are
 * replaced.
 */
export function sizeContainerName(id: string): string {
  return `grid-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * The `@container` query for one breakpoint of the grid with the given id,
 * targeting that grid's own size container by name. Undefined for keys that
 * aren't a breakpoint.
 */
function sizeContainerQuery(id: string, breakpoint: string): string | undefined {
  const width = breakpointWidth(breakpoint);
  return width === undefined
    ? undefined
    : `@container ${sizeContainerName(id)} (min-width: ${width})`;
}

/**
 * Whether any layout in the config has breakpoints, i.e. whether the grid
 * needs its own size container.
 */
export function hasBreakpoints(config: GridConfig<string>): boolean {
  return config.layouts.some(
    ({ breakpoints }) => breakpoints !== undefined && Object.keys(breakpoints).length > 0,
  );
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
      for (const [breakpoint, breakpointConfig] of Object.entries(breakpoints)) {
        const containerQuery = sizeContainerQuery(id, breakpoint);
        if (containerQuery !== undefined) {
          if (breakpointConfig !== undefined) {
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
      for (const [breakpoint, breakpointConfig] of Object.entries(breakpoints)) {
        const containerQuery = sizeContainerQuery(id, breakpoint);
        if (containerQuery !== undefined) {
          if (breakpointConfig !== undefined) {
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
