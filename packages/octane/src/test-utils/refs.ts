/** The refs the `render` specs pass to the grid, the slot, and the elements they render as. */
export type Refs = {
  grid: { current: HTMLElement | null };
  section: { current: HTMLElement | null };
  slot: { current: HTMLElement | null };
  label: { current: HTMLLabelElement | null };
};

export const newRefs = (): Refs => ({
  grid: { current: null },
  section: { current: null },
  slot: { current: null },
  label: { current: null },
});
