import { GridLayout } from "../types";

/**
 * Where an area sits in a layout, as 1-based grid lines (end lines exclusive).
 */
export type Placement = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};

/**
 * Works out each area's placement from a layout's cells: the bounding
 * rectangle of every cell that names it. Areas the cells don't name are
 * absent from the result, which is how a layout hides them.
 */
export function placeAreas(cells: GridLayout<string>): Map<string, Placement> {
  const placements = new Map<string, Placement>();

  cells.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell === ".") {
        return;
      }
      const existing = placements.get(cell);
      if (existing === undefined) {
        placements.set(cell, {
          rowStart: rowIndex + 1,
          rowEnd: rowIndex + 2,
          columnStart: columnIndex + 1,
          columnEnd: columnIndex + 2,
        });
        return;
      }
      existing.rowStart = Math.min(existing.rowStart, rowIndex + 1);
      existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
      existing.columnStart = Math.min(existing.columnStart, columnIndex + 1);
      existing.columnEnd = Math.max(existing.columnEnd, columnIndex + 2);
    });
  });

  return placements;
}
