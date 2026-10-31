import type { Component, Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

/**
 * What a `child` snippet receives: the attributes to spread onto your own
 * element, `{#snippet child({ props })}<label {...props}>…</label>{/snippet}`.
 */
export type ChildSnippetProps = { props: Record<string, unknown> };

/**
 * Props of a slot component (`<Card.icon>`): anything a `div` takes, plus a
 * `child` snippet to render your own element instead of the `div`.
 */
export type SlotProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /**
   * Renders your own element as the slot (or grid) instead of a `div`:
   * spread `props` onto it. Bits UI's convention.
   */
  child?: Snippet<[ChildSnippetProps]>;
  children?: Snippet;
};

/** Props of a grid's component (`<Card>`): the same as a slot's. */
export type GridRootProps = SlotProps;

/** A slot component (`<Card.icon>`): renders the element that fills one area. */
export type SlotComponent = Component<SlotProps>;

/**
 * The component a definition renders as: the grid itself, with a slot
 * component per area, named exactly like the area. An area nested through
 * `nest` is the nested grid's component instead, with that grid's slots as
 * its members (`<Card.content.icon>`).
 */
export type GridComponent<TAreaName extends string, TNest = {}> = Component<GridRootProps> & {
  readonly [K in TAreaName]: K extends keyof TNest ? TNest[K] : SlotComponent;
};

/** Any grid component, whatever its areas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGridComponent = GridComponent<any, any>;

/** Options of `createGridComponent`. */
export type GridComponentOptions<TAreaName extends string> = {
  /**
   * Grids nested into areas of this one: `nest: { content: Content }` makes
   * `<Card.content>` both the `content` slot and the grid `Content`.
   */
  nest?: { readonly [K in TAreaName]?: AnyGridComponent };
};
