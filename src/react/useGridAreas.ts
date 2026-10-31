import { useMemo } from "react";
import { gridId } from "../engine/gridId";
import { createSlots, generateCss, hasBreakpoints, sizeContainerName } from "../generateCss";
import { GridAreasResult, GridConfig } from "../types";

/**
 * React hook for creating type-safe CSS grid-template-areas with automatic :has() selector generation.
 *
 * The CSS and its scoping id depend only on the definition, so every
 * instance of a definition gets identical CSS.
 * Returns memoized grid configuration including slots, CSS, and container props.
 *
 * The definition itself is validated by `defineLayout`, once per definition.
 * DOM-level slot validation (are the rendered children actually wired up to the
 * right slots?) happens inside the `GridAreas` component's ref callback, since
 * it needs the mounted container element.
 *
 * @example
 * ```tsx
 * const cardGrid = defineLayout({
 *   areas: ["icon?", "info"],
 *   layouts: [{ template: "icon info", columns: "48px 1fr" }],
 * });
 *
 * function MyCard() {
 *   const gridAreas = useGridAreas(cardGrid);
 *
 *   return (
 *     <GridAreas {...gridAreas}>
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
 * @param config - Grid definition from defineLayout()
 * @returns {GridAreasResult} Object with slots, css, and containerProps to spread on GridAreas
 */
export function useGridAreas<TAreaName extends string>(
  config: GridConfig<TAreaName>,
): GridAreasResult<TAreaName> {
  return useMemo(() => {
    const id = gridId(config);

    return {
      slots: createSlots(config.areas),
      css: generateCss(config),
      containerProps: { "data-grid-id": id },
      sizeContainerProps: hasBreakpoints(config)
        ? { style: { containerType: "inline-size", containerName: sizeContainerName(id) } }
        : undefined,
    };
  }, [config]);
}
