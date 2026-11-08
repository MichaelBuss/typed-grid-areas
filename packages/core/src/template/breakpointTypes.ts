/**
 * Type-level checks of breakpoint keys, mirroring `breakpointUnit` and the
 * breakpoint warnings of `validateGridConfig`. Keys that aren't literals are
 * never checked.
 */
import { BREAKPOINT_UNITS, BreakpointUnit, ContainerBreakpoint } from "../types.ts";

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type IsDigits<S extends string> = S extends `${Digit}${infer Rest}`
  ? Rest extends ""
    ? true
    : IsDigits<Rest>
  : false;

/** Whether a string is a plain, non-negative number: `12`, `27.5`, `.5`. */
type IsPlainNumber<S extends string> = S extends `${infer Whole}.${infer Fraction}`
  ? (Whole extends "" ? true : IsDigits<Whole>) extends true
    ? IsDigits<Fraction>
    : false
  : IsDigits<S>;

type WidthUnit<
  Width extends string,
  Unit extends BreakpointUnit = BreakpointUnit,
> = Unit extends BreakpointUnit
  ? Width extends `${infer Value}${Unit}`
    ? IsPlainNumber<Value> extends true
      ? Unit
      : never
    : never
  : never;

/**
 * The unit of a breakpoint key: `"rem"` for a named size, the unit of an
 * arbitrary width (`"@[20ch]"` -> `"ch"`), or `never` for a key that isn't
 * allowed.
 */
export type BreakpointKeyUnit<Key> = Key extends ContainerBreakpoint
  ? "rem"
  : Key extends `@[${infer Width}]`
    ? WidthUnit<Width>
    : never;

/** Whether a key is a literal, not `string` or a pattern such as `` `@[${number}px]` ``. */
type IsLiteralKey<Key> = Key extends string ? ({} extends Record<Key, 1> ? false : true) : false;

type LayoutUnits<TLayout> = TLayout extends { breakpoints?: infer TBreakpoints }
  ? {
      [K in keyof NonNullable<TBreakpoints>]-?: IsLiteralKey<K> extends true
        ? BreakpointKeyUnit<K>
        : never;
    }[keyof NonNullable<TBreakpoints>]
  : never;

/** The units of every literal breakpoint key in every layout of a definition. */
export type DefinitionUnits<TLayouts> = {
  [I in keyof TLayouts]: LayoutUnits<TLayouts[I]>;
}[number & keyof TLayouts];

/** Units listed in a fixed order, comma separated. */
type JoinUnits<
  Units,
  Order extends ReadonlyArray<string> = typeof BREAKPOINT_UNITS,
  Done extends string = "",
> = Order extends readonly [infer Unit extends string, ...infer Rest extends ReadonlyArray<string>]
  ? JoinUnits<
      Units,
      Rest,
      Unit extends Units ? (Done extends "" ? Unit : `${Done}, ${Unit}`) : Done
    >
  : Done;

/**
 * The check a breakpoint's arrangement must also pass for its key: a branded
 * error when the key isn't allowed, or when the definition's breakpoints
 * (`TUnits`) use another unit too.
 */
export type BreakpointKeyCheck<Key, TUnits> =
  IsLiteralKey<Key> extends true
    ? [BreakpointKeyUnit<Key>] extends [never]
      ? { _unsupportedBreakpoint: Key }
      : [Exclude<TUnits, BreakpointKeyUnit<Key>>] extends [never]
        ? unknown
        : {
            _mixedBreakpointUnits: `Breakpoints in one definition must share a unit (named sizes are rem): ${BreakpointKeyUnit<Key>} is mixed with ${JoinUnits<Exclude<TUnits, BreakpointKeyUnit<Key>>>}`;
          }
    : unknown;
