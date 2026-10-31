import { Slot } from "@radix-ui/react-slot";
import { ComponentPropsWithRef, ReactNode, useCallback, useEffect, useRef } from "react";
import { gridId } from "../engine/gridId";
import { generateCss, hasBreakpoints, sizeContainerName } from "../generateCss";
import { isDevelopment } from "../isDevelopment";
import { GridConfig } from "../types";
import { slotWarnings } from "./slotWarnings";

/**
 * Props of a slot component (`<Card.icon>`) and of a grid's root component
 * (`<Card>`): anything a `div` takes, plus `asChild`.
 */
export type SlotComponentProps = ComponentPropsWithRef<"div"> & {
  /**
   * Render your own single child element as the slot (or grid) instead of a
   * `div`, with these props merged onto it (Radix `Slot`).
   */
  asChild?: boolean;
};

/** The props of a grid's root component (`<Card>`). */
export type GridComponentProps = SlotComponentProps;

/** A slot component (`<Card.icon>`): renders the element that fills one area. */
export type SlotComponent = (props: SlotComponentProps) => ReactNode;

/**
 * The component a definition renders as: the grid itself, with a static slot
 * component per area, named exactly like the area. An area nested through
 * `nest` is the root component of the nested grid instead, with that grid's
 * slots as its statics (`<Card.content.icon>`).
 */
export type GridComponent<TAreaName extends string, TNest = {}> = ((
  props: GridComponentProps,
) => ReactNode) & {
  readonly [K in TAreaName]: K extends keyof TNest ? TNest[K] : SlotComponent;
};

/** Any grid component, whatever its areas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGridComponent = GridComponent<any, any>;

/** Options of `createGridComponent`. */
export type GridComponentOptions<TAreaName extends string> = {
  /**
   * Grids nested into areas of this one: `nest: { content: ContentGrid }`
   * makes `<Card.content>` both the `content` slot and the root of
   * `ContentGrid`.
   */
  nest?: { readonly [K in TAreaName]?: AnyGridComponent };
};

type RootProps = GridComponentProps & {
  /** The area of an outer grid this grid fills, when it is nested. */
  "data-area"?: string;
};

function createRoot(config: GridConfig<string>) {
  const id = gridId(config);
  const css = generateCss(config);
  const sizeContainer = hasBreakpoints(config)
    ? ({ containerType: "inline-size", containerName: sizeContainerName(id) } as const)
    : undefined;

  return function Root({ asChild = false, style, ref, "data-area": area, ...props }: RootProps) {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const composedRef = useCallback(
      (node: HTMLDivElement | null) => {
        gridRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    // In development, check the slots after every commit, warning once per
    // distinct set of problems rather than on every render.
    const lastWarnings = useRef("");
    useEffect(() => {
      if (!isDevelopment() || gridRef.current === null) {
        return;
      }
      const warnings = slotWarnings(gridRef.current, config);
      const key = warnings.join("\n");
      if (key !== lastWarnings.current) {
        lastWarnings.current = key;
        for (const warning of warnings) {
          // eslint-disable-next-line no-console
          console.warn(`typed-grid-areas: ${warning}`);
        }
      }
    });

    const Comp = asChild ? Slot : "div";
    const grid = (
      <Comp
        {...props}
        ref={composedRef}
        data-area={sizeContainer === undefined ? area : undefined}
        data-grid-id={id}
        style={{ display: "grid", ...style }}
      />
    );

    return (
      <>
        {/* React 19 hoists this into <head> and emits each href once. */}
        <style href={`typed-grid-areas-${id}`} precedence="typed-grid-areas">
          {css}
        </style>
        {sizeContainer === undefined ? (
          grid
        ) : (
          // A grid with breakpoints sits inside its own size container, which
          // is then the outermost element: an outer grid's area goes there.
          <div
            data-area={area}
            style={{
              ...sizeContainer,
              // Lets the grid fill the wrapper in both axes, as it would its cell.
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
          >
            {grid}
          </div>
        )}
      </>
    );
  };
}

function createSlotComponent(area: string): SlotComponent {
  function SlotComponent({ asChild = false, ...props }: SlotComponentProps) {
    const Comp = asChild ? Slot : "div";
    return <Comp {...props} data-area={area} />;
  }
  SlotComponent.displayName = area;
  return SlotComponent;
}

/** The statics (one per area) a grid component carries. */
const STATICS = Symbol("typed-grid-areas statics");

type WithStatics = { [STATICS]?: Record<string, unknown> };

/**
 * Defines `statics` on a component. `defineProperty`, because an area may be
 * named like a function's own read-only properties (`name`, `length`).
 */
function withStatics<TComponent extends object>(
  component: TComponent,
  statics: Record<string, unknown>,
): TComponent {
  for (const [key, value] of Object.entries(statics)) {
    Object.defineProperty(component, key, { value, enumerable: true, configurable: true });
  }
  Object.defineProperty(component, STATICS, { value: statics });
  return component;
}

/**
 * Turns a definition into the component it renders as.
 *
 * `<Card>` renders the grid (inside its own size container when the
 * definition has breakpoints) and emits the definition's CSS; `<Card.icon>`
 * renders the slot that fills the `icon` area. Slots accept `className`,
 * `style`, `children`, regular element props, and `asChild` to make your own
 * element the slot.
 *
 * Create grid components at module level, once per definition.
 *
 * @example
 * ```tsx
 * const Card = createGridComponent(
 *   defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
 *   { nest: { content: ContentGrid } },
 * );
 *
 * <Card>
 *   <Card.input asChild><label>…</label></Card.input>
 *   <Card.content>
 *     <Card.content.icon>…</Card.content.icon>
 *   </Card.content>
 * </Card>
 * ```
 */
export function createGridComponent<
  TAreaName extends string,
  const TNest extends GridComponentOptions<TAreaName>["nest"] = {},
>(config: GridConfig<TAreaName>, options: { nest?: TNest } = {}): GridComponent<TAreaName, TNest> {
  const statics: Record<string, unknown> = {};
  for (const area of config.areas) {
    const nested = options.nest?.[area] as (AnyGridComponent & WithStatics) | undefined;
    if (nested === undefined) {
      statics[area] = createSlotComponent(area);
      continue;
    }
    const NestedRoot = (props: GridComponentProps) => {
      const Nested = nested;
      return <Nested {...props} data-area={area} />;
    };
    statics[area] = withStatics(NestedRoot, nested[STATICS] ?? {});
  }

  return withStatics(createRoot(config), statics) as unknown as GridComponent<TAreaName, TNest>;
}
