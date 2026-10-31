import { render } from "vitest-browser-react";
import { GridAreas } from "../react/GridAreas";
import { useGridAreas } from "../react/useGridAreas";
import { GridConfig } from "../types";

interface MountGridOptions<TAreaName extends string> {
  /** Width in px of the wrapper the grid is rendered into. */
  width: number;
  /** The slots to render; every other area is left absent. */
  present: ReadonlyArray<TAreaName>;
  /** Consumer classes to put on individual slots. */
  slotClassNames?: Partial<Record<TAreaName, string>>;
}

interface MountedGrid<TAreaName extends string> {
  /** The grid container's computed `grid-template-areas`. */
  templateAreas: () => string;
  /** A slot's bounding rect, relative to the grid container's top-left corner. */
  rect: (area: TAreaName) => { x: number; y: number; width: number; height: number };
  /** A rendered slot's DOM element. */
  slot: (area: TAreaName) => HTMLElement;
}

function GridHarness<TAreaName extends string>({
  config,
  present,
  slotClassNames,
}: {
  config: GridConfig<TAreaName>;
  present: ReadonlyArray<TAreaName>;
  slotClassNames?: Partial<Record<TAreaName, string>>;
}) {
  const gridAreas = useGridAreas(config);

  return (
    <GridAreas {...gridAreas} data-testid="grid">
      {slots => (
        <>
          {present.map(area => (
            <div
              key={area}
              {...slots[area]}
              className={slotClassNames?.[area]}
              style={{ minHeight: 10 }}
            />
          ))}
        </>
      )}
    </GridAreas>
  );
}

/**
 * Mounts a grid config into a real browser at a given container width, with
 * only the given slots rendered, and exposes where the browser actually laid
 * everything out.
 */
export async function mountGrid<TAreaName extends string>(
  config: GridConfig<TAreaName>,
  { width, present, slotClassNames }: MountGridOptions<TAreaName>,
): Promise<MountedGrid<TAreaName>> {
  await render(
    <div style={{ width }}>
      <GridHarness config={config} present={present} slotClassNames={slotClassNames} />
    </div>,
  );

  const grid = document.querySelector<HTMLElement>("[data-testid=grid]");
  if (grid === null) {
    throw new Error("mountGrid: grid container was not rendered");
  }

  const slot = (area: TAreaName): HTMLElement => {
    const element = grid.querySelector<HTMLElement>(`:scope > [data-area=${area}]`);
    if (element === null) {
      throw new Error(`mountGrid: slot "${area}" was not rendered`);
    }
    return element;
  };

  return {
    templateAreas: () => getComputedStyle(grid).gridTemplateAreas,
    rect: area => {
      const gridRect = grid.getBoundingClientRect();
      const { x, y, width, height } = slot(area).getBoundingClientRect();
      return { x: x - gridRect.x, y: y - gridRect.y, width, height };
    },
    slot,
  };
}
