// PROTOTYPE (issue #4) — throwaway. Today's builder + hook + render-prop API, with the round-1
// fixes applied (when/unless conditions, later layout wins, per-area alignment, owned container).
// Runtime only: the real builder's compile-time checks are assumed, not re-implemented.
import { CSSProperties, ReactNode } from "react";
import {
  AreaAlign,
  Arrangement,
  Breakpoint,
  CompiledGrid,
  compile,
  explicitRules,
  LayoutDef,
} from "./core";
import { GridElement } from "./GridElement";

type Cell<A extends string> = A | ".";
type BuilderArrangement<A extends string> = {
  layout: Array<Array<Cell<A>>>;
  rows?: Array<string>;
  columns?: Array<string>;
  align?: Partial<Record<A, AreaAlign>>;
};
type BuilderLayout<A extends string> = BuilderArrangement<A> & {
  when?: Array<A>;
  unless?: Array<A>;
  breakpoints?: Partial<Record<Breakpoint, BuilderArrangement<A>>>;
};

let counter = 0;

export function createGrid(name?: string) {
  return {
    areas<const A extends string>(areas: ReadonlyArray<A>) {
      const layouts: Array<LayoutDef> = [];
      const toDef = ({ layout, ...rest }: BuilderArrangement<A>) =>
        ({ template: layout, ...rest }) as Arrangement;
      const builder = {
        layout(config: BuilderLayout<A>) {
          const { breakpoints, ...base } = config;
          layouts.push({
            ...toDef(base),
            when: config.when,
            unless: config.unless,
            breakpoints: breakpoints
              ? Object.fromEntries(
                  Object.entries(breakpoints).map(([bp, a]) => [
                    bp,
                    toDef(a as BuilderArrangement<A>),
                  ]),
                )
              : undefined,
          });
          return builder;
        },
        build(): CompiledGrid & { __areas?: A } {
          return compile(name ?? `a${++counter}`, [...areas], explicitRules(layouts));
        },
      };
      return builder;
    },
  };
}

type AreasOf<G> = G extends { __areas?: infer A extends string } ? A : string;
export type SlotProps = { "data-area": string; style: { gridArea: string } };

export function useGridAreas<G extends CompiledGrid>(grid: G) {
  const slots = Object.fromEntries(
    grid.areas.map(a => [a, { "data-area": a, style: { gridArea: a } }]),
  ) as Record<AreasOf<G>, SlotProps>;
  return { grid, slots };
}

export function GridAreas<A extends string>({
  grid,
  slots,
  className,
  style,
  children,
  ...areaProps
}: {
  grid: CompiledGrid;
  slots: Record<A, SlotProps>;
  className?: string;
  style?: CSSProperties;
  children: (slots: Record<A, SlotProps>) => ReactNode;
  "data-area"?: string;
}) {
  return (
    <GridElement area={areaProps["data-area"]} className={className} grid={grid} style={style}>
      {children(slots)}
    </GridElement>
  );
}
