/**
 * Tailwind CSS default container query breakpoints with @ prefix.
 *
 * These are the standard values used by @sm, @md, @lg, etc. in Tailwind container queries.
 *
 * @see https://tailwindcss.com/docs/responsive-design#container-queries
 */
export const CONTAINER_BREAKPOINTS = {
  "@xs": "20rem",
  "@sm": "24rem",
  "@md": "28rem",
  "@lg": "32rem",
  "@xl": "36rem",
  "@2xl": "42rem",
  "@3xl": "48rem",
  "@4xl": "56rem",
  "@5xl": "64rem",
  "@6xl": "72rem",
  "@7xl": "80rem",
} as const;

export type ContainerBreakpoint = keyof typeof CONTAINER_BREAKPOINTS;

/**
 * Empty cell marker for grid-template-areas.
 *
 * In CSS, a "." represents an empty/unnamed cell in the grid.
 */
export type EmptyCell = ".";

/**
 * A grid cell can be either an area name or an empty cell marker.
 */
export type GridCell<TAreaName extends string> = TAreaName | EmptyCell;

/**
 * A 2D grid layout where each inner array represents a row.
 * Use "." for empty cells.
 */
export type GridLayout<TAreaName extends string> = Array<Array<GridCell<TAreaName>>>;

/**
 * Track size definition (e.g., "1fr", "min-content", "auto", "100px").
 *
 * A plain string type widened just enough to keep editor autocomplete for the
 * common values below, while still accepting any valid CSS track size.
 */
export type TrackSize = "1fr" | "min-content" | "auto" | "minmax(0,1fr)" | (string & {});

/**
 * How an area sits within the cells it covers, along one axis.
 */
export type Alignment = "start" | "center" | "end" | "stretch" | "baseline";

/**
 * Alignment for one area: `justify` is the inline axis (justify-self),
 * `align` the block axis (align-self). Unset axes use the browser default.
 */
export type AreaAlignment = {
  justify?: Alignment;
  align?: Alignment;
};

/**
 * Per-area alignment for one layout or breakpoint arrangement.
 */
export type AreaAlignments<TAreaName extends string> = Partial<Record<TAreaName, AreaAlignment>>;

/**
 * Layout configuration with optional conditions and track sizes.
 * This is the runtime type - compile-time validation is done by the builder.
 */
export type LayoutConfig<TAreaName extends string> = {
  /** The grid layout to apply. Use "." for empty cells. */
  layout: GridLayout<TAreaName>;
  /** Grid row track sizes. */
  rows?: Array<TrackSize>;
  /** Grid column track sizes. */
  columns?: Array<TrackSize>;
  /** Area names that must be present for this layout to apply. */
  when?: Array<TAreaName>;
  /** Area names that must be absent for this layout to apply. */
  unless?: Array<TAreaName>;
  /** Per-area alignment while this layout applies. */
  align?: AreaAlignments<TAreaName>;
  /** Responsive breakpoint overrides */
  breakpoints?: Partial<Record<ContainerBreakpoint, BreakpointLayoutConfig<TAreaName>>>;
};

/**
 * Breakpoint layout override - can include different layout and/or track sizes
 */
export type BreakpointLayoutConfig<TAreaName extends string> = {
  layout: GridLayout<TAreaName>;
  rows?: Array<TrackSize>;
  columns?: Array<TrackSize>;
  /** Per-area alignment at this breakpoint. Not inherited from the layout. */
  align?: AreaAlignments<TAreaName>;
};

/**
 * Grid configuration output from the builder.
 * Contains the layout structure - id is generated at render time.
 */
export type GridConfig<TAreaName extends string> = {
  /** Array of area names - selectors are auto-generated as [data-slot=name] */
  areas: ReadonlyArray<TAreaName>;
  /** Layout configurations */
  layouts: Array<LayoutConfig<TAreaName>>;
};

/**
 * Slot props object for spreading on elements.
 *
 * The data-area attribute is what the generated CSS uses both to detect which
 * slots are present and to place them.
 */
export type SlotProps = {
  "data-area": string;
};

/**
 * A single CSS-in-JS style value: a declaration value, a nested selector/at-rule
 * block, or undefined.
 */
export type StyleValue = string | number | NestedStyles | undefined;

/**
 * Nested styles object for container queries and conditional selectors.
 *
 * Framework-agnostic replacement for React's `CSSProperties`, since core has
 * no React dependency.
 */
export interface NestedStyles {
  [key: string]: StyleValue;
}

/**
 * CSS-in-JS compatible styles object with nested selectors
 */
export type GridStyles = NestedStyles;

/**
 * Result type from useGridAreas hook.
 * Contains everything needed to render a GridAreas component.
 */
export type GridAreasResult<TAreaName extends string> = {
  /** Props to spread on elements, keyed by area name. Includes data-slot and style.gridArea */
  slots: Record<TAreaName, SlotProps>;
  /** CSS string for use in a <style> tag */
  css: string;
  /** Data attribute to add to the container element for CSS scoping */
  containerProps: { "data-grid-id": string };
};
