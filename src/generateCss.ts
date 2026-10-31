import { placeAreas } from "./engine/placement";
import { Condition, Rule, toRules } from "./engine/rules";
import { CONTAINER_BREAKPOINTS, GridConfig, SlotProps } from "./types";

/**
 * Creates a typed slots object from an array of area names.
 *
 * Each slot carries only a `data-area` attribute; placement lives in the
 * generated CSS.
 */
export function createSlots<TAreaName extends string>(
  areas: ReadonlyArray<TAreaName>,
): Record<TAreaName, SlotProps> {
  return Object.fromEntries(areas.map(area => [area, { "data-area": area }])) as unknown as Record<
    TAreaName,
    SlotProps
  >;
}

function areaSelector(area: string): string {
  return `[data-area="${area}"]`;
}

function conditionSelector(scope: string, { when, unless }: Condition): string {
  const has = when.map(area => `:has(> ${areaSelector(area)})`);
  const not = unless.map(area => `:not(:has(> ${areaSelector(area)}))`);
  return `${scope}${has.join("")}${not.join("")}`;
}

function ruleToCss(scope: string, areas: ReadonlyArray<string>, rule: Rule): string {
  const { cells, rows, columns } = rule.arrangement;
  const container = conditionSelector(scope, rule.condition);
  const placements = placeAreas(cells);

  const lines = [
    `${container} { ${[
      `grid-template-areas: ${cells.map(row => `'${row.join(" ")}'`).join(" ")};`,
      `grid-template-rows: ${rows !== undefined && rows.length > 0 ? rows.join(" ") : "none"};`,
      `grid-template-columns: ${columns !== undefined && columns.length > 0 ? columns.join(" ") : "none"};`,
    ].join(" ")} }`,
  ];

  for (const area of areas) {
    const placement = placements.get(area);
    if (placement === undefined) {
      continue;
    }
    const { rowStart, columnStart, rowEnd, columnEnd } = placement;
    lines.push(
      `${container} > ${areaSelector(area)} { grid-area: ${rowStart} / ${columnStart} / ${rowEnd} / ${columnEnd}; }`,
    );
  }

  const css = lines.join("\n");
  if (rule.breakpoint === undefined) {
    return css;
  }
  return `@container (min-width: ${CONTAINER_BREAKPOINTS[rule.breakpoint]}) {\n${css}\n}`;
}

/**
 * Generates the CSS for a grid definition.
 *
 * @param id - Identifier the grid container carries as `data-grid-id`
 * @param config - Grid configuration from createGrid().build()
 * @returns {string} CSS string for use in a style tag
 */
export function generateCss<TAreaName extends string>(
  id: string,
  config: GridConfig<TAreaName>,
): string {
  const scope = `[data-grid-id="${id}"]`;
  return toRules(config)
    .map(rule => ruleToCss(scope, config.areas, rule))
    .join("\n");
}
