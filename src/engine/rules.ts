import {
  CONTAINER_BREAKPOINTS,
  ContainerBreakpoint,
  GridConfig,
  GridLayout,
  TrackSize,
} from "../types";

/**
 * When a rule applies: areas that must be present and areas that must be
 * absent. Areas in neither list don't affect it.
 */
export type Condition = {
  when: ReadonlyArray<string>;
  unless: ReadonlyArray<string>;
};

/**
 * One concrete arrangement of a grid's areas: the cells plus track sizes.
 */
export type Arrangement = {
  cells: GridLayout<string>;
  rows?: ReadonlyArray<TrackSize>;
  columns?: ReadonlyArray<TrackSize>;
};

/**
 * A single generated rule. Rules are ordered by precedence: when several
 * apply at once, the last one wins.
 */
export type Rule = {
  condition: Condition;
  /** Present for an arrangement that only applies from this breakpoint up. */
  breakpoint?: ContainerBreakpoint;
  arrangement: Arrangement;
};

function isContainerBreakpoint(value: string): value is ContainerBreakpoint {
  return value in CONTAINER_BREAKPOINTS;
}

const BREAKPOINT_ORDER = Object.keys(CONTAINER_BREAKPOINTS);

/**
 * Turns a grid definition into its ordered list of rules: each layout's own
 * arrangement, followed by its breakpoint arrangements from narrowest to
 * widest, in the order the layouts were declared.
 */
export function toRules(config: GridConfig<string>): Array<Rule> {
  const rules: Array<Rule> = [];

  for (const layoutConfig of config.layouts) {
    const when = layoutConfig.when ?? [];
    const unless = when.length === 0 ? [] : config.areas.filter(area => !when.includes(area));
    const condition: Condition = { when, unless };

    rules.push({
      condition,
      arrangement: {
        cells: layoutConfig.layout,
        rows: layoutConfig.rows,
        columns: layoutConfig.columns,
      },
    });

    const breakpoints = Object.keys(layoutConfig.breakpoints ?? {})
      .filter(isContainerBreakpoint)
      .sort((a, b) => BREAKPOINT_ORDER.indexOf(a) - BREAKPOINT_ORDER.indexOf(b));

    for (const breakpoint of breakpoints) {
      const breakpointConfig = layoutConfig.breakpoints?.[breakpoint];
      if (breakpointConfig === undefined) {
        continue;
      }
      rules.push({
        condition,
        breakpoint,
        arrangement: {
          cells: breakpointConfig.layout,
          rows: breakpointConfig.rows,
          columns: breakpointConfig.columns,
        },
      });
    }
  }

  return rules;
}
