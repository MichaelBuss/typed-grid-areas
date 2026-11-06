/**
 * The example designs' source, as the acceptance package writes it, for the
 * pages that show a definition: the site never keeps a copy of one.
 */
import source from "@typed-grid-areas/acceptance/designs?raw";

export type Design = "preferenceCardGrid" | "preferenceContentGrid" | "idCardGrid";

/** A design's definition: from its `export const` to the end of its `defineLayout` call. */
export function designSource(design: Design): string {
  const match = new RegExp(
    `^export const ${design} = defineLayout\\(\\{\\n[\\s\\S]*?^\\}\\);$`,
    "m",
  ).exec(source);
  if (match === null) {
    throw new Error(`designSource: ${design} is not in @typed-grid-areas/acceptance/designs`);
  }
  return match[0];
}
