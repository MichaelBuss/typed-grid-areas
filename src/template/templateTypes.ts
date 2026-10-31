/**
 * Type-level parsing of text templates and track lists, mirroring
 * `parseTemplate` and `parseTracks` closely enough to catch mistakes at
 * compile time. Non-literal strings are never checked.
 *
 * These types run on every definition in a project, so they are written for
 * compile speed: tail-recursive, one pass over each string where possible.
 */

type Replace<
  S extends string,
  From extends string,
  To extends string,
  Done extends string = "",
> = S extends `${infer Before}${From}${infer After}`
  ? Replace<After, From, To, `${Done}${Before}${To}`>
  : `${Done}${S}`;

/** Splits on a separator, dropping empty pieces. */
type Split<
  S extends string,
  Separator extends string,
  Pieces extends Array<string> = [],
> = S extends `${infer Piece}${Separator}${infer Rest}`
  ? Split<Rest, Separator, Piece extends "" ? Pieces : [...Pieces, Piece]>
  : S extends ""
    ? Pieces
    : [...Pieces, S];

type AddRow<Rows extends Array<Array<string>>, Row extends Array<string>> = Row extends []
  ? Rows
  : [...Rows, Row];

type SplitRows<
  S extends string,
  Rows extends Array<Array<string>> = [],
> = S extends `${infer Row}/${infer Rest}`
  ? SplitRows<Rest, AddRow<Rows, Split<Row, " ">>>
  : AddRow<Rows, Split<S, " ">>;

/**
 * A template's cells: rows are separated by newlines or `/`, cells by
 * whitespace, and blank rows are skipped.
 */
export type ParseTemplate<T extends string> = SplitRows<
  Replace<Replace<Replace<T, "\n", "/">, "\t", " ">, "\r", " ">
>;

/** The area names in a cell (or union of cells): `"photo+badge"` -> `"photo" | "badge"`. */
type CellAreas<Cell extends string> = Cell extends `${infer First}+${infer Rest}`
  ? First | CellAreas<Rest>
  : Cell;

type Increment<Count extends Array<0>> = [...Count, 0];

/** The first row (1-based) whose cell count differs from the first row's. */
type RaggedRow<
  Rows extends Array<Array<string>>,
  Expected extends number,
  Index extends Array<0> = [],
> = Rows extends [infer Row extends Array<string>, ...infer Rest extends Array<Array<string>>]
  ? Row["length"] extends Expected
    ? RaggedRow<Rest, Expected, Increment<Index>>
    : { row: Increment<Index>["length"]; cells: Row["length"]; expected: Expected }
  : never;

/**
 * What's wrong with a parsed template, as a branded object, or `never` when
 * nothing is. Reports one problem per template.
 */
type TemplateProblem<Rows extends Array<Array<string>>, TAreaName extends string> = [
  Exclude<CellAreas<Rows[number][number]>, TAreaName | ".">,
] extends [infer Unknown]
  ? [Unknown] extends [never]
    ? Rows extends [infer First extends Array<string>, ...Array<Array<string>>]
      ? [RaggedRow<Rows, First["length"]>] extends [infer Ragged]
        ? [Ragged] extends [never]
          ? never
          : { _raggedRow: Ragged }
        : never
      : never
    : { _unknownArea: Unknown }
  : never;

type Occurrences<
  S extends string,
  Char extends string,
  Found extends Array<0> = [],
> = S extends `${string}${Char}${infer Rest}` ? Occurrences<Rest, Char, Increment<Found>> : Found;

type DropFirst<T extends Array<0>, Count extends Array<0>> = Count extends [
  0,
  ...infer CountRest extends Array<0>,
]
  ? T extends [0, ...infer Rest extends Array<0>]
    ? DropFirst<Rest, CountRest>
    : []
  : T;

/** Counts tokens that start outside parentheses. */
type CountTracks<
  Tokens extends Array<string>,
  Depth extends Array<0> = [],
  Count extends Array<0> = [],
> = Tokens extends [infer Token extends string, ...infer Rest extends Array<string>]
  ? CountTracks<
      Rest,
      DropFirst<[...Depth, ...Occurrences<Token, "(">], Occurrences<Token, ")">>,
      Depth extends [] ? Increment<Count> : Count
    >
  : Count["length"];

type StripLineNames<S extends string> = S extends `${infer Before}[${string}]${infer After}`
  ? StripLineNames<`${Before} ${After}`>
  : S;

/**
 * How many tracks a track list has, or `never` when that can't be told from
 * its type (a non-literal string, or one using `repeat(`).
 */
export type TrackCount<S extends string> = string extends S
  ? never
  : S extends `${string}repeat(${string}`
    ? never
    : CountTracks<
        Split<StripLineNames<Replace<Replace<Replace<S, "\n", " ">, "\t", " ">, "\r", " ">>, " ">
      >;

type TrackProblem<Tracks, Expected extends number, Brand extends string> = Tracks extends string
  ? [TrackCount<Tracks>] extends [infer Got]
    ? [Got] extends [never]
      ? unknown
      : Got extends Expected
        ? unknown
        : { [K in Brand]: { expected: Expected; got: Got } }
    : unknown
  : unknown;

/**
 * The compile-time checks for one arrangement (a layout or a breakpoint):
 * the property types an arrangement must also satisfy, which carry a branded
 * error on the offending property when something is wrong.
 */
export type ArrangementCheck<Arrangement, TAreaName extends string> = Arrangement extends {
  template: infer Template extends string;
}
  ? string extends Template
    ? unknown
    : ParseTemplate<Template> extends infer Rows extends Array<Array<string>>
      ? [TemplateProblem<Rows, TAreaName>] extends [infer Problem]
        ? [Problem] extends [never]
          ? Rows extends [infer First extends Array<string>, ...Array<Array<string>>]
            ? {
                rows?: TrackProblem<
                  Arrangement extends { rows: infer R } ? R : undefined,
                  Rows["length"],
                  "_rowCountError"
                >;
                columns?: TrackProblem<
                  Arrangement extends { columns: infer C } ? C : undefined,
                  First["length"],
                  "_columnCountError"
                >;
              }
            : unknown
          : { template: Problem }
        : unknown
      : unknown
  : unknown;
