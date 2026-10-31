/**
 * `asChild`: your own single child element rendered in place of a slot's (or
 * a grid's) `div`, with the slot's props merged onto it. A small `Slot` of
 * our own on `cloneElement`, in the spirit of Radix's.
 */
import {
  cloneElement,
  isValidElement,
  toChildArray,
  type ComponentChildren,
  type Ref,
  type RefCallback,
} from "preact";

type Props = Record<string, unknown>;

/**
 * The child element, cloned with `slotProps` merged in and the adapter's
 * `attributes` on top:
 *
 * - `class` and `className` from both sides are joined;
 * - `style` objects merge, the child's winning; when either is a string,
 *   the slot's style text comes first, then the child's;
 * - an `on*` handler on both sides runs the child's, then the slot's;
 * - refs on both sides are both set;
 * - the adapter's attributes always win, and any other child prop wins.
 *
 * Throws unless `children` is exactly one element.
 */
export function slotChild(
  children: ComponentChildren,
  slotProps: Props,
  attributes: Record<string, string>,
) {
  const childArray = toChildArray(children);
  const child = childArray[0];
  if (childArray.length !== 1 || !isValidElement(child)) {
    throw new Error(
      `typed-grid-areas: asChild expects exactly one element child, got ${describe(childArray)}.`,
    );
  }

  const childProps = child.props as Props;
  const merged: Props = { ...slotProps };
  delete merged.ref;
  delete merged.class;
  delete merged.className;

  for (const [name, childValue] of Object.entries(childProps)) {
    const slotValue = slotProps[name];
    if (name === "children" || name === "class" || name === "className") {
      continue;
    }
    if (name === "style") {
      merged.style = mergeStyles(slotValue, childValue);
    } else if (
      /^on[A-Z]/.test(name) &&
      typeof slotValue === "function" &&
      typeof childValue === "function"
    ) {
      merged[name] = (...args: Array<unknown>) => {
        const result = childValue(...args);
        slotValue(...args);
        return result;
      };
    } else {
      merged[name] = childValue;
    }
  }

  // Set the joined classes under whichever names the child uses, so neither
  // of its own is left behind and no `undefined` clears the other.
  const classes = [slotProps.class, slotProps.className, childProps.class, childProps.className]
    .filter(value => typeof value === "string" && value !== "")
    .join(" ");
  if (classes !== "") {
    if ("className" in childProps) {
      merged.className = classes;
    }
    if ("class" in childProps || !("className" in childProps)) {
      merged.class = classes;
    }
  }

  // A DOM element's ref is on the vnode; a component's is in its props (Preact 11 forwards refs).
  const childRef = (typeof child.type === "function" ? childProps.ref : child.ref) as
    Ref<unknown> | undefined;
  const slotRef = slotProps.ref as Ref<unknown> | undefined;
  merged.ref = slotRef && childRef ? composeRefs(slotRef, childRef) : (slotRef ?? childRef);

  return cloneElement(child, { ...merged, ...attributes });
}

function describe(children: Array<unknown>): string {
  if (children.length === 0) {
    return "none";
  }
  if (children.length > 1) {
    return `${children.length} children`;
  }
  return typeof children[0];
}

/** Sets a ref, returning what a callback ref returns (its cleanup, if any). */
function setRef<T>(ref: Ref<T> | undefined, value: T | null): unknown {
  if (typeof ref === "function") {
    return ref(value);
  }
  if (ref) {
    ref.current = value;
  }
  return undefined;
}

/** One callback ref setting every ref given, with their cleanups. */
export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return value => {
    const cleanups = refs.map(ref => setRef(ref, value));
    if (!cleanups.some(cleanup => typeof cleanup === "function")) {
      return undefined;
    }
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === "function") {
          cleanup();
        } else {
          setRef(ref, null);
        }
      });
    };
  };
}

function mergeStyles(slotStyle: unknown, childStyle: unknown): unknown {
  if (slotStyle == null) {
    return childStyle;
  }
  if (childStyle == null) {
    return slotStyle;
  }
  if (typeof slotStyle === "object" && typeof childStyle === "object") {
    return { ...slotStyle, ...childStyle };
  }
  return [styleText(slotStyle), styleText(childStyle)].filter(text => text !== "").join("; ");
}

/** A style as `style` attribute text: a string as is, an object's properties as CSS. */
function styleText(style: unknown): string {
  if (typeof style === "string") {
    return style.trim().replace(/;$/, "");
  }
  if (typeof style !== "object" || style === null) {
    return "";
  }
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== "")
    .map(([name, value]) => {
      const property = name.startsWith("--") ? name : name.replace(/[A-Z]/g, "-$&").toLowerCase();
      return `${property}: ${String(value)}`;
    })
    .join("; ");
}
