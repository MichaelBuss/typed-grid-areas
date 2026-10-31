import { parseTemplate, parseTracks } from "./template/parseTemplate";
import { ArrangementCheck } from "./template/templateTypes";
import {
  AreaAlignments,
  BreakpointKey,
  BreakpointLayoutConfig,
  LayoutConfig,
  LayoutDefinition,
} from "./types";
import { validateGridConfig } from "./validateGridConfig";

/**
 * An area as written in `areas`: its name, with a trailing `?` when the area
 * is optional.
 */
type AreaName<TArea extends string> = TArea extends `${infer TName}?` ? TName : TArea;

type OptionalAreaName<TArea extends string> = TArea extends `${infer TName}?` ? TName : never;

/**
 * One arrangement of the areas, as written in a layout or a breakpoint.
 */
export type ArrangementInput<TAreaName extends string> = {
  /**
   * The arrangement drawn as text: rows separated by newlines or `/`, cells
   * by whitespace. `.` is an empty cell and `base+layer` draws `layer` over
   * `base`.
   */
  template: string;
  /** Row track sizes as one CSS track list, one track per template row. */
  rows?: string;
  /** Column track sizes as one CSS track list, one track per template column. */
  columns?: string;
  /** Per-area alignment while this arrangement applies. */
  align?: AreaAlignments<TAreaName>;
};

/**
 * One layout of a `defineLayout` definition.
 */
export type LayoutInput<TAreaName extends string> = ArrangementInput<TAreaName> & {
  /** Areas that must be present for this layout to apply. */
  when?: ReadonlyArray<TAreaName>;
  /** Areas that must be absent for this layout to apply. */
  unless?: ReadonlyArray<TAreaName>;
  /** Arrangements that replace this one once the grid is given at least the breakpoint's width. */
  breakpoints?: Partial<Record<BreakpointKey, ArrangementInput<TAreaName>>>;
};

type LayoutCheck<TLayout, TAreaName extends string> = ArrangementCheck<TLayout, TAreaName> &
  (TLayout extends { breakpoints: infer TBreakpoints }
    ? { breakpoints?: { [K in keyof TBreakpoints]: ArrangementCheck<TBreakpoints[K], TAreaName> } }
    : unknown);

/** Each layout, intersected with the checks it must also pass. */
type CheckedLayouts<TLayouts, TAreaName extends string> = {
  [K in keyof TLayouts]: TLayouts[K] & NoInfer<LayoutCheck<TLayouts[K], TAreaName>>;
};

function toArrangement<TAreaName extends string>(
  arrangement: ArrangementInput<TAreaName>,
): BreakpointLayoutConfig<TAreaName> {
  return {
    layout: parseTemplate(arrangement.template) as BreakpointLayoutConfig<TAreaName>["layout"],
    rows: arrangement.rows === undefined ? undefined : parseTracks(arrangement.rows),
    columns: arrangement.columns === undefined ? undefined : parseTracks(arrangement.columns),
    align: arrangement.align,
  };
}

function toLayout<TAreaName extends string>(
  layout: LayoutInput<TAreaName>,
): LayoutConfig<TAreaName> {
  return {
    ...toArrangement(layout),
    when: layout.when === undefined ? undefined : [...layout.when],
    unless: layout.unless === undefined ? undefined : [...layout.unless],
    breakpoints:
      layout.breakpoints === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(layout.breakpoints).flatMap(([key, arrangement]) =>
              arrangement === undefined ? [] : [[key, toArrangement(arrangement)]],
            ),
          ),
  };
}

/**
 * Whether this is a development build. Bundlers replace
 * `process.env.NODE_ENV`; without one, `process` may not exist at all.
 */
function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false;
  }
}

/**
 * Defines a grid: its areas and the layouts that arrange them.
 *
 * Templates, track lists, alignment and conditions are checked against the
 * areas at compile time. The errors name the problem on the offending
 * property, for example `{ _unknownArea: "iconn" }` on `template`, or
 * `{ _columnCountError: { expected: 2; got: 3 } }` on `columns`. In
 * development, what types can't check (areas and layers that aren't
 * rectangles, malformed cells) is reported with `console.warn`, once per
 * definition.
 *
 * @example
 * ```ts
 * const card = defineLayout({
 *   areas: ["icon?", "information", "cardTag?"],
 *   layouts: [
 *     {
 *       template: `
 *         icon        cardTag
 *         information information`,
 *       columns: "min-content minmax(0, 1fr)",
 *       align: { cardTag: { justify: "end" } },
 *       breakpoints: {
 *         "@sm": {
 *           template: "icon information cardTag",
 *           columns: "min-content minmax(0, 1fr) auto",
 *         },
 *       },
 *     },
 *     { unless: ["cardTag"], template: "icon information" },
 *   ],
 * });
 * ```
 */
export function defineLayout<
  const TAreas extends ReadonlyArray<string>,
  const TLayouts extends ReadonlyArray<LayoutInput<AreaName<TAreas[number]>>>,
>(definition: {
  /** The grid's area names. A trailing `?` marks an area optional. */
  areas: TAreas;
  /** The layouts, in precedence order: when several apply, the later one wins. */
  layouts: CheckedLayouts<TLayouts, AreaName<TAreas[number]>>;
}): LayoutDefinition<AreaName<TAreas[number]>, OptionalAreaName<TAreas[number]>> {
  type TAreaName = AreaName<TAreas[number]>;
  type TOptionalAreaName = OptionalAreaName<TAreas[number]>;

  const config: LayoutDefinition<TAreaName, TOptionalAreaName> = {
    areas: definition.areas.map(area => area.replace(/\?$/, "") as TAreaName),
    optionalAreas: definition.areas
      .filter(area => area.endsWith("?"))
      .map(area => area.slice(0, -1) as TOptionalAreaName),
    layouts: definition.layouts.map(layout => toLayout<TAreaName>(layout)),
  };

  if (isDevelopment()) {
    for (const warning of validateGridConfig(config)) {
      // eslint-disable-next-line no-console
      console.warn(`defineLayout: ${warning}`);
    }
  }

  return config;
}
