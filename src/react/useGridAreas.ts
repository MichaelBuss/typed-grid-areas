import { useMemo } from "react";
import { gridId } from "../engine/gridId";
import { createSlots, generateCss, hasBreakpoints, sizeContainerName } from "../generateCss";
import { GridAreasResult, GridConfig } from "../types";
import { validateGridConfig } from "../validateGridConfig";

/**
 * React hook for creating type-safe CSS grid-template-areas with automatic :has() selector generation.
 *
 * The CSS and its scoping id depend only on the definition, so every
 * instance of a definition gets identical CSS.
 * Returns memoized grid configuration including slots, CSS, and container props.
 *
 * In development mode, validates the grid configuration and logs warnings for:
 * - Empty areas or layouts
 * - Unknown area names in layouts or when clauses
 * - Mismatched row/column counts
 * - Missing when items in layouts
 *
 * DOM-level slot validation (are the rendered children actually wired up to the
 * right slots?) happens separately, inside the `GridAreas` component's ref
 * callback, since it needs the mounted container element.
 *
 * @example Basic usage with builder pattern
 * ```tsx
 * const cardGrid = createGrid()
 *   .areas(["icon", "info"])
 *   .layout({ layout: [["icon", "info"]] })
 *   .build();
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
 * @example Conditional layouts with row/column sizing
 * ```tsx
 * const cardGrid = createGrid()
 *   .areas(["icon", "title", "description"])
 *   .layout({ layout: [["title"]] })
 *   .layout({
 *     when: ["icon", "title", "description"],
 *     layout: [
 *       ["icon", "title"],
 *       ["icon", "description"],
 *     ],
 *     rows: ["auto", "1fr"],
 *     columns: ["48px", "1fr"],
 *   })
 *   .build();
 *
 * function Card() {
 *   const gridAreas = useGridAreas(cardGrid);
 *   // ...
 * }
 * ```
 * @param config - Grid configuration from createGrid().build()
 * @returns {GridAreasResult} Object with slots, css, and containerProps to spread on GridAreas
 */
export function useGridAreas<TAreaName extends string>(
  config: GridConfig<TAreaName>,
): GridAreasResult<TAreaName> {
  return useMemo(() => {
    const id = gridId(config);

    // Config validation (dev only)
    if (process.env.NODE_ENV === "development") {
      const errors = validateGridConfig(config);
      for (const error of errors) {
        // eslint-disable-next-line no-console
        console.warn(`useGridAreas: ${error}`);
      }
    }

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
