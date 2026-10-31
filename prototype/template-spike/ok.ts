import { defineLayout, defineLayoutRect, type CountTracks, type ParseTemplate } from "./lib";

// The planned example from the brief must compile cleanly.
export const ContentGrid = defineLayout({
  areas: ["icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: `
        icon        cardTag
        information information
        children    children`,
      columns: "min-content minmax(0, 1fr)",
      rows: "auto auto auto",
      align: { cardTag: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: "icon information cardTag / children children children",
          columns: "min-content minmax(0, 1fr) auto",
        },
      },
    },
    { unless: ["cardTag"], template: "icon information / children children" },
    { when: ["icon"], template: "icon . / children children", columns: "fit-content( 20px ) calc( 1fr - (2 * 4px) )" },
  ],
});

// Rect variant accepts rectangular spans.
export const Rect = defineLayoutRect({
  areas: ["a", "b", "c"],
  layouts: [{ template: "a a b / a a b / c c c" }],
});

// repeat() is not countable statically -> check is skipped, not a false error.
export const Rep = defineLayout({
  areas: ["a", "b"],
  layouts: [{ template: "a b", columns: "repeat(2, 1fr)" }],
});

// Non-literal strings fall back to no checking.
declare const dyn: string;
export const Dyn = defineLayout({ areas: ["a"], layouts: [{ template: dyn, columns: dyn }] });

// Sanity asserts on the parsers.
type Expect<T extends true> = T;
type Eq<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
export type _t1 = Expect<Eq<ParseTemplate<"\n  a  b\n\tc   .\n  ">, [["a", "b"], ["c", "."]]>>;
export type _t2 = Expect<Eq<ParseTemplate<"a b/ c d /e f">, [["a", "b"], ["c", "d"], ["e", "f"]]>>;
export type _t3 = Expect<Eq<CountTracks<"min-content minmax(0, 1fr)  auto">, 3>>;
export type _t4 = Expect<Eq<CountTracks<"minmax( 0 , calc(1fr - ( 2px )) ) 1fr">, 2>>;
export type _t5 = Expect<Eq<CountTracks<"repeat(3, 1fr)">, number>>;
