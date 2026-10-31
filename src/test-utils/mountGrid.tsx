import { ReactNode } from "react";
import { render } from "vitest-browser-react";
import { createGridComponent, GridComponentProps, SlotComponent } from "../react/gridComponent";
import { GridConfig } from "../types";

interface MountGridOptions<TAreaName extends string> {
  /** Width in px of the wrapper the grid is rendered into. */
  width: number;
  /** The slots to render; every other area is left absent. */
  present: ReadonlyArray<TAreaName>;
  /** Consumer classes to put on individual slots. */
  slotClassNames?: Partial<Record<TAreaName, string>>;
  /** Content to render inside individual slots (slots are empty otherwise). */
  slotContent?: Partial<Record<TAreaName, ReactNode>>;
  /**
   * If set, the wrapper sits inside an unrelated size container
   * (`container-type: inline-size`) of this width in px.
   */
  ancestorContainerWidth?: number;
}

interface MountedGrid<TAreaName extends string> {
  /** The grid container's computed `grid-template-areas`. */
  templateAreas: () => string;
  /** A slot's bounding rect, relative to the grid container's top-left corner. */
  rect: (area: TAreaName) => { x: number; y: number; width: number; height: number };
  /** A rendered slot's DOM element. */
  slot: (area: TAreaName) => HTMLElement;
}

/**
 * Mounts a grid config into a real browser at a given container width, as
 * its grid component with only the given slots rendered, and exposes where
 * the browser actually laid everything out.
 */
export async function mountGrid<TAreaName extends string>(
  config: GridConfig<TAreaName>,
  {
    width,
    present,
    slotClassNames,
    slotContent,
    ancestorContainerWidth,
  }: MountGridOptions<TAreaName>,
): Promise<MountedGrid<TAreaName>> {
  const Grid = createGridComponent(config);
  // The root on its own: JSX can't resolve props on a component whose
  // statics are mapped over a still-generic area type.
  const Root: (props: GridComponentProps) => ReactNode = Grid;
  const sized = (
    <div style={{ width }}>
      <Root data-testid="grid">
        {present.map(area => {
          const Slot: SlotComponent = Grid[area];
          return (
            <Slot key={area} className={slotClassNames?.[area]} style={{ minHeight: 10 }}>
              {slotContent?.[area]}
            </Slot>
          );
        })}
      </Root>
    </div>
  );

  const { container } = await render(
    ancestorContainerWidth === undefined ? (
      sized
    ) : (
      <div style={{ width: ancestorContainerWidth, containerType: "inline-size" }}>{sized}</div>
    ),
  );

  const grid = container.querySelector<HTMLElement>("[data-testid=grid]");
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
