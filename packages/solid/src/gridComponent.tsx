import {
  children,
  ComponentProps,
  createEffect,
  JSX,
  mergeProps,
  sharedConfig,
  splitProps,
  ValidComponent,
} from "solid-js";
import { Dynamic, isServer, ssr, useAssets } from "solid-js/web";
import {
  createSlotCheck,
  gridMarkup,
  gridStyleTags,
  insertGridStyle,
  isDevelopment,
} from "typed-grid-areas/adapter";
import type { GridConfig } from "typed-grid-areas";

/**
 * Props of a slot component (`<Card.icon>`) and of a grid's root component
 * (`<Card>`): anything the element `as` renders takes (a `div`'s by
 * default), plus `as`.
 */
export type SlotComponentProps<T extends ValidComponent = "div"> = Omit<ComponentProps<T>, "as"> & {
  /**
   * The element to render as the slot (or grid) instead of a `div`: a tag
   * name (`"label"`), a component, or a render function
   * (`props => <label {...props} />`). A component or render function gets
   * the slot's props, including its `data-area`, and must spread them onto
   * its root element.
   */
  as?: T | SlotRenderFunction;
};

/**
 * A render function passed to `as`: it gets the slot's props, including its
 * `data-area`, to spread onto the element it renders. Annotate its `props`
 * (`(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) => …`) for the slot
 * to take that element's attributes rather than a `div`'s.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SlotRenderFunction = (props: JSX.HTMLAttributes<any>) => JSX.Element;

/** The props of a grid's root component (`<Card>`). */
export type GridComponentProps<T extends ValidComponent = "div"> = SlotComponentProps<T>;

/** A slot component (`<Card.icon>`): renders the element that fills one area. */
export type SlotComponent = <T extends ValidComponent = "div">(
  props: SlotComponentProps<T>,
) => JSX.Element;

/**
 * The component a definition renders as: the grid itself, with a slot
 * component per area as a member, named exactly like the area. An area
 * nested through `nest` is the root component of the nested grid instead,
 * with that grid's slots as its members (`<Card.content.icon>`).
 */
export type GridComponent<TAreaName extends string, TNest = {}> = (<
  T extends ValidComponent = "div",
>(
  props: GridComponentProps<T>,
) => JSX.Element) & {
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

/** The props the components handle themselves; the rest go on the element. */
type ElementProps = {
  as?: ValidComponent;
  ref?: unknown;
  children?: JSX.Element;
  /** The area of an outer grid this grid fills, when it is nested. */
  "data-area"?: string;
  [attribute: string]: unknown;
};

/**
 * What a server render has registered with `useAssets`, by render. The
 * render's list of assets is internal to Solid; it's only used here as a
 * key that's new for each render.
 */
const registeredStyles = new WeakMap<object, Set<string>>();

/**
 * Puts a definition's CSS on the page: on the server, its style tag among
 * the render's assets (once per render), which Solid injects before
 * `</head>`; in the browser, its style tag in `<head>`, reusing one the
 * server rendered.
 */
function emitCss(definition: GridConfig<string>): void {
  if (!isServer) {
    insertGridStyle(document, definition);
    return;
  }
  const assets = (sharedConfig.context as { assets?: object } | undefined)?.assets;
  if (assets === undefined) {
    return;
  }
  const registered = registeredStyles.get(assets) ?? new Set<string>();
  registeredStyles.set(assets, registered);
  const { id } = gridMarkup(definition);
  if (registered.has(id)) {
    return;
  }
  registered.add(id);
  // `ssr` marks the tag's HTML as already rendered, so it isn't escaped.
  useAssets(() => ssr(gridStyleTags([definition])) as unknown as JSX.Element);
}

function createRoot(definition: GridConfig<string>) {
  const markup = gridMarkup(definition);

  return function Root(props: ElementProps): JSX.Element {
    emitCss(definition);

    const [local, others] = splitProps(props, ["as", "ref", "children", "data-area"]);
    const { sizeContainer, grid: gridElement } = markup.elements(local["data-area"]);
    const resolved = children(() => local.children);

    let grid: Element | undefined;
    const ref = (element: Element) => {
      grid = element;
      (local.ref as ((element: Element) => void) | undefined)?.(element);
    };

    // In development, check the slots after mount and whenever they change.
    if (!isServer && isDevelopment()) {
      const checkSlots = createSlotCheck(definition, {
        strayChildRemedy: "make it a slot with `as`",
      });
      createEffect(() => {
        resolved();
        if (grid !== undefined) {
          for (const warning of checkSlots(grid)) {
            // eslint-disable-next-line no-console
            console.warn(warning);
          }
        }
      });
    }

    const element = (
      <Dynamic component={local.as ?? "div"} {...others} {...gridElement.attributes} ref={ref}>
        {resolved()}
      </Dynamic>
    );
    if (sizeContainer === undefined) {
      return element;
    }
    return (
      <div {...sizeContainer.attributes} style={sizeContainer.styleText}>
        {element}
      </div>
    );
  };
}

function createSlotComponent(area: string) {
  return function SlotComponent(props: ElementProps): JSX.Element {
    const [local, others] = splitProps(props, ["as"]);
    return <Dynamic component={local.as ?? "div"} {...others} data-area={area} />;
  };
}

/**
 * Defines `members` on a component. `defineProperty`, because an area may be
 * named like a function's own read-only properties (`name`, `length`).
 */
function withMembers<TComponent extends object>(
  component: TComponent,
  members: Record<string, unknown>,
): TComponent {
  for (const [key, value] of Object.entries(members)) {
    Object.defineProperty(component, key, { value, enumerable: true, configurable: true });
  }
  return component;
}

/** The members of a grid component, one per area. */
function membersOf(component: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(component));
}

/**
 * Turns a definition into the component it renders as.
 *
 * `<Card>` renders the grid (inside its own size container when the
 * definition has breakpoints) and puts the definition's CSS on the page;
 * `<Card.icon>` renders the slot that fills the `icon` area. Slots accept
 * `class`, `style`, `children`, regular element props, and `as` to render
 * your own element as the slot.
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
 *   <Card.input as="label" for="notify">…</Card.input>
 *   <Card.content>
 *     <Card.content.icon>…</Card.content.icon>
 *   </Card.content>
 * </Card>
 * ```
 */
export function createGridComponent<
  TAreaName extends string,
  const TNest extends GridComponentOptions<TAreaName>["nest"] = {},
>(
  definition: GridConfig<TAreaName>,
  options: { nest?: TNest } = {},
): GridComponent<TAreaName, TNest> {
  const members: Record<string, unknown> = {};
  for (const area of definition.areas) {
    const nested = options.nest?.[area] as ((props: ElementProps) => JSX.Element) | undefined;
    if (nested === undefined) {
      members[area] = createSlotComponent(area);
      continue;
    }
    const Nested = nested;
    const NestedRoot = (props: ElementProps) => (
      <Nested {...mergeProps(props, { "data-area": area })} />
    );
    members[area] = withMembers(NestedRoot, membersOf(nested));
  }

  return withMembers(createRoot(definition), members) as unknown as GridComponent<TAreaName, TNest>;
}
