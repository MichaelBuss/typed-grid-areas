/**
 * What the Try it page's playground offers for each example design: its
 * optional areas (across all of its grids) and the CSS the core generates
 * for each of its definitions.
 */
import { generateCss } from "typed-grid-areas";
import type { IdCardOptional, PreferenceCardOptional } from "@typed-grid-areas/acceptance";
import {
  idCardGrid,
  preferenceCardGrid,
  preferenceContentGrid,
} from "@typed-grid-areas/acceptance/designs";

/** A design the playground renders: its label, optional areas and generated CSS. */
export type PlaygroundDesign<TOptional extends string> = {
  label: string;
  optional: ReadonlyArray<TOptional>;
  /** One block per definition, outermost first. */
  css: ReadonlyArray<{ name: string; css: string }>;
};

export const playgroundDesigns = {
  "preference-card": {
    label: "PreferenceCard",
    optional: [
      ...preferenceCardGrid.optionalAreas,
      ...preferenceContentGrid.optionalAreas,
    ] as ReadonlyArray<PreferenceCardOptional>,
    css: [
      { name: "preferenceCardGrid", css: generateCss(preferenceCardGrid) },
      { name: "preferenceContentGrid", css: generateCss(preferenceContentGrid) },
    ],
  },
  "id-card": {
    label: "ID card",
    optional: idCardGrid.optionalAreas as ReadonlyArray<IdCardOptional>,
    css: [{ name: "idCardGrid", css: generateCss(idCardGrid) }],
  },
} satisfies Record<string, PlaygroundDesign<string>>;

export type PlaygroundDesignKey = keyof typeof playgroundDesigns;

/**
 * Every combination of present optional areas, each once, from everything
 * present to nothing, keeping the areas' order within each.
 */
export function combinations<T>(areas: ReadonlyArray<T>): Array<Array<T>> {
  return Array.from({ length: 2 ** areas.length }, (_, index) =>
    // Bit i of the index (from the left) set means area i is absent, so index 0 has them all.
    areas.filter((_, area) => (index & (1 << (areas.length - 1 - area))) === 0),
  );
}
