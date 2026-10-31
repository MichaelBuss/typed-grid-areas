import type { Component } from "svelte";
import type { GridConfig } from "typed-grid-areas";
import Grid from "./Grid.svelte";
import Slot from "./Slot.svelte";
import type {
  AnyGridComponent,
  GridComponent,
  GridComponentOptions,
  SlotComponent,
} from "./types.ts";

/**
 * `component` with some props fixed: Svelte 5's public component signature,
 * `(internals, props)`, forwarding `internals` untouched and `props` through
 * a proxy that answers the fixed props itself and reads every other prop
 * from the caller's props live, so they stay reactive.
 */
function withFixedProps<TProps extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: Component<any>,
  fixed: Record<string, unknown>,
): Component<TProps> {
  const isFixed = (key: string | symbol) => typeof key === "string" && Object.hasOwn(fixed, key);
  return (internals, props) =>
    component(
      internals,
      new Proxy(props, {
        get: (target, key, receiver) =>
          isFixed(key) ? fixed[key as string] : Reflect.get(target, key, receiver),
        has: (target, key) => isFixed(key) || Reflect.has(target, key),
        ownKeys: target => [
          ...Reflect.ownKeys(target).filter(key => !isFixed(key)),
          ...Object.keys(fixed),
        ],
        getOwnPropertyDescriptor: (target, key) =>
          isFixed(key)
            ? { value: fixed[key as string], enumerable: true, configurable: true, writable: false }
            : Reflect.getOwnPropertyDescriptor(target, key),
      }),
    );
}

/** The members (one per area) a grid component carries, for nesting it. */
const MEMBERS = Symbol("typed-grid-areas members");

type WithMembers = { [MEMBERS]?: Record<string, unknown> };

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
  Object.defineProperty(component, MEMBERS, { value: members });
  return component;
}

/**
 * Turns a definition into the component it renders as.
 *
 * `<Card>` renders the grid (inside its own size container when the
 * definition has breakpoints) and puts the definition's CSS in `<head>`;
 * `<Card.icon>` renders the slot that fills the `icon` area. Both take any
 * attribute a `div` takes, children, and a `child` snippet to render your
 * own element instead of the `div`.
 *
 * Create grid components once per definition, in a module (`.ts`, or a
 * component's `<script module>`).
 *
 * @example
 * ```ts
 * const Content = createGridComponent(
 *   defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
 * );
 * export const Card = createGridComponent(
 *   defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
 *   { nest: { content: Content } },
 * );
 * ```
 */
export function createGridComponent<
  TAreaName extends string,
  const TNest extends GridComponentOptions<TAreaName>["nest"] = {},
>(definition: GridConfig<TAreaName>, options: { nest?: TNest } = {}): GridComponent<TAreaName, TNest> {
  const members: Record<string, unknown> = {};
  for (const area of definition.areas) {
    const nested = options.nest?.[area] as (AnyGridComponent & WithMembers) | undefined;
    members[area] =
      nested === undefined
        ? (withFixedProps(Slot, { area }) satisfies SlotComponent)
        : withMembers(withFixedProps(nested, { outerArea: area }), nested[MEMBERS] ?? {});
  }
  return withMembers(withFixedProps(Grid, { definition }), members) as GridComponent<
    TAreaName,
    TNest
  >;
}
