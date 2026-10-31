import {
  AreaAlignments,
  CONTAINER_BREAKPOINTS,
  ContainerBreakpoint,
  GridConfig,
  GridLayout,
  TrackSize,
} from "../types";
import { withDerivedRules } from "./derive";

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
 * Orders widths from narrowest to widest; no width ranks lowest. Lengths in
 * px, rem and em are compared (at 16px to the rem); any other length ranks
 * after all of those.
 */
export function widthRank(width: string | undefined): number {
  if (width === undefined) {
    return -1;
  }
  const match = /^(\d*\.?\d+)(px|rem|em)$/.exec(width.trim());
  if (match === null) {
    return Number.MAX_SAFE_INTEGER;
  }
  const value = Number(match[1]);
  return match[2] === "px" ? value : value * 16;
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

    layoutRules.push({
      condition,
      arrangement: {
        cells: layoutConfig.layout,
        rows: layoutConfig.rows,
        columns: layoutConfig.columns,
        align: layoutConfig.align,
      },
    });

    const breakpointRules: Array<Rule> = [];
    for (const [key, breakpointConfig] of Object.entries(layoutConfig.breakpoints ?? {})) {
      const minWidth = breakpointWidth(key);
      if (minWidth === undefined || breakpointConfig === undefined) {
        continue;
      }
      breakpointRules.push({
        condition,
        minWidth,
        arrangement: {
          cells: breakpointConfig.layout,
          rows: breakpointConfig.rows,
          columns: breakpointConfig.columns,
          align: breakpointConfig.align,
        },
      });
    }
    breakpointRules.sort((a, b) => widthRank(a.minWidth) - widthRank(b.minWidth));
    layoutRules.push(...breakpointRules);
    rules.push(...withDerivedRules(layoutRules, config.optionalAreas ?? []));
  }

  return rules;
}
