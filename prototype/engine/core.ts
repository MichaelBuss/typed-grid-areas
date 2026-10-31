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

/** A cell may stack areas: `photo+badge` = `photo` owns the cell, `badge` is layered over it. */
const stackOf = (cell: string) => cell.split("+");
const baseOf = (cell: string) => stackOf(cell)[0]!;

function templateToCss(template: Template): string {
  return template.length === 0
    ? "none"
    : template.map(row => `"${row.map(baseOf).join(" ")}"`).join(" ");
}

/** Where an area goes: its name if it owns cells, explicit lines if it's only layered on top. */
function placement(template: Template, area: string): { gridArea: string; over: string } {
  if (template.some(row => row.some(cell => baseOf(cell) === area))) {
    return { gridArea: area, over: "none" };
  }
  const hits = template.flatMap((row, r) =>
    row.flatMap((cell, c) => (stackOf(cell).slice(1).includes(area) ? [{ r, c, cell }] : [])),
  );
  if (hits.length === 0) return { gridArea: "auto", over: "none" };
  const r1 = Math.min(...hits.map(h => h.r)) + 1;
  const c1 = Math.min(...hits.map(h => h.c)) + 1;
  const r2 = Math.max(...hits.map(h => h.r)) + 2;
  const c2 = Math.max(...hits.map(h => h.c)) + 2;
  return { gridArea: `${r1} / ${c1} / ${r2} / ${c2}`, over: baseOf(hits[0]!.cell) };
}

/**
 * Every rule is self-contained (tracks, placement and alignment for every area are always set)
 * and wrapped in `:where()` so all rules share one specificity: source order alone decides, i.e.
 * later wins. Everything sits in a cascade layer so a consumer's own unlayered classes win.
 * Layered areas get `--tga-over: <area below>` so slot content can restyle itself with a
 * container style query while it sits on top of something (e.g. white text over a photo).
 */
export function compile(id: string, areas: Array<string>, rules: Array<Rule>): CompiledGrid {
  const root = `[data-grid="${id}"]`;
  const blocks = rules.map(rule => {
    const condition = conditionSelector(rule);
    const self = condition ? `${root}:where(${condition})` : root;
    const { template, rows, columns, align = {} } = rule.arrangement;
    const lines = [
      `${self} { grid-template-areas: ${templateToCss(template)}; grid-template-rows: ${rows?.join(" ") ?? "none"}; grid-template-columns: ${columns?.join(" ") ?? "none"}; }`,
      ...areas.map(a => {
        const { gridArea, over } = placement(template, a);
        return `${self} > ${areaSelector(a)} { grid-area: ${gridArea}; z-index: ${over === "none" ? "auto" : 1}; --tga-over: ${over}; justify-self: ${align[a]?.justify ?? "auto"}; align-self: ${align[a]?.align ?? "auto"}; }`;
      }),
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

/**
 * Remove absent areas from an arrangement:
 * 1. Absent areas leave their cells (a layered area just disappears from the stack).
 * 2. A row/column is dropped when it lost something and everything else in it is either also
 *    gone or an area that continues into a neighbouring track (a span that gets one shorter).
 * 3. Cells still left empty are absorbed by a neighbouring area (left, right, up, down) if it
 *    stays rectangular; otherwise they become ".". Authored "." cells are kept as written.
 */
export function collapse(arrangement: Arrangement, absent: Array<string>): Arrangement {
  type Cell = Array<string> | null; // null = emptied by an absent area
  let grid: Array<Array<Cell>> = arrangement.template.map(row =>
    row.map(cell => {
      const stack = stackOf(cell);
      const kept = stack.filter(a => !absent.includes(a));
      return kept.length === 0 ? null : kept[0] === stack[0] ? kept : ["."]; // base gone → "."-ish
    }),
  );
  // A cell whose *base* was absent but had layers on top keeps the layers over an empty cell.
  grid = grid.map((row, r) =>
    row.map((cell, c) => {
      const stack = stackOf(arrangement.template[r]![c]!);
      if (cell && cell[0] === "." && stack[0] !== ".") {
        const layers = stack.slice(1).filter(a => !absent.includes(a));
        return layers.length ? [".", ...layers] : null;
      }
      return cell;
    }),
  );
  let rows = arrangement.rows?.slice();
  let columns = arrangement.columns?.slice();

  const continued = (cell: Cell, other: Cell | undefined) =>
    cell !== null && other != null && cell[0] !== "." && cell.every(a => other.includes(a));
  const rowRemovable = (r: number) =>
    grid[r]!.includes(null) &&
    grid[r]!.every(
      (cell, c) =>
        cell === null || continued(cell, grid[r - 1]?.[c]) || continued(cell, grid[r + 1]?.[c]),
    );
  const colRemovable = (c: number) =>
    grid.some(row => row[c] === null) &&
    grid.every(
      row => row[c] === null || continued(row[c]!, row[c - 1]) || continued(row[c]!, row[c + 1]),
    );

  for (let changed = true; changed;) {
    changed = false;
    const r = grid.findIndex((_, i) => rowRemovable(i));
    if (r >= 0) {
      grid = grid.filter((_, i) => i !== r);
      rows = rows?.filter((_, i) => i !== r);
      changed = true;
      continue;
    }
    const c = (grid[0] ?? []).findIndex((_, i) => colRemovable(i));
    if (c >= 0) {
      grid = grid.map(row => row.filter((_, i) => i !== c));
      columns = columns?.filter((_, i) => i !== c);
      changed = true;
    }
  }

  const isRectangle = (area: string, extra: [number, number]) => {
    const cells = grid.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell?.[0] === area ? [[r, c]] : [])),
    );
    cells.push(extra);
    const rs = cells.map(([r]) => r!),
      cs = cells.map(([, c]) => c!);
    const h = Math.max(...rs) - Math.min(...rs) + 1,
      w = Math.max(...cs) - Math.min(...cs) + 1;
    return h * w === cells.length;
  };
  for (let changed = true; changed;) {
    changed = false;
    grid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== null || changed) return;
        for (const [nr, nc] of [
          [r, c - 1],
          [r, c + 1],
          [r - 1, c],
          [r + 1, c],
        ] as const) {
          const area = grid[nr]?.[nc]?.[0];
          if (area && area !== "." && isRectangle(area, [r, c])) {
            row[c] = [area];
            changed = true;
            return;
          }
        }
      }),
    );
  }

  return {
    template: grid
      .filter(row => row.length > 0)
      .map(row => row.map(cell => (cell ?? ["."]).join("+"))),
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
    const used = new Set(
      arrangementsOf(layout).flatMap(([, a]) => a.template.flat().flatMap(stackOf)),
    );
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
