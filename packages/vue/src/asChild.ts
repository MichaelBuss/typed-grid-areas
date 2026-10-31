import { cloneVNode, Comment, Fragment, mergeProps, type Ref, type VNode } from "vue";

/** Slot content with its fragments flattened (`v-for`, `<template>`), as Reka UI's `Slot` reads it. */
function flatten(children: ReadonlyArray<VNode>): Array<VNode> {
  return children.flatMap(child =>
    child.type === Fragment && Array.isArray(child.children)
      ? flatten(child.children as Array<VNode>)
      : [child],
  );
}

/**
 * Renders your own element in place of the adapter's `div`, Reka UI's `Slot`
 * algorithm: the first child that isn't a comment, cloned with `attrs` merged
 * into its props (its own props win, classes and styles combine, handlers
 * chain) and `forced` on top, its own ref kept and `ref` (when given) added.
 */
export function renderAsChild(
  children: ReadonlyArray<VNode> | undefined,
  attrs: Record<string, unknown>,
  forced: Record<string, unknown>,
  ref?: Ref<Element | null>,
): Array<VNode> | VNode | null {
  if (children === undefined) {
    return null;
  }
  const flat = flatten(children);
  const index = flat.findIndex(child => child.type !== Comment);
  const child = flat[index];
  if (child === undefined) {
    return flat;
  }

  // The child's own ref lives on the vnode, which the clone keeps.
  const { ref: _ref, ref_key: _key, ref_for: _for, ...own } = child.props ?? {};
  const props = mergeProps(attrs, own, forced);
  if (ref !== undefined) {
    props.ref = ref;
  }
  const cloned = cloneVNode({ ...child, props: {} } as VNode, props, true);
  if (flat.length === 1) {
    return cloned;
  }
  flat[index] = cloned;
  return flat;
}
