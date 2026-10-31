import { Slot } from "@radix-ui/react-slot";
import { CSSProperties, ReactNode, Ref, useMemo } from "react";
import { validateGridSlots } from "../validateGridSlots";
import { GridAreasResult, SlotProps } from "../types";

/**
 * Minimal set of DOM element props this component needs to accept and forward.
 *
 * Kept as one local interface rather than the separate `CommonProps` /
 * `Refable` / `Styleable` types this was split into upstream, since
 * `GridAreas` is the only consumer here. The `TElement` generic is the one
 * thing worth keeping from `Refable`, since `asChild` can forward the ref to
 * a non-`div` element.
 */
interface GridAreasElementProps<TElement extends Element = HTMLElement> {
  /** Additional CSS classes to apply to the grid container */
  className?: string;
  /** A id that can be used in tests to get the component */
  "data-testid"?: string;
  /**
   * The area this grid fills when it is a nested grid, i.e. spread
   * `{...slots.name}` of the outer grid onto it. Goes on the outermost element
   * (the size container, if there is one).
   */
  "data-area"?: string;
  /** Inline styles, merged onto the container's own grid styles */
  style?: CSSProperties;
  /** Ref forwarded to the root DOM element */
  ref?: Ref<TElement>;
}

/**
 * Props for the GridAreas component.
 *
 * Spread the result from useGridAreas() onto this component.
 */
export type GridAreasProps<
  TAreaName extends string,
  TElement extends Element = HTMLElement,
> = GridAreasResult<TAreaName> &
  GridAreasElementProps<TElement> & {
    /** Render prop that receives the slots object */
    children: (slots: Record<TAreaName, SlotProps>) => ReactNode;
    /**
     * If true, renders as the child element instead of a div.
     * The render prop must then return a single element for Radix's `Slot`
     * to clone the container props (ref, className, style, ...) onto.
     */
    asChild?: boolean;
  };

/**
 * Component for CSS grid with dynamic grid-template-areas.
 *
 * Renders the style tag and container div with proper scoping.
 * Uses a render prop pattern to provide typed slot props for children.
 *
 * In development, validates that the rendered children are actually wired up
 * to a slot (via a ref callback that runs once the container mounts) and
 * warns on the console otherwise.
 *
 * @example Basic usage with a definition and the hook
 * ```tsx
 * // Define the grid at module level (runs once)
 * const cardGrid = defineLayout({
 *   areas: ['icon', 'info'],
 *   layouts: [{ template: 'icon info' }],
 * });
 *
 * function MyCard() {
 *   const gridAreas = useGridAreas(cardGrid);
 *
 *   return (
 *     <GridAreas {...gridAreas} className="gap-4">
 *       {(slots) => (
 *         <>
 *           <Icon {...slots.icon} />
 *           <Info {...slots.info} />
 *         </>
 *       )}
 *     </GridAreas>
 *   );
 * }
 * ```
 * @example Conditional layouts
 * ```tsx
 * const cardGrid = defineLayout({
 *   areas: ['icon?', 'info', 'tag?'],
 *   layouts: [
 *     { template: 'info' },
 *     { when: ['icon'], template: 'icon info', columns: '48px 1fr' },
 *   ],
 * });
 *
 * function MyCard({ showIcon }) {
 *   const gridAreas = useGridAreas(cardGrid);
 *
 *   return (
 *     <GridAreas {...gridAreas}>
 *       {(slots) => (
 *         <>
 *           {showIcon && <Icon {...slots.icon} />}
 *           <Info {...slots.info} />
 *         </>
 *       )}
 *     </GridAreas>
 *   );
 * }
 * ```
 * @example Using asChild to render a custom element
 *
 * `Slot` clones the container props onto whatever single element the render
 * prop returns, so the element goes *inside* the render prop, not around it.
 * ```tsx
 * function MyCard() {
 *   const gridAreas = useGridAreas(cardGrid);
 *
 *   return (
 *     <GridAreas {...gridAreas} asChild className="gap-4">
 *       {(slots) => (
 *         <section aria-label="Card content">
 *           <Icon {...slots.icon} />
 *           <Info {...slots.info} />
 *         </section>
 *       )}
 *     </GridAreas>
 *   );
 * }
 * ```
 */
export function GridAreas<TAreaName extends string, TElement extends Element = HTMLElement>({
  slots,
  css,
  containerProps,
  sizeContainerProps,
  className,
  "data-testid": dataTestId,
  "data-area": dataArea,
  ref,
  style,
  children,
  asChild = false,
}: GridAreasProps<TAreaName, TElement>): ReactNode {
  const Comp = asChild ? Slot : "div";
  // Slot keys double as the area names; cheaper than threading the raw config down.
  const areas = useMemo(() => Object.keys(slots), [slots]);

  // `Comp` is a union of "div" and Slot, so JSX resolves its `ref` prop against
  // the stricter (HTMLDivElement) branch. The callback itself is written
  // against the real, generic `TElement`; this local is just a typed escape
  // hatch for handing it to the polymorphic `Comp`.
  const containerRef: Ref<HTMLDivElement> = node => {
    const element = node as TElement | null;
    if (process.env.NODE_ENV === "development" && element instanceof HTMLElement) {
      const warnings = validateGridSlots(element, areas);
      for (const warning of warnings) {
        // eslint-disable-next-line no-console
        console.warn(`GridAreas: ${warning}`);
      }
    }
    if (typeof ref === "function") {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  };

  if (sizeContainerProps === undefined) {
    return (
      <>
        <style>{css}</style>
        <Comp
          {...containerProps}
          className={className}
          data-area={dataArea}
          data-testid={dataTestId}
          ref={containerRef}
          style={{ display: "grid", ...style }}
        >
          {children(slots)}
        </Comp>
      </>
    );
  }

  // A grid with breakpoints sits inside its own size container, which is then
  // the outermost element: the area it fills in an outer grid goes there.
  const { gridArea, ...gridStyle } = style ?? {};
  return (
    <>
      <style>{css}</style>
      <div
        data-area={dataArea}
        style={{
          ...sizeContainerProps.style,
          gridArea,
          // Lets the grid fill the wrapper in both axes, as it would its cell.
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <Comp
          {...containerProps}
          className={className}
          data-testid={dataTestId}
          ref={containerRef}
          style={{ display: "grid", ...gridStyle }}
        >
          {children(slots)}
        </Comp>
      </div>
    </>
  );
}
