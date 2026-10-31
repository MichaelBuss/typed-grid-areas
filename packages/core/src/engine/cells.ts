/**
 * One template cell, split into the area that owns it and the layers drawn
 * over it: `"photo+badge"` is owned by `photo`, with `badge` layered on top.
 * The base may be `"."` (an empty cell), and a cell may have no layers.
 */
export type ParsedCell = {
  base: string;
  layers: Array<string>;
};

export function parseCell(cell: string): ParsedCell {
  const [base = ".", ...layers] = cell.split("+");
  return { base, layers };
}

/**
 * Writes a cell back as a template cell string.
 */
export function formatCell({ base, layers }: ParsedCell): string {
  return [base, ...layers].join("+");
}

/**
 * Every area a cell names, as its base or as a layer. `"."` names none.
 */
export function cellAreas(cell: string): Array<string> {
  const { base, layers } = parseCell(cell);
  return base === "." ? layers : [base, ...layers];
}
