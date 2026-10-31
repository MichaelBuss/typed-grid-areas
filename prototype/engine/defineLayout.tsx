// PROTOTYPE (issue #4) — throwaway. A different front end over the same engine:
// one definition object, "?" marks optional areas, string templates, derived layouts for
// optional areas, and slot *components* (<Card.icon>) instead of hook + render prop + spreads.
// Types are only as strict as was cheap; parsing templates at the type level is a later question.
import { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";
import {
  AreaAlign,
  Arrangement,
  Breakpoint,
  CompiledGrid,
  compile,
  derivedRules,
  parseTemplate,
  parseTracks,
} from "./core";
import { GridElement } from "./GridElement";

type Name<A extends string> = A extends `${infer N}?` ? N : A;

type ArrangementInput = {
  template: string;
  rows?: string;
  columns?: string;
  align?: Record<string, AreaAlign>;
  /** `{ badge: "photo" }`: badge is layered over every cell photo owns. Sugar for `photo+badge`. */
  layers?: Record<string, string>;
};
type LayoutInput = ArrangementInput & {
  when?: Array<string>;
  unless?: Array<string>;
  breakpoints?: Partial<Record<Breakpoint, ArrangementInput>>;
};

type BoxProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children">;
type SlotComponent = (props: BoxProps) => ReactNode;
type RootComponent = (props: BoxProps & { area?: string }) => ReactNode;

export type LayoutComponent<A extends string, N = unknown> = RootComponent & {
  [K in Exclude<A, keyof N>]: SlotComponent;
} & { [K in keyof N]-?: NonNullable<N[K]> };

let counter = 0;

const toArrangement = (input: ArrangementInput): Arrangement => ({
  template: parseTemplate(input.template).map(row =>
    row.map(cell =>
      Object.entries(input.layers ?? {}).reduce(
        (acc, [layer, host]) => (acc.split("+")[0] === host ? `${acc}+${layer}` : acc),
        cell,
      ),
    ),
  ),
  rows: parseTracks(input.rows),
  columns: parseTracks(input.columns),
  align: input.align,
});

export function defineLayout<
  const A extends string,
  const N extends { [K in Name<A>]?: RootComponent } = {},
>(def: {
  name?: string;
  areas: ReadonlyArray<A>;
  layouts: Array<LayoutInput>;
  nest?: N;
}): LayoutComponent<Name<A>, N> {
  const names = def.areas.map(a => a.replace(/\?$/, ""));
  const optional = def.areas.filter(a => a.endsWith("?")).map(a => a.slice(0, -1));
  const grid = compile(
    def.name ?? `d${++counter}`,
    names,
    derivedRules(
      optional,
      def.layouts.map(({ when, unless, breakpoints, ...base }) => ({
        ...toArrangement(base),
        when,
        unless,
        breakpoints: breakpoints
          ? Object.fromEntries(
              Object.entries(breakpoints).map(([bp, a]) => [bp, toArrangement(a!)]),
            )
          : undefined,
      })),
    ),
  );

  const Root: RootComponent = ({ area, as, className, style, children }) => (
    <GridElement area={area} as={as} className={className} grid={grid} style={style}>
      {children}
    </GridElement>
  );

  const statics = Object.fromEntries(
    names.map(name => {
      const nested = (def.nest as Record<string, RootComponent> | undefined)?.[name];
      if (nested) {
        const AsSlot: RootComponent = props => nested({ ...props, area: name });
        return [name, Object.assign(AsSlot, nested)];
      }
      // Placement lives in the generated CSS (an area can be layered in one layout and own cells in
      // another), so slots carry no inline grid-area.
      const Slot: SlotComponent = ({ as: Tag = "div", ...rest }) => (
        <Tag {...rest} data-area={name} />
      );
      return [name, Slot];
    }),
  );

  // Non-enumerable so it isn't copied onto a parent's slot; the prototype page reads it for stats.
  Object.defineProperty(Root, "grids", {
    value: [
      grid,
      ...Object.values(def.nest ?? {}).flatMap(n => (n as { grids: Array<CompiledGrid> }).grids),
    ],
  });
  return Object.assign(Root, statics) as LayoutComponent<Name<A>, N>;
}
