import { HideRule, toHideRules } from "./engine/hiding";
import { placeAreas } from "./engine/placement";
import { Condition, Rule, toRules } from "./engine/rules";
import { CONTAINER_BREAKPOINTS, ContainerBreakpoint, GridConfig, SlotProps } from "./types";

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

/**
 * All generated CSS sits in this cascade layer, so a consumer's own unlayered
 * styles always win over it.
 */
const CASCADE_LAYER = "typed-grid-areas";

function areaSelector(area: string): string {
  return `[data-area="${area}"]`;
}

/**
 * The condition as a compound selector to append to the grid container.
 */
function conditionCompound({ when, unless }: Condition): string {
  const has = when.map(area => `:has(> ${areaSelector(area)})`);
  const not = unless.map(area => `:not(:has(> ${areaSelector(area)}))`);
  return `${has.join("")}${not.join("")}`;
}

/**
 * Selects the grid container while a condition holds. Wrapped in `:where()`
 * so every generated rule has zero specificity, and source order alone
 * decides which matching rule wins.
 */
function conditionSelector(scope: string, condition: Condition): string {
  return `:where(${scope}${conditionCompound(condition)})`;
}

function minWidth(breakpoint: ContainerBreakpoint): string {
  return `(min-width: ${CONTAINER_BREAKPOINTS[breakpoint]})`;
}

function inWidthRange(
  css: string,
  from: ContainerBreakpoint | undefined,
  until?: ContainerBreakpoint,
): string {
  const parts = [
    ...(from === undefined ? [] : [minWidth(from)]),
    ...(until === undefined ? [] : [`(not ${minWidth(until)})`]),
  ];
  if (parts.length === 0) {
    return css;
  }
  return `@container ${parts.join(" and ")} {\n${css}\n}`;
}

function ruleToCss(scope: string, areas: ReadonlyArray<string>, rule: Rule): string {
  const { cells, rows, columns, align } = rule.arrangement;
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
    // Every area gets alignment in every rule (`auto` where unset), so
    // alignment from another matching rule never leaks in.
    const { justify = "auto", align: alignSelf = "auto" } = align?.[area] ?? {};
    lines.push(
      `${container} > :where(${areaSelector(area)}) { ${[
        `grid-area: ${rowStart} / ${columnStart} / ${rowEnd} / ${columnEnd};`,
        `justify-self: ${justify};`,
        `align-self: ${alignSelf};`,
      ].join(" ")} }`,
    );
  }

  return inWidthRange(lines.join("\n"), rule.breakpoint);
}

function hideRuleToCss(scope: string, { area, condition, except, from, until }: HideRule): string {
  const notShown = except.map(shower => `:not(${conditionCompound(shower)})`).join("");
  const slot = `:where(${scope}${conditionCompound(condition)}${notShown}) > :where(${areaSelector(area)})`;
  // Important, so a consumer's own `display` on the slot can't bring it back.
  return inWidthRange(`${slot} { display: none !important; }`, from, until);
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
  const rules = toRules(config);
  const css = [
    ...rules.map(rule => ruleToCss(scope, config.areas, rule)),
    ...toHideRules(config.areas, rules).map(hideRule => hideRuleToCss(scope, hideRule)),
  ];
  return `@layer ${CASCADE_LAYER} {\n${css.join("\n")}\n}`;
}
