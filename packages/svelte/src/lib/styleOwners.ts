/**
 * Which instance of a definition renders its CSS (ADR 0005). Svelte's
 * `<svelte:head>` doesn't deduplicate, so exactly one instance per
 * definition renders the style tag there: the first to render.
 */
import { getAbortSignal } from "svelte";

/** Per server render (one abort signal each), the grid ids whose CSS is already rendered. */
const rendered = new WeakMap<AbortSignal, Set<string>>();

/**
 * On the server, during a component's render: whether this instance is the
 * first of its definition in the current `render()`, and so renders its CSS.
 */
export function claimServerStyle(id: string): boolean {
  const signal = getAbortSignal();
  let ids = rendered.get(signal);
  if (ids === undefined) {
    ids = new Set();
    rendered.set(signal, ids);
  }
  if (ids.has(id)) {
    return false;
  }
  ids.add(id);
  return true;
}

type Owner = { takeOver: () => void };

/** In the browser, the mounted instances of each definition, oldest first. */
const owners = new Map<string, Array<Owner>>();

/**
 * In the browser, while a component initialises: joins the definition's
 * instances. The first owns the style tag; when it leaves, the next one
 * takes over (`takeOver` is called), and the tag goes away with the last.
 */
export function joinStyleOwners(
  id: string,
  takeOver: () => void,
): { owns: boolean; leave: () => void } {
  const instances = owners.get(id) ?? [];
  owners.set(id, instances);
  const owner: Owner = { takeOver };
  instances.push(owner);
  return {
    owns: instances[0] === owner,
    leave() {
      const index = instances.indexOf(owner);
      instances.splice(index, 1);
      if (index === 0) {
        instances[0]?.takeOver();
      }
      if (instances.length === 0) {
        owners.delete(id);
      }
    },
  };
}
