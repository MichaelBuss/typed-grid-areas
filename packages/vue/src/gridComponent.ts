import {
  defineComponent,
  h,
  onMounted,
  onUpdated,
  ref,
  type DefineSetupFnComponent,
  type FunctionalComponent,
  type SetupContext,
} from "vue";
import { createSlotCheck, gridMarkup, isDevelopment } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";
import { renderAsChild } from "./asChild.ts";
import { useGridStyle } from "./gridStyles.ts";

/** Props of a slot component (`<Card.icon>`) and of a grid component (`<Card>`). */
export type SlotComponentProps = {
  /**
   * Render your own single child element as the slot (or grid) instead of a
   * `div`, with the attributes merged onto it (`as-child` in templates).
   */
  asChild?: boolean;
};

/** The props of a grid component (`<Card>`). */
export type GridComponentProps = SlotComponentProps;

/** A slot component (`<Card.icon>`): renders the element that fills one area. */
export type SlotComponent = DefineSetupFnComponent<SlotComponentProps>;

/**
 * The component a definition renders as: the grid itself, with a member
 * component per area, named exactly like the area. An area nested through
 * `nest` is the nested grid's component instead, with that grid's members
 * (`<Card.content.icon>`).
 */
export type GridComponent<
  TAreaName extends string,
  TNest = {},
> = DefineSetupFnComponent<GridComponentProps> & {
  readonly [K in TAreaName]: K extends keyof TNest ? TNest[K] : SlotComponent;
};

/** Any grid component, whatever its areas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyGridComponent = GridComponent<any, any>;

/** Options of `createGridComponent`. */
export type GridComponentOptions<TAreaName extends string> = {
  /**
   * Grids nested into areas of this one: `nest: { content: Content }` makes
   * `<Card.content>` both the `content` slot and the grid of `Content`.
   */
  nest?: { readonly [K in TAreaName]?: AnyGridComponent };
};

/**
 * Names Vue reads on a component, so an area member named like one would
 * change how the component behaves.
 */
const RESERVED_AREA_NAMES = [
  "length",
  "props",
  "emits",
  "slots",
  "inheritAttrs",
  "displayName",
  "compatConfig",
] as const;

/** An area name Vue reserves on a component: one of `RESERVED_AREA_NAMES`, or any starting with `__`. */
export type ReservedAreaName = (typeof RESERVED_AREA_NAMES)[number] | `__${string}`;

function isReserved(area: string): boolean {
  return area.startsWith("__") || (RESERVED_AREA_NAMES as ReadonlyArray<string>).includes(area);
}

/**
 * Rejects a definition with a reserved area name at compile time: the
 * definition must then have a property it can't have, named after the problem.
 */
type WithoutReservedAreas<TAreaName extends string> = [
  Extract<TAreaName, ReservedAreaName>,
] extends [never]
  ? unknown
  : {
      [K in `area "${Extract<TAreaName, ReservedAreaName>}" is reserved by Vue; rename it`]: never;
    };

/** The stateful component behind a grid component: renders the grid and puts its CSS on the page. */
function createGrid(definition: GridConfig<string>) {
  const markup = gridMarkup(definition);

  return defineComponent({
    name: "Grid",
    inheritAttrs: false,
    props: {
      asChild: Boolean,
      /** The area of an outer grid this grid fills, when it is nested. */
      dataArea: String,
    },
    setup(props, { attrs, slots }) {
      useGridStyle(definition);

      // In development, check the slots after mounting and after every update.
      const gridRef = ref<Element | null>(null);
      if (isDevelopment()) {
        const checkSlots = createSlotCheck(definition, {
          strayChildRemedy: "make it a slot with as-child",
        });
        const check = () => {
          if (gridRef.value !== null) {
            for (const warning of checkSlots(gridRef.value)) {
              // eslint-disable-next-line no-console
              console.warn(warning);
            }
          }
        };
        onMounted(check);
        onUpdated(check);
      }

      return () => {
        const { sizeContainer, grid } = markup.elements(props.dataArea);
        const gridElement = props.asChild
          ? renderAsChild(slots.default?.(), attrs, grid.attributes, gridRef)
          : h("div", { ...attrs, ...grid.attributes, ref: gridRef }, slots.default?.());
        return sizeContainer === undefined
          ? gridElement
          : h("div", { ...sizeContainer.attributes, style: sizeContainer.style }, [gridElement]);
      };
    },
  });
}

function createSlotComponent(area: string): SlotComponent {
  return defineComponent({
    name: `${area}Area`,
    inheritAttrs: false,
    props: { asChild: Boolean },
    setup(props, { attrs, slots }) {
      return () =>
        props.asChild
          ? renderAsChild(slots.default?.(), attrs, { "data-area": area })
          : h("div", { ...attrs, "data-area": area }, slots.default?.());
    },
  }) as unknown as SlotComponent;
}

/**
 * A functional component rendering `component` with the attributes it is
 * given (and `extra` on top), passing its slots through. Its own properties
 * stay free for the area members: Vue reads none but the reserved ones.
 */
function passThrough(
  component: Parameters<typeof h>[0],
  extra: Record<string, unknown> = {},
): FunctionalComponent {
  const render: FunctionalComponent = (_props, { attrs, slots }: Omit<SetupContext, "expose">) =>
    h(component as never, { ...attrs, ...extra }, slots);
  render.inheritAttrs = false;
  return render;
}

/** The members (one per area) a grid component carries. */
const MEMBERS = Symbol("typed-grid-areas members");

type WithMembers = { [MEMBERS]?: Record<string, unknown> };

/** Defines `members` on a component; `defineProperty`, since a function's `name` is read-only. */
function withMembers<TComponent extends object>(
  component: TComponent,
  members: Record<string, unknown>,
): TComponent {
  for (const [key, value] of Object.entries(members)) {
    Object.defineProperty(component, key, { value, enumerable: true, configurable: true });
  }
  Object.defineProperty(component, MEMBERS, { value: members });
  return component;
}

/**
 * Turns a definition into the component it renders as.
 *
 * `<Card>` renders the grid (inside its own size container when the
 * definition has breakpoints) and puts the definition's CSS on the page;
 * `<Card.icon>` renders the slot that fills the `icon` area. Both take
 * `class`, `style`, any other attribute, and `as-child` to make your own
 * element the slot (or grid).
 *
 * Bind it in `<script setup>` (or return it from `setup()`), so templates can
 * use its members as tags. Create it once per definition.
 */
export function createGridComponent<
  TAreaName extends string,
  const TNest extends GridComponentOptions<TAreaName>["nest"] = {},
>(
  definition: GridConfig<TAreaName> & WithoutReservedAreas<TAreaName>,
  options: { nest?: TNest } = {},
): GridComponent<TAreaName, TNest> {
  const members: Record<string, unknown> = {};
  for (const area of definition.areas) {
    if (isReserved(area)) {
      throw new Error(
        `typed-grid-areas: the area name "${area}" is reserved by Vue on a component, so it ` +
          `can't be a member of the grid component. Rename the area.`,
      );
    }
  }
  for (const area of definition.areas) {
    const nested = options.nest?.[area] as (AnyGridComponent & WithMembers) | undefined;
    members[area] =
      nested === undefined
        ? createSlotComponent(area)
        : withMembers(passThrough(nested, { "data-area": area }), nested[MEMBERS] ?? {});
  }

  return withMembers(passThrough(createGrid(definition)), members) as unknown as GridComponent<
    TAreaName,
    TNest
  >;
}
