// Spike: type-level parsing of CSS grid-template-areas strings.
// Throwaway. Not production code.

export type Breakpoint = "@xs" | "@sm" | "@md" | "@lg" | "@xl";
export type AlignSpec = {
  justify?: "start" | "end" | "center" | "stretch";
  align?: "start" | "end" | "center" | "stretch";
};

type StripQ<S> = S extends `${infer N}?` ? N : S;
export type AreaName<A extends readonly string[]> = StripQ<A[number]>;

// ---------------------------------------------------------------------------
// String utilities (all tail-recursive)
// ---------------------------------------------------------------------------

type ReplaceAll<S extends string, F extends string, T extends string, Acc extends string = ""> =
  S extends `${infer A}${F}${infer B}` ? ReplaceAll<B, F, T, `${Acc}${A}${T}`> : `${Acc}${S}`;

type IsLiteral<S> = S extends string ? (string extends S ? false : true) : false;
type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

/** Split on single spaces, dropping empty tokens (so runs of spaces collapse). */
type Tokens<S extends string, Acc extends string[] = []> =
  S extends `${infer H} ${infer T}`
    ? Tokens<T, H extends "" ? Acc : [...Acc, H]>
    : S extends "" ? Acc : [...Acc, S];

// ---------------------------------------------------------------------------
// Template parsing: rows separated by "\n" or "/", cells by whitespace runs
// ---------------------------------------------------------------------------

type NormalizeTemplate<S extends string> =
  ReplaceAll<ReplaceAll<ReplaceAll<S, "\t", " ">, "\r", "">, "/", "\n">;

type ParseRows<S extends string, Acc extends string[][] = []> =
  S extends `${infer Line}\n${infer Rest}`
    ? ParseRows<Rest, Tokens<Line> extends [] ? Acc : [...Acc, Tokens<Line>]>
    : Tokens<S> extends [] ? Acc : [...Acc, Tokens<S>];

export type ParseTemplate<S extends string> = ParseRows<NormalizeTemplate<S>>;

type Cells<R extends string[][]> = R[number][number];

/** First row whose cell count differs from row 0, or never. */
type FirstRaggedRow<
  R extends string[][],
  Expected extends number = R[0]["length"],
  I extends 1[] = [],
> = R extends [infer H extends string[], ...infer T extends string[][]]
  ? H["length"] extends Expected
    ? FirstRaggedRow<T, Expected, [...I, 1]>
    : { row: [...I, 1]["length"]; cells: H["length"]; expected: Expected }
  : never;

// ---------------------------------------------------------------------------
// Track-list counting: whitespace-separated, but not inside parentheses
// ---------------------------------------------------------------------------

type CountChar<S extends string, C extends string, N extends 1[] = []> =
  S extends `${string}${C}${infer R}` ? CountChar<R, C, [...N, 1]> : N["length"];

type Balanced<S extends string> = CountChar<S, "("> extends CountChar<S, ")"> ? true : false;

type CountTracksFrom<T extends string[], Pending extends string = "", N extends 1[] = []> =
  T extends [infer H extends string, ...infer R extends string[]]
    ? Balanced<`${Pending}${H}`> extends true
      ? CountTracksFrom<R, "", [...N, 1]>
      : CountTracksFrom<R, `${Pending}${H} `, N>
    : Pending extends "" ? N["length"] : -1; // -1 = unbalanced parens

/** Track count, or `number` when not statically countable (repeat(), non-literal). */
export type CountTracks<S extends string> =
  IsLiteral<S> extends false
    ? number
    : S extends `${string}repeat(${string}`
      ? number
      : CountTracksFrom<Tokens<ReplaceAll<ReplaceAll<S, "\n", " ">, "\t", " ">>>;

// ---------------------------------------------------------------------------
// Rectangularity (optional, measured separately)
// ---------------------------------------------------------------------------

type RowMask<Row extends string[], X extends string, Acc extends string = ""> =
  Row extends [infer H, ...infer T extends string[]]
    ? RowMask<T, X, `${Acc}${H extends X ? "1" : "0"}`>
    : Acc;

type Gappy<M extends string> =
  M extends `${string}10${infer R}` ? (R extends `${string}1${string}` ? true : false) : false;

type Masks<R extends string[][], X extends string, Acc extends string[] = []> =
  R extends [infer H extends string[], ...infer T extends string[][]]
    ? Masks<T, X, [...Acc, RowMask<H, X>]>
    : Acc;

type Presence<M extends string[], Acc extends string = ""> =
  M extends [infer H extends string, ...infer T extends string[]]
    ? Presence<T, `${Acc}${H extends `${string}1${string}` ? "1" : "0"}`>
    : Acc;

type AreaIsRect<R extends string[][], X extends string, M extends string[] = Masks<R, X>> =
  Gappy<Presence<M>> extends true
    ? false
    : Extract<M[number], `${string}1${string}`> extends infer U extends string
      ? IsUnion<U> extends true
        ? false
        : Gappy<U> extends true ? false : true
      : never;

type NonRectAreas<R extends string[][], X extends string = Exclude<Cells<R>, ".">> =
  X extends unknown ? (AreaIsRect<R, X> extends true ? never : X) : never;

// ---------------------------------------------------------------------------
// Validators. Each returns `unknown` (ok) or a branded error object.
// ---------------------------------------------------------------------------

type Ok = unknown;

type TemplateCheck<N extends string, T, When, Rect extends boolean> =
  IsLiteral<T> extends false
    ? Ok
    : T extends string
      ? ParseTemplate<T> extends infer R extends string[][]
        ? R extends []
          ? { _emptyTemplate: true }
          : [Exclude<Cells<R>, N | ".">] extends [infer Bad]
            ? [Bad] extends [never]
              ? [FirstRaggedRow<R>] extends [infer Rg]
                ? [Rg] extends [never]
                  ? [Exclude<When, Cells<R>>] extends [infer M]
                    ? [M] extends [never]
                      ? Rect extends true
                        ? [NonRectAreas<R>] extends [infer NR]
                          ? [NR] extends [never] ? Ok : { _nonRectangularArea: NR }
                          : never
                        : Ok
                      : { _missingFromTemplate: M }
                    : never
                  : { _raggedRow: Rg }
                : never
              : { _unknownArea: Bad }
            : never
        : never
      : Ok;

type TrackCheck<Tracks, T, Kind extends "column" | "row"> =
  IsLiteral<Tracks> extends false
    ? Ok
    : IsLiteral<T> extends false
      ? Ok
      : Tracks extends string
        ? T extends string
          ? ParseTemplate<T> extends infer R extends string[][]
            ? (Kind extends "column" ? R[0]["length"] : R["length"]) extends infer Expected
              ? CountTracks<Tracks> extends infer Got
                ? number extends Got
                  ? Ok
                  : Got extends Expected
                    ? Ok
                    : Kind extends "column"
                      ? { _columnCountError: { expected: Expected; got: Got } }
                      : { _rowCountError: { expected: Expected; got: Got } }
                : never
              : never
            : never
          : Ok
        : Ok;

type KeysCheck<Obj, N extends string> =
  Obj extends object
    ? [Exclude<keyof Obj, N>] extends [infer Bad]
      ? [Bad] extends [never] ? Ok : { _unknownArea: Bad }
      : never
    : Ok;

type Get<O, K extends string> = O extends { readonly [P in K]?: infer V } ? V : undefined;
type Pick1<O, K extends string> = K extends keyof O ? O[K] : undefined;

type ValidateBreakpoint<N extends string, B, Base, Rect extends boolean> = {
  template?: TemplateCheck<N, Pick1<B, "template">, never, Rect>;
  // Effective template: breakpoint's own, else the base layout's.
  columns?: TrackCheck<
    Pick1<B, "columns">,
    Pick1<B, "template"> extends string ? Pick1<B, "template"> : Pick1<Base, "template">,
    "column"
  >;
  rows?: TrackCheck<
    Pick1<B, "rows">,
    Pick1<B, "template"> extends string ? Pick1<B, "template"> : Pick1<Base, "template">,
    "row"
  >;
  align?: KeysCheck<Pick1<B, "align">, N>;
};

type ValidateLayout<N extends string, L, Rect extends boolean> = {
  when?: unknown;
  unless?: unknown;
  template?: TemplateCheck<
    N,
    Pick1<L, "template">,
    Pick1<L, "when"> extends readonly (infer W)[] ? W : never,
    Rect
  >;
  columns?: TrackCheck<Pick1<L, "columns">, Pick1<L, "template">, "column">;
  rows?: TrackCheck<Pick1<L, "rows">, Pick1<L, "template">, "row">;
  align?: KeysCheck<Pick1<L, "align">, N>;
  breakpoints?: Pick1<L, "breakpoints"> extends infer BPs
    ? BPs extends object
      ? { [K in keyof BPs]: ValidateBreakpoint<N, BPs[K], L, Rect> }
      : Ok
    : never;
};

export type ValidateLayouts<N extends string, L extends readonly unknown[], Rect extends boolean> = {
  [I in keyof L]: ValidateLayout<N, L[I], Rect>;
};

// ---------------------------------------------------------------------------
// Input shapes (constraints give contextual typing => autocomplete)
// ---------------------------------------------------------------------------

export interface BreakpointIn<N extends string> {
  template?: string;
  columns?: string;
  rows?: string;
  align?: { readonly [K in N]?: AlignSpec };
}

export interface LayoutIn<N extends string> {
  template?: string;
  columns?: string;
  rows?: string;
  align?: { readonly [K in N]?: AlignSpec };
  when?: readonly N[];
  unless?: readonly N[];
  breakpoints?: { readonly [K in Breakpoint]?: BreakpointIn<N> };
}

export type Layout<A extends readonly string[]> = {
  areas: A;
  // Runtime would produce real values; the spike only cares about types.
};

export declare function defineLayout<
  const A extends readonly string[],
  const L extends readonly LayoutIn<AreaName<A>>[],
>(def: { areas: A; layouts: L & ValidateLayouts<AreaName<A>, L, false> }): Layout<A>;

/** Same, plus the rectangularity check. */
export declare function defineLayoutRect<
  const A extends readonly string[],
  const L extends readonly LayoutIn<AreaName<A>>[],
>(def: { areas: A; layouts: L & ValidateLayouts<AreaName<A>, L, true> }): Layout<A>;

/** Baseline: same input shape and key checks, no template parsing. */
export declare function defineLayoutPlain<
  const A extends readonly string[],
  const L extends readonly LayoutIn<AreaName<A>>[],
>(def: { areas: A; layouts: L }): Layout<A>;
