import {
  AreaAlignments,
  BREAKPOINT_UNITS,
  BreakpointLayoutConfig,
  BreakpointUnit,
  CONTAINER_BREAKPOINTS,
  ContainerBreakpoint,
  GridConfig,
  GridLayout,
  TrackSize,
} from "../types.ts";
import { withDerivedRules } from "./derive.ts";

/**
 * When a rule applies: areas that must be present and areas that must be
 * absent. Areas in neither list don't affect it.
 */
export type Condition = {
  when: ReadonlyArray<string>;
  unless: ReadonlyArray<string>;
};

/**
 * One concrete arrangement of a grid's areas: the cells plus track sizes and
 * per-area alignment.
 */
export type Arrangement = {
  cells: GridLayout<string>;
  rows?: ReadonlyArray<TrackSize>;
  columns?: ReadonlyArray<TrackSize>;
  align?: AreaAlignments<string>;
};

/**
 * A single generated rule. Rules are ordered by precedence: when several
 * apply at once, the last one wins.
 */
export type Rule = {
  condition: Condition;
  /**
   * Present for an arrangement that only applies once the grid is given at
   * least this width (a CSS length).
   */
  minWidth?: string;
  arrangement: Arrangement;
};

/** An arbitrary breakpoint's width: a plain, non-negative number and an allowed unit. */
const ARBITRARY_WIDTH = new RegExp(`^(\\d+(?:\\.\\d+)?|\\.\\d+)(${BREAKPOINT_UNITS.join("|")})$`);

/**
 * Resolves a breakpoint key to the width it switches at: a named Tailwind
 * size (`"@sm"` -> `"24rem"`) or an arbitrary length (`"@[27rem]"` -> `"27rem"`).
 * Returns undefined for anything else.
 */
export function breakpointWidth(key: string): string | undefined {
  if (key in CONTAINER_BREAKPOINTS) {
    return CONTAINER_BREAKPOINTS[key as ContainerBreakpoint];
  }
  return /^@\[(.+)\]$/.exec(key)?.[1];
}

/**
 * The unit of an allowed breakpoint key (named sizes are in rem), or
 * undefined for a key that isn't allowed.
 */
export function breakpointUnit(key: string): BreakpointUnit | undefined {
  const width = breakpointWidth(key);
  return width === undefined
    ? undefined
    : (ARBITRARY_WIDTH.exec(width)?.[2] as BreakpointUnit | undefined);
}

/**
 * Orders widths from narrowest to widest; no width ranks lowest. Widths are
 * compared by their number alone, which is exact because every breakpoint of
 * a definition shares one unit. A width that isn't allowed ranks last.
 */
export function widthRank(width: string | undefined): number {
  if (width === undefined) {
    return -1;
  }
  const match = ARBITRARY_WIDTH.exec(width);
  return match === null ? Number.MAX_SAFE_INTEGER : Number(match[1]);
}

/**
 * The arrangement a layout or one of its breakpoints draws.
 */
function arrangementOf({
  cells,
  rows,
  columns,
  align,
}: BreakpointLayoutConfig<string>): Arrangement {
  return { cells, rows, columns, align };
}

/**
 * Turns a grid definition into its ordered list of rules, layout by layout in
 * the order they were declared: each layout's own arrangement, followed by
 * its breakpoint arrangements from narrowest to widest, then the same again
 * for each of its derived layouts.
 */
export function toRules(config: GridConfig<string>): Array<Rule> {
  const rules: Array<Rule> = [];

  for (const layoutConfig of config.layouts) {
    const layoutRules: Array<Rule> = [];
    const condition: Condition = {
      when: layoutConfig.when ?? [],
      unless: layoutConfig.unless ?? [],
    };

    layoutRules.push({ condition, arrangement: arrangementOf(layoutConfig) });

    const breakpointRules: Array<Rule> = [];
    for (const [key, breakpointConfig] of Object.entries(layoutConfig.breakpoints ?? {})) {
      const minWidth = breakpointWidth(key);
      if (minWidth === undefined || breakpointConfig === undefined) {
        continue;
      }
      breakpointRules.push({ condition, minWidth, arrangement: arrangementOf(breakpointConfig) });
    }
    breakpointRules.sort((a, b) => widthRank(a.minWidth) - widthRank(b.minWidth));
    layoutRules.push(...breakpointRules);
    rules.push(...withDerivedRules(layoutRules, config.optionalAreas ?? []));
  }

  return rules;
}
