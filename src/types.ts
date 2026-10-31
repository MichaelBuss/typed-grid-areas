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
 * A breakpoint at an arbitrary width, in Tailwind's arbitrary-value syntax:
 * `"@[27rem]"` switches when the grid is given at least 27rem.
 */
export type ArbitraryBreakpoint = `@[${string}]`;

/**
 * A breakpoint key: a named Tailwind size (`"@sm"`) or an arbitrary length (`"@[27rem]"`).
 */
export type BreakpointKey = ContainerBreakpoint | ArbitraryBreakpoint;

/**
 * The name an area declaration declares. Areas are declared by name, with a
 * `?` suffix marking an optional area: `"icon?"` declares `"icon"`.
 */
export type AreaName<TDeclaration extends string> = TDeclaration extends `${infer TName}?`
  ? TName
  : TDeclaration;

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
 * One layout of a grid definition as the engine takes it: its condition,
 * cells, track sizes, alignment and breakpoints. `defineLayout` builds it
 * from a template, after checking the template at compile time.
 */
export type LayoutConfig<TAreaName extends string> = {
  /** The arrangement's cells, row by row. "." is an empty cell; "a+b" draws layer b over a. */
  cells: GridLayout<TAreaName>;
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
  breakpoints?: Partial<Record<BreakpointKey, BreakpointLayoutConfig<TAreaName>>>;
};

/**
 * Breakpoint layout override - can include different layout and/or track sizes
 */
export type BreakpointLayoutConfig<TAreaName extends string> = {
  /** The arrangement's cells at this breakpoint, row by row. */
  cells: GridLayout<TAreaName>;
  rows?: Array<TrackSize>;
  columns?: Array<TrackSize>;
  /** Per-area alignment at this breakpoint. Not inherited from the layout. */
  align?: AreaAlignments<TAreaName>;
};

/**
 * A grid definition as the engine takes it: what `defineLayout` returns. Its
 * id (`gridId`) is a hash of this content, so equal definitions share CSS.
 */
export type GridConfig<TAreaName extends string> = {
  /** Array of area names - slots are matched as [data-area=name] */
  areas: ReadonlyArray<TAreaName>;
  /**
   * The areas whose slot may be absent (declared with a `?` suffix). Every
   * other area is required. Each layout gets a derived layout for every
   * combination of absent optional areas.
   */
  optionalAreas?: ReadonlyArray<TAreaName>;
  /** Layout configurations */
  layouts: Array<LayoutConfig<TAreaName>>;
};

/**
 * A grid definition from `defineLayout`, typed with its area names. It always
 * lists its optional areas (empty when there are none).
 */
export type LayoutDefinition<TAreaName extends string> = GridConfig<TAreaName> & {
  optionalAreas: ReadonlyArray<TAreaName>;
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
