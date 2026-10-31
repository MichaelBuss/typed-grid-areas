// PROTOTYPE (issue #4) — throwaway. Shared CSS engine behind all API variants.
// The variants differ in how you *describe* a grid; they all compile to Rules here.

export const BREAKPOINTS = {
  "@xs": "20rem",
  "@sm": "24rem",
  "@md": "28rem",
  "@lg": "32rem",
  "@xl": "36rem",
  "@2xl": "42rem",
} as const;
export type Breakpoint = keyof typeof BREAKPOINTS;

export type SelfAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type AreaAlign = { justify?: SelfAlign; align?: SelfAlign };

export type Template = Array<Array<string>>;

/** One arrangement of areas: template + tracks + per-area alignment. */
export type Arrangement = {
  template: Template;
  rows?: Array<string>;
  columns?: Array<string>;
  align?: Record<string, AreaAlign>;
};

/** A condition (present / absent areas) + optional breakpoint + arrangement. Later rules win. */
export type Rule = {
  when: Array<string>;
  unless: Array<string>;
  at?: Breakpoint;
  arrangement: Arrangement;
};

export type CompiledGrid = {
  id: string;
  areas: Array<string>;
  rules: Array<Rule>;
  hasBreakpoints: boolean;
  css: string;
};

/** Layout as authored: an arrangement, an optional condition, and breakpoint overrides. */
export type LayoutDef = Arrangement & {
  when?: Array<string>;
  unless?: Array<string>;
  breakpoints?: Partial<Record<Breakpoint, Arrangement>>;
};

const BREAKPOINT_ORDER = Object.keys(BREAKPOINTS) as Array<Breakpoint>;

const areaSelector = (area: string) => `[data-area="${area}"]`;
export const containerName = (id: string) => `tga-${id}`;

function conditionSelector(rule: Rule): string {
  return [
    ...rule.when.map(a => `:has(> ${areaSelector(a)})`),
    ...rule.unless.map(a => `:not(:has(> ${areaSelector(a)}))`),
  ].join("");
}

function templateToCss(template: Template): string {
  return template.length === 0 ? "none" : template.map(row => `"${row.join(" ")}"`).join(" ");
}

/**
 * Every rule is self-contained (tracks + alignment for every area are always set) and wrapped
 * in `:where()` so all rules share one specificity: source order alone decides, i.e. later wins.
 * Everything sits in a cascade layer so a consumer's own unlayered classes always beat it.
 */
export function compile(id: string, areas: Array<string>, rules: Array<Rule>): CompiledGrid {
  const root = `[data-grid="${id}"]`;
  const blocks = rules.map(rule => {
    const condition = conditionSelector(rule);
    const self = condition ? `${root}:where(${condition})` : root;
    const { template, rows, columns, align = {} } = rule.arrangement;
    const lines = [
      `${self} { grid-template-areas: ${templateToCss(template)}; grid-template-rows: ${rows?.join(" ") ?? "none"}; grid-template-columns: ${columns?.join(" ") ?? "none"}; }`,
      ...areas.map(
        a =>
          `${self} > ${areaSelector(a)} { justify-self: ${align[a]?.justify ?? "auto"}; align-self: ${align[a]?.align ?? "auto"}; }`,
      ),
    ];
    return rule.at
      ? `@container ${containerName(id)} (min-width: ${BREAKPOINTS[rule.at]}) {\n  ${lines.join("\n  ")}\n}`
      : lines.join("\n");
  });

  return {
    id,
    areas,
    rules,
    hasBreakpoints: rules.some(r => r.at !== undefined),
    css: `@layer typed-grid-areas {\n${blocks.join("\n")}\n}`,
  };
}

function arrangementsOf(layout: LayoutDef): Array<[Breakpoint | undefined, Arrangement]> {
  const bps = BREAKPOINT_ORDER.filter(bp => layout.breakpoints?.[bp]).map(
    bp => [bp, layout.breakpoints![bp]!] as [Breakpoint, Arrangement],
  );
  return [[undefined, layout], ...bps];
}

/** Explicit model: each authored layout becomes rules as written. Nothing is inferred. */
export function explicitRules(layouts: Array<LayoutDef>): Array<Rule> {
  return layouts.flatMap(layout =>
    arrangementsOf(layout).map(([at, arrangement]) => ({
      when: layout.when ?? [],
      unless: layout.unless ?? [],
      at,
      arrangement: {
        template: arrangement.template,
        rows: arrangement.rows,
        columns: arrangement.columns,
        align: arrangement.align,
      },
    })),
  );
}

const GONE = "\0";

/**
 * Remove absent areas from an arrangement. A row/column is dropped when it held an absent area
 * and everything else in it is either also gone or an area that continues into a neighbouring
 * track (a span that simply gets one track shorter). Authored "." cells are kept as written.
 */
export function collapse(arrangement: Arrangement, absent: Array<string>): Arrangement {
  let template = arrangement.template.map(row =>
    row.map(cell => (absent.includes(cell) ? GONE : cell)),
  );
  let rows = arrangement.rows?.slice();
  let columns = arrangement.columns?.slice();

  const rowRemovable = (r: number) =>
    template[r]!.includes(GONE) &&
    template[r]!.every(
      (cell, c) => cell === GONE || template[r - 1]?.[c] === cell || template[r + 1]?.[c] === cell,
    );
  const colRemovable = (c: number) =>
    template.some(row => row[c] === GONE) &&
    template.every(row => row[c] === GONE || row[c - 1] === row[c] || row[c + 1] === row[c]);

  for (let changed = true; changed;) {
    changed = false;
    const r = template.findIndex((_, i) => rowRemovable(i));
    if (r >= 0) {
      template = template.filter((_, i) => i !== r);
      rows = rows?.filter((_, i) => i !== r);
      changed = true;
      continue;
    }
    const c = (template[0] ?? []).findIndex((_, i) => colRemovable(i));
    if (c >= 0) {
      template = template.map(row => row.filter((_, i) => i !== c));
      columns = columns?.filter((_, i) => i !== c);
      changed = true;
    }
  }

  return {
    template: template
      .filter(row => row.length > 0)
      .map(row => row.map(cell => (cell === GONE ? "." : cell))),
    rows,
    columns,
    align: Object.fromEntries(
      Object.entries(arrangement.align ?? {}).filter(([a]) => !absent.includes(a)),
    ),
  };
}

function subsets<T>(items: Array<T>): Array<Array<T>> {
  return items.reduce<Array<Array<T>>>((acc, item) => acc.flatMap(s => [s, [...s, item]]), [[]]);
}

/**
 * Derived model: for each authored layout, every combination of the *optional* areas it doesn't
 * already mention gets its own rule, with absent areas collapsed out of the arrangement.
 * You author the "everything present" picture; the library works out the rest.
 */
export function derivedRules(optional: Array<string>, layouts: Array<LayoutDef>): Array<Rule> {
  return layouts.flatMap(layout => {
    const mentioned = [...(layout.when ?? []), ...(layout.unless ?? [])];
    const used = new Set(arrangementsOf(layout).flatMap(([, a]) => a.template.flat()));
    const free = optional.filter(a => used.has(a) && !mentioned.includes(a));
    return subsets(free).flatMap(present => {
      const absent = free.filter(a => !present.includes(a));
      const alsoAbsent = [...absent, ...(layout.unless ?? [])];
      return arrangementsOf(layout).map(([at, arrangement]) => ({
        when: [...(layout.when ?? []), ...present],
        unless: [...(layout.unless ?? []), ...absent],
        at,
        arrangement: collapse(arrangement, alsoAbsent),
      }));
    });
  });
}

/** `"icon cardTag / information information"` or a multi-line string → Template. */
export function parseTemplate(source: string): Template {
  return source
    .split(/\n|\//)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/\s+/));
}

/** `"min-content minmax(0, 1fr)"` → tracks, without splitting inside parentheses. */
export function parseTracks(source: string | undefined): Array<string> | undefined {
  return source?.trim().split(/\s+(?![^(]*\))/);
}
