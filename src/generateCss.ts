import { gridId } from "./engine/gridId";
import { HideRule, toHideRules } from "./engine/hiding";
import { parseCell } from "./engine/cells";
import { Placement, placeAreas } from "./engine/placement";
import { Arrangement, Condition, Rule, toRules } from "./engine/rules";
import { sizeContainerName } from "./markup";
import { GridConfig } from "./types";

/**
 * All generated CSS sits in this cascade layer, so a consumer's own unlayered
 * styles always win over it.
 */
const CASCADE_LAYER = "typed-grid-areas";

/**
 * An attribute selector, with the value unquoted when it is an identifier.
 */
function attributeSelector(name: string, value: string): string {
  return /^[A-Za-z_][\w-]*$/.test(value) ? `[${name}=${value}]` : `[${name}="${value}"]`;
}

function areaSelector(area: string): string {
  return attributeSelector("data-area", area);
}

/**
 * The condition as a compound selector to append to the grid container.
 */
function conditionCompound({ when, unless }: Condition): string {
  const has = when.map(area => `:has(> ${areaSelector(area)})`);
  const none =
    unless.length === 0
      ? ""
      : `:not(:has(${unless.map(area => `> ${areaSelector(area)}`).join(", ")}))`;
  return `${has.join("")}${none}`;
}

/**
 * Whether two conditions can hold at the same time.
 */
function canHoldTogether(a: Condition, b: Condition): boolean {
  return (
    !a.when.some(area => b.unless.includes(area)) && !b.when.some(area => a.unless.includes(area))
  );
}

/**
 * Selects the grid container while a condition holds. Wrapped in `:where()`
 * so every generated rule has zero specificity, and source order alone
 * decides which matching rule wins.
 */
function conditionSelector(scope: string, condition: Condition): string {
  return `:where(${scope}${conditionCompound(condition)})`;
}

/**
 * What every rule of one definition is scoped to: the grid container's id
 * attribute, and the name of its size container for breakpoints.
 */
type Scope = {
  grid: string;
  containerName: string;
};

/**
 * Wraps CSS in a query on the grid's own size container, for the width
 * range [from, until). Either end may be open.
 */
function inWidthRange(css: string, scope: Scope, from?: string, until?: string): string {
  const parts = [
    ...(from === undefined ? [] : [`(min-width: ${from})`]),
    ...(until === undefined ? [] : [`(not (min-width: ${until}))`]),
  ];
  if (parts.length === 0) {
    return css;
  }
  return `@container ${scope.containerName} ${parts.join(" and ")} {\n${css}\n}`;
}

/**
 * Makes the container a grid and places every area by name, once per
 * definition. Each rule's `grid-template-areas` then decides where that name
 * is, so a rule that applies places every area it names and nothing leaks in
 * from another.
 *
 * `display: grid` is layered like the rest, so a consumer's class can change
 * it. Slots aren't layers until a rule makes them one, so `--tga-over` starts
 * at `none` (rather than inheriting, say, from an outer grid's layer).
 */
function placementCss(scope: Scope, areas: ReadonlyArray<string>): string {
  return [
    `:where(${scope.grid}) { display: grid; }`,
    `:where(${scope.grid}) > :where([data-area]) { --tga-over: none; }`,
    ...areas.map(
      area => `:where(${scope.grid}) > :where(${areaSelector(area)}) { grid-area: ${area}; }`,
    ),
  ].join("\n");
}

/**
 * One declaration of a rule: its own value, or the property's initial value
 * when an earlier rule that can apply at the same time sets it (so that value
 * can't leak in). Omitted when there is nothing that could leak in.
 *
 * `valueOf` reads the property's value from any rule's arrangement, so the
 * same accessor answers both "what does this rule set" and "did an earlier
 * one set it".
 */
function declaration(
  property: string,
  initial: string,
  rule: Rule,
  earlier: ReadonlyArray<Rule>,
  valueOf: (arrangement: Arrangement) => string | undefined,
): Array<string> {
  const value = valueOf(rule.arrangement);
  if (value !== undefined) {
    return [`${property}: ${value};`];
  }
  return earlier.some(other => valueOf(other.arrangement) !== undefined)
    ? [`${property}: ${initial};`]
    : [];
}

/** A track list as one CSS value, or undefined when it sets no tracks. */
function trackList(tracks: ReadonlyArray<string> | undefined): string | undefined {
  return tracks !== undefined && tracks.length > 0 ? tracks.join(" ") : undefined;
}

/**
 * Places a layer by line numbers over the bounding rectangle of its cells:
 * it has no name in `grid-template-areas`, since its base owns those cells.
 * Drawn above the base whatever their order in the DOM, and tells its
 * content which area it is over through `--tga-over`.
 */
function layerPlacement({
  rowStart,
  columnStart,
  rowEnd,
  columnEnd,
  over,
}: Placement): Array<string> {
  return [
    `grid-area: ${rowStart} / ${columnStart} / ${rowEnd} / ${columnEnd};`,
    "z-index: 1;",
    `--tga-over: ${over === undefined || over === "." ? "none" : over};`,
  ];
}

/**
 * Places an area back by name, for a rule where it owns cells after an
 * earlier rule that can apply at the same time made it a layer.
 */
function namedPlacement(area: string): Array<string> {
  return [`grid-area: ${area};`, "z-index: auto;", "--tga-over: none;"];
}

const placementCache = new WeakMap<Rule, Map<string, Placement>>();

/**
 * Where a rule places each area, worked out once per rule.
 */
function placementsOf(rule: Rule): Map<string, Placement> {
  let placements = placementCache.get(rule);
  if (placements === undefined) {
    placements = placeAreas(rule.arrangement.cells);
    placementCache.set(rule, placements);
  }
  return placements;
}

/**
 * The CSS for one rule. `earlier` are the rules before it that can apply at
 * the same time; only what they set needs resetting here.
 */
function ruleToCss(scope: Scope, rule: Rule, earlier: ReadonlyArray<Rule>): string {
  const { cells } = rule.arrangement;
  const container = conditionSelector(scope.grid, rule.condition);

  const lines = [
    `${container} { ${[
      `grid-template-areas: ${cells
        .map(row => `'${row.map(cell => parseCell(cell).base).join(" ")}'`)
        .join(" ")};`,
      ...declaration("grid-template-rows", "none", rule, earlier, ({ rows }) => trackList(rows)),
      ...declaration("grid-template-columns", "none", rule, earlier, ({ columns }) =>
        trackList(columns),
      ),
    ].join(" ")} }`,
  ];

  for (const [area, placement] of placementsOf(rule)) {
    const alignment = [
      ...declaration("justify-self", "auto", rule, earlier, ({ align }) => align?.[area]?.justify),
      ...declaration("align-self", "auto", rule, earlier, ({ align }) => align?.[area]?.align),
    ];
    const declarations = [
      ...(placement.over !== undefined
        ? layerPlacement(placement)
        : earlier.some(other => placementsOf(other).get(area)?.over !== undefined)
          ? namedPlacement(area)
          : []),
      ...alignment,
    ];
    if (declarations.length > 0) {
      lines.push(`${container} > :where(${areaSelector(area)}) { ${declarations.join(" ")} }`);
    }
  }

  return inWidthRange(lines.join("\n"), scope, rule.minWidth);
}

function hideRuleToCss(scope: Scope, { area, condition, except, from, until }: HideRule): string {
  const notShown = except.map(showing => `:not(${conditionCompound(showing)})`).join("");
  const slot = `:where(${scope.grid}${conditionCompound(condition)}${notShown}) > :where(${areaSelector(area)})`;
  // Important, so a consumer's own `display` on the slot can't bring it back (ADR 0003).
  return inWidthRange(`${slot} { display: none !important; }`, scope, from, until);
}

/**
 * Generates the CSS for a grid definition.
 *
 * The CSS depends only on the definition and is scoped to grid containers
 * carrying `data-grid-id="${gridId(config)}"` (breakpoints to the size
 * container named `sizeContainerName(gridId(config))`), so every instance of
 * a definition shares it and it only needs emitting once.
 *
 * @param config - Grid definition from defineLayout()
 * @returns {string} CSS string for use in a style tag
 */
export function generateCss<TAreaName extends string>(config: GridConfig<TAreaName>): string {
  const id = gridId(config);
  const scope: Scope = {
    grid: attributeSelector("data-grid-id", id),
    containerName: sizeContainerName(id),
  };
  const rules = toRules(config);
  const css = [
    placementCss(scope, config.areas),
    ...rules.map((rule, index) =>
      ruleToCss(
        scope,
        rule,
        rules.slice(0, index).filter(other => canHoldTogether(other.condition, rule.condition)),
      ),
    ),
    ...toHideRules(config.areas, rules).map(hideRule => hideRuleToCss(scope, hideRule)),
  ];
  return `@layer ${CASCADE_LAYER} {\n${css.join("\n")}\n}`;
}
