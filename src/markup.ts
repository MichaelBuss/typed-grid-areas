/**
 * What a grid's rendered elements carry so the generated CSS can find them:
 * the slots' attributes, and the grid's own size container when it has
 * breakpoints.
 */
import { GridConfig, SlotProps } from "./types";

/**
 * Creates a typed slots object from an array of area names.
 *
 * Each slot carries only a `data-area` attribute; placement lives in the
 * generated CSS.
 */
export function createSlots<TAreaName extends string>(
  areas: ReadonlyArray<TAreaName>,
): Record<TAreaName, SlotProps> {
  return Object.fromEntries(areas.map(area => [area, { "data-area": area }])) as unknown as Record<
    TAreaName,
    SlotProps
  >;
}

/**
 * The container name of a grid's size container, derived from the grid's id.
 *
 * Breakpoint queries target this name, so only the grid's own size container
 * can answer them, never an unrelated container above or below it. Characters
 * that aren't valid in a CSS identifier are replaced.
 */
export function sizeContainerName(id: string): string {
  return `grid-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * Whether any layout in the config has breakpoints, i.e. whether the grid
 * needs its own size container.
 */
export function hasBreakpoints(config: GridConfig<string>): boolean {
  return config.layouts.some(
    ({ breakpoints }) => breakpoints !== undefined && Object.keys(breakpoints).length > 0,
  );
}
