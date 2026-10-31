import { AreaAlignments, GridLayout, TrackSize } from "../types";
import { cellAreas, formatCell, parseCell } from "./cells";
import type { Arrangement, Rule } from "./rules";

/**
 * Where an absent area owned a cell, until the cell is dropped or filled.
 */
type Hole = { removed: string };

/**
 * One cell while deriving: the area that owns it (`"."` when empty, a hole
 * when its area is absent) and the layers drawn over it. An absent layer
 * just leaves the list; it never makes a hole.
 */
type Cell = { base: string | Hole; layers: ReadonlyArray<string> };

type Grid = Array<Array<Cell>>;

function isHole(base: string | Hole | undefined): base is Hole {
  return typeof base === "object";
}

function isHoleCell(cell: Cell): boolean {
  return isHole(cell.base);
}

function transpose(grid: Grid): Grid {
  return (grid[0] ?? []).map((_, column) => grid.map(row => row[column] as Cell));
}

/**
 * Whether a row can be dropped: it held a removed area, and every other cell
 * in it is also removed or an area that continues into a neighbouring row.
 * Every layer in the row must continue into a neighbouring row too, so a
 * present layer never loses its cells. `"."` cells are never dropped.
 */
function isDroppableRow(grid: Grid, rowIndex: number): boolean {
  const row = grid[rowIndex] ?? [];
  return (
    row.some(isHoleCell) &&
    row.every((cell, column) => {
      const neighbours = [grid[rowIndex - 1]?.[column], grid[rowIndex + 1]?.[column]];
      const baseContinues =
        isHole(cell.base) ||
        (cell.base !== "." && neighbours.some(neighbour => neighbour?.base === cell.base));
      return (
        baseContinues &&
        cell.layers.every(layer => neighbours.some(neighbour => neighbour?.layers.includes(layer)))
      );
    })
  );
}

/**
 * The next row to drop, if any. Rows that held nothing but removed areas go
 * first; a row that only shortens a spanning area goes after them.
 */
function nextRowToDrop(grid: Grid): number | undefined {
  if (grid.length <= 1) {
    return undefined;
  }
  const droppable = grid.map((_, index) => index).filter(index => isDroppableRow(grid, index));
  return droppable.find(index => grid[index]?.every(isHoleCell)) ?? droppable[0];
}

function withoutIndex<T>(items: ReadonlyArray<T> | undefined, index: number): Array<T> | undefined {
  return items?.filter((_, itemIndex) => itemIndex !== index);
}

/**
 * Drops rows and columns that only held removed areas (or shorten an area
 * that spans past them), together with their track sizes.
 */
function dropEmptiedTracks(
  grid: Grid,
  rows: ReadonlyArray<TrackSize> | undefined,
  columns: ReadonlyArray<TrackSize> | undefined,
): { grid: Grid; rows?: Array<TrackSize>; columns?: Array<TrackSize> } {
  let current = grid;
  let currentRows = rows === undefined ? undefined : [...rows];
  let currentColumns = columns === undefined ? undefined : [...columns];

  for (;;) {
    const row = nextRowToDrop(current);
    const column = nextRowToDrop(transpose(current));
    const rowIsEmpty = row !== undefined && current[row]?.every(isHoleCell) === true;
    const columnIsEmpty =
      column !== undefined && current.every(cells => isHole(cells[column]?.base));

    if (row !== undefined && (rowIsEmpty || !columnIsEmpty)) {
      current = current.filter((_, index) => index !== row);
      currentRows = withoutIndex(currentRows, row);
    } else if (column !== undefined) {
      current = current.map(cells => cells.filter((_, index) => index !== column));
      currentColumns = withoutIndex(currentColumns, column);
    } else {
      return { grid: current, rows: currentRows, columns: currentColumns };
    }
  }
}

/**
 * Whether every cell in the bounding rectangle of `area`'s cells is owned by
 * `area`.
 */
function isRectangle(grid: Grid, area: string): boolean {
  let top = Infinity;
  let bottom = -Infinity;
  let left = Infinity;
  let right = -Infinity;
  grid.forEach((row, rowIndex) =>
    row.forEach((cell, column) => {
      if (cell.base === area) {
        top = Math.min(top, rowIndex);
        bottom = Math.max(bottom, rowIndex);
        left = Math.min(left, column);
        right = Math.max(right, column);
      }
    }),
  );
  for (let rowIndex = top; rowIndex <= bottom; rowIndex++) {
    for (let column = left; column <= right; column++) {
      if (grid[rowIndex]?.[column]?.base !== area) {
        return false;
      }
    }
  }
  return true;
}

type Position = [row: number, column: number];

/** Left, then right, up, down. */
const NEIGHBOUR_OFFSETS: ReadonlyArray<Position> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/**
 * Lets a neighbouring area grow into a hole, trying left, right, up and down
 * in turn, if the area stays a rectangle. Layers over the hole stay where
 * they are. Returns whether it was filled.
 */
function fillHole(grid: Grid, hole: ReadonlyArray<Position>): boolean {
  const inHole = (row: number, column: number) =>
    hole.some(([holeRow, holeColumn]) => holeRow === row && holeColumn === column);
  const fillWith = (target: Grid, area: string) => {
    for (const [row, column] of hole) {
      const cells = target[row] as Array<Cell>;
      cells[column] = { ...(cells[column] as Cell), base: area };
    }
  };

  for (const [rowOffset, columnOffset] of NEIGHBOUR_OFFSETS) {
    const candidates = new Set<string>();
    for (const [row, column] of hole) {
      const neighbour = grid[row + rowOffset]?.[column + columnOffset]?.base;
      if (
        typeof neighbour === "string" &&
        neighbour !== "." &&
        !inHole(row + rowOffset, column + columnOffset)
      ) {
        candidates.add(neighbour);
      }
    }

    for (const candidate of candidates) {
      const filled = grid.map(cells => [...cells]);
      fillWith(filled, candidate);
      if (isRectangle(filled, candidate)) {
        fillWith(grid, candidate);
        return true;
      }
    }
  }
  return false;
}

/**
 * Fills the holes left after dropping tracks. Each removed area's remaining
 * cells are filled as a whole where a neighbour can take them all, otherwise
 * cell by cell. Holes no neighbour can take stay empty (`"."`).
 */
function fillHoles(grid: Grid): GridLayout<string> {
  const holesByArea = new Map<string, Array<Position>>();
  grid.forEach((row, rowIndex) =>
    row.forEach(({ base }, column) => {
      if (isHole(base)) {
        const positions = holesByArea.get(base.removed) ?? [];
        positions.push([rowIndex, column]);
        holesByArea.set(base.removed, positions);
      }
    }),
  );

  for (const hole of holesByArea.values()) {
    if (!fillHole(grid, hole)) {
      hole.forEach(position => fillHole(grid, [position]));
    }
  }

  return grid.map(row =>
    row.map(({ base, layers }) =>
      formatCell({ base: isHole(base) ? "." : base, layers: [...layers] }),
    ),
  );
}

/**
 * Derives the arrangement for when the `absent` areas aren't rendered: they
 * leave their cells, emptied rows and columns are dropped, and a neighbour
 * grows into any hole that remains. An absent layer just disappears from its
 * cells. Alignment for absent areas is dropped.
 */
export function deriveArrangement(
  arrangement: Arrangement,
  absent: ReadonlySet<string>,
): Arrangement {
  const grid: Grid = arrangement.cells.map(row =>
    row.map(cell => {
      const { base, layers } = parseCell(cell);
      return {
        base: absent.has(base) ? { removed: base } : base,
        layers: layers.filter(layer => !absent.has(layer)),
      };
    }),
  );
  const dropped = dropEmptiedTracks(grid, arrangement.rows, arrangement.columns);

  const align: AreaAlignments<string> = Object.fromEntries(
    Object.entries(arrangement.align ?? {}).filter(([area]) => !absent.has(area)),
  );

  return {
    cells: fillHoles(dropped.grid),
    rows: dropped.rows,
    columns: dropped.columns,
    align,
  };
}

/**
 * Every subset of `items` with at least one item, smallest first.
 */
function nonEmptySubsets<T>(items: ReadonlyArray<T>): Array<Array<T>> {
  const subsets: Array<Array<T>> = [[]];
  for (const item of items) {
    subsets.push(...subsets.map(subset => [...subset, item]));
  }
  return subsets.slice(1).sort((a, b) => a.length - b.length);
}

/**
 * A key that two arrangements share exactly when they lay a grid out the same.
 */
function arrangementKey({ cells, rows, columns, align }: Arrangement): string {
  const placed = new Set(cells.flat().flatMap(cellAreas));
  const relevantAlign = Object.entries(align ?? {})
    .filter(([area, value]) => placed.has(area) && value !== undefined)
    .map(([area, { justify, align: alignSelf } = {}]) => [area, justify ?? "", alignSelf ?? ""])
    .sort(([a = ""], [b = ""]) => a.localeCompare(b));
  return JSON.stringify([
    cells,
    rows?.length ? rows : [],
    columns?.length ? columns : [],
    relevantAlign,
  ]);
}

/**
 * Adds the derived layouts for one authored layout.
 *
 * `rules` are the authored layout's rules (its own arrangement, then its
 * breakpoint arrangements from narrowest to widest), all with the layout's
 * condition. Each combination of the optional areas the layout uses and its
 * condition doesn't mention gets the same rules again, derived, with the
 * absent areas added to `unless`.
 *
 * Combinations come fewest-absent first, so for any set of absent areas the
 * last matching rule is the one derived for exactly that set. A derived rule
 * that would lay the grid out exactly like the rule that already applies for
 * its combination and width isn't emitted.
 */
export function withDerivedRules(
  rules: ReadonlyArray<Rule>,
  optionalAreas: ReadonlyArray<string>,
): Array<Rule> {
  const first = rules[0];
  if (first === undefined) {
    return [];
  }
  const { when, unless } = first.condition;
  const used = new Set(rules.flatMap(rule => rule.arrangement.cells.flat().flatMap(cellAreas)));
  const varied = optionalAreas.filter(
    area => used.has(area) && !when.includes(area) && !unless.includes(area),
  );

  type Emitted = { absent: ReadonlySet<string>; level: number; key: string };
  const emitted: Array<Emitted> = rules.map((rule, level) => ({
    absent: new Set(),
    level,
    key: arrangementKey(rule.arrangement),
  }));
  const output = [...rules];

  for (const subset of nonEmptySubsets(varied)) {
    const absent = new Set(subset);
    rules.forEach((rule, level) => {
      const arrangement = deriveArrangement(rule.arrangement, absent);
      const key = arrangementKey(arrangement);
      const current = [...emitted]
        .reverse()
        .find(entry => entry.level <= level && [...entry.absent].every(area => absent.has(area)));
      if (current?.key === key) {
        return;
      }
      emitted.push({ absent, level, key });
      output.push({
        ...rule,
        condition: { when, unless: [...unless, ...subset] },
        arrangement,
      });
    });
  }

  return output;
}
