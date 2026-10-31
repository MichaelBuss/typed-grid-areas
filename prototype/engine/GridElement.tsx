// PROTOTYPE (issue #4) — throwaway. Renders one compiled grid (shared by all variants).
import { CSSProperties, ElementType, ReactNode } from "react";
import { CompiledGrid, containerName } from "./core";

export type GridElementProps = {
  grid: CompiledGrid;
  /** Set when this grid is itself a slot of a parent grid. */
  area?: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * The component owns the container (Q4): a grid with breakpoints gets a wrapper element that is
 * the size container, so breakpoints measure the space the grid is given — never an ancestor
 * someone has to remember to mark. When nested, the parent's area props land on the outermost
 * element. CSS is per definition (not per instance) and React 19 dedupes it by `href`.
 */
export function GridElement({
  grid,
  area,
  as: Tag = "div",
  className,
  style,
  children,
}: GridElementProps) {
  const areaProps = area ? { "data-area": area } : {};
  const areaStyle: CSSProperties = area ? { gridArea: area } : {};
  const css = (
    <style href={`tga-${grid.id}`} precedence="typed-grid-areas">
      {grid.css}
    </style>
  );

  if (!grid.hasBreakpoints) {
    return (
      <>
        {css}
        <Tag
          {...areaProps}
          className={className}
          data-grid={grid.id}
          style={{ display: "grid", ...areaStyle, ...style }}
        >
          {children}
        </Tag>
      </>
    );
  }

  return (
    <>
      {css}
      <div
        {...areaProps}
        data-grid-container={grid.id}
        style={{
          ...areaStyle,
          containerType: "inline-size",
          containerName: containerName(grid.id),
          minWidth: 0,
        }}
      >
        <Tag className={className} data-grid={grid.id} style={{ display: "grid", ...style }}>
          {children}
        </Tag>
      </div>
    </>
  );
}
