/** @jsxImportSource octane */
import {
  cloneElement,
  injectStyle,
  normalizeClass,
  useEffect,
  useRef,
  type ComponentProps,
  type OctaneElement,
  type OctaneNode,
  type Ref,
} from "octane";
import { createSlotCheck, gridMarkup, isDevelopment } from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";

/**
 * Props of a slot component (`<Card.icon>`) and of a grid's root component
 * (`<Card>`): anything a `div` takes, plus `render`.
 */
export type SlotComponentProps = Omit<ComponentProps<"div">, "ref"> & {
  /** The rendered element: the `div`, or your own element when `render` gives one. */
  ref?: Ref<HTMLElement>;
  /**
   * Render your own element as the slot (or grid) instead of a `div`:
   * `render={<label for="notify" />}`. The slot's props merge onto it and its
   * children become the element's children.
   */
  render?: OctaneElement;
};

/** The props of a grid's root component (`<Card>`). */
export type GridComponentProps = SlotComponentProps;

/** A slot component (`<Card.icon>`): renders the element that fills one area. */
export type SlotComponent = (props: SlotComponentProps) => OctaneNode;

/**
 * The component a definition renders as: the grid itself, with a static slot
 * component per area, named exactly like the area. An area nested through
 * `nest` is the root component of the nested grid instead, with that grid's
 * slots as its statics (`<Card.content.icon>`).
 */
export type GridComponent<TAreaName extends string, TNest = {}> = ((
  props: GridComponentProps,
) => OctaneNode) & {
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

type Props = Record<string, unknown>;

type RootProps = GridComponentProps & {
  /** The area of an outer grid this grid fills, when it is nested. */
  "data-area"?: string;
};

const HANDLER = /^on[A-Z]/;

/**
 * Renders `element` with the slot's `props` merged onto it: the element's own
 * props win, except that classes compose, styles merge, handlers chain (the
 * element's first) and refs combine; `attributes` (the adapter's own) always
 * win, and the slot's children become the element's children.
 */
function renderAs(element: OctaneElement, props: Props, attributes: Props): OctaneNode {
  const own: Props = { ...(element.props as Props) };
  if (own.ref === undefined && element.ref != null) {
    own.ref = element.ref;
  }
  const merged: Props = { ...props, ...own };

  const classes = [props.class, props.className, own.class, own.className];
  delete merged.className;
  merged.class = classes.some(value => value !== undefined) ? normalizeClass(classes) : undefined;
  merged.style = mergeStyles(props.style, own.style);
  for (const name of Object.keys(props)) {
    const ours = props[name];
    const theirs = own[name];
    if (HANDLER.test(name) && typeof ours === "function" && typeof theirs === "function") {
      merged[name] = (...args: Array<unknown>) => {
        theirs(...args);
        ours(...args);
      };
    }
  }
  merged.ref = refs(props.ref, own.ref);
  if ("children" in props) {
    merged.children = props.children;
  }

  return cloneElement(element, { ...merged, ...attributes });
}

function mergeStyles(ours: unknown, theirs: unknown): unknown {
  if (ours === undefined || ours === null) {
    return theirs;
  }
  if (theirs === undefined || theirs === null) {
    return ours;
  }
  if (typeof ours === "object" && typeof theirs === "object") {
    return { ...ours, ...theirs };
  }
  if (typeof ours === "string" && typeof theirs === "string") {
    return `${ours};${theirs}`;
  }
  return theirs;
}

/** The refs to attach, in Octane's array form, or `undefined` when there are none. */
function refs(...candidates: Array<unknown>): unknown {
  const present = candidates.filter(ref => ref !== undefined && ref !== null);
  return present.length === 0 ? undefined : present;
}

function createRoot(config: GridConfig<string>) {
  const markup = gridMarkup(config);

  return function Root({ render, ref, "data-area": area, ...props }: RootProps): OctaneNode {
    // One tag per definition in <head>; on the server, collected into the render's `css`.
    injectStyle(markup.cssKey, markup.css);

    const grid = useRef<HTMLElement | null>(null);

    // In development, check the slots after every commit (`null`: no inferred dependencies).
    const checkSlots = useRef<ReturnType<typeof createSlotCheck> | undefined>(undefined);
    useEffect(() => {
      if (!isDevelopment() || grid.current === null) {
        return;
      }
      checkSlots.current ??= createSlotCheck(config, {
        strayChildRemedy: "make it a slot with render={<element />}",
      });
      for (const warning of checkSlots.current(grid.current)) {
        // eslint-disable-next-line no-console
        console.warn(warning);
      }
    }, null);

    const { sizeContainer, grid: gridElement } = markup.elements(area);
    const gridProps: Props = { ...props, ref: refs(grid, ref) };
    const rendered =
      render === undefined ? (
        <div {...gridProps} {...gridElement.attributes} />
      ) : (
        renderAs(render, gridProps, gridElement.attributes)
      );

    return sizeContainer === undefined ? (
      rendered
    ) : (
      <div {...sizeContainer.attributes} style={sizeContainer.style}>
        {rendered}
      </div>
    );
  };
}

function createSlotComponent(area: string): SlotComponent {
  function SlotComponent({ render, ...props }: SlotComponentProps): OctaneNode {
    const attributes = { "data-area": area };
    return render === undefined ? (
      <div {...(props as Props)} {...attributes} />
    ) : (
      renderAs(render, props as Props, attributes)
    );
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
 * definition has breakpoints) and puts the definition's CSS on the page once;
 * `<Card.icon>` renders the slot that fills the `icon` area. Slots accept
 * `class`, `style`, `children`, regular element props, and `render` to make
 * your own element the slot.
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
 *   <Card.input render={<label for="notify" />}>…</Card.input>
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
    const NestedRoot = (props: GridComponentProps): OctaneNode => {
      const Nested = nested;
      return <Nested {...props} data-area={area} />;
    };
    statics[area] = withStatics(NestedRoot, nested[STATICS] ?? {});
  }

  return withStatics(createRoot(config), statics) as unknown as GridComponent<TAreaName, TNest>;
}
