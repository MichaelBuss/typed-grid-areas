import { GridLayout } from "../types";
import { parseCell } from "./cells";

/**
 * Where an area sits in a layout, as 1-based grid lines (end lines exclusive).
 */
export type Placement = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  /**
   * Set when the area is a layer: the area that owns the top-left cell it is
   * drawn over, or `"."` when that cell is empty.
   */
  over?: string;
};

/**
 * Works out each area's placement from a layout's cells: the bounding
 * rectangle of every cell that names it, as its base or as a layer. Areas
 * the cells don't name are absent from the result, which is how a layout
 * hides them.
 */
export function placeAreas(cells: GridLayout<string>): Map<string, Placement> {
  const placements = new Map<string, Placement>();

  const cover = (area: string, rowIndex: number, columnIndex: number, over?: string) => {
    const existing = placements.get(area);
    if (existing === undefined) {
      placements.set(area, {
        rowStart: rowIndex + 1,
        rowEnd: rowIndex + 2,
        columnStart: columnIndex + 1,
        columnEnd: columnIndex + 2,
        ...(over === undefined ? {} : { over }),
      });
      return;
    }
    existing.rowStart = Math.min(existing.rowStart, rowIndex + 1);
    existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
    existing.columnStart = Math.min(existing.columnStart, columnIndex + 1);
    existing.columnEnd = Math.max(existing.columnEnd, columnIndex + 2);
  };

  cells.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const { base, layers } = parseCell(cell);
      if (base !== ".") {
        cover(base, rowIndex, columnIndex);
      }
      for (const layer of layers) {
        cover(layer, rowIndex, columnIndex, base);
      }
    });
  });

  return placements;
}
