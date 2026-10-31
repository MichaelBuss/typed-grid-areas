import { defineLayout } from "../defineLayout.ts";
import { gridId } from "../engine/gridId.ts";
import { generateCss } from "../generateCss.ts";
import { gridStyleTags, insertGridStyle, insertServerGridStyle } from "./index.ts";

const card = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info" }],
});

const list = defineLayout({
  areas: ["header", "items"],
  layouts: [{ template: "header / items" }],
});

/** A page whose `<head>` holds `head`, as a server would have rendered it. */
function page(head = ""): Document {
  const page = document.implementation.createHTMLDocument();
  page.head.innerHTML = head;
  return page;
}

/** What's in a page's `<head>`, one short label per element. */
function headOf(page: Document): Array<string> {
  return Array.from(page.head.children, element => {
    const grid = element.getAttribute("data-typed-grid-areas");
    if (grid !== null) {
      return `grid ${grid}`;
    }
    return element.tagName === "LINK" ? `link ${element.getAttribute("rel")}` : element.localName;
  });
}

describe("insertGridStyle", () => {
  it("puts a definition's CSS in <head>, once however often it's inserted", () => {
    const target = page();

    const first = insertGridStyle(target, card);
    const second = insertGridStyle(target, card);

    expect(second).toBe(first);
    expect(headOf(target)).toEqual([`grid ${gridId(card)}`]);
    expect(first.textContent).toBe(generateCss(card));
  });

  it("reuses a tag the server already rendered", () => {
    const target = page(gridStyleTags([card]));
    const rendered = target.head.firstElementChild;

    expect(insertGridStyle(target, card)).toBe(rendered);
    expect(headOf(target)).toEqual([`grid ${gridId(card)}`]);
  });

  it("goes ahead of the page's other styles, so its cascade layer is declared first", () => {
    const target = page(
      `<meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>.app {}</style>`,
    );

    insertGridStyle(target, card);

    expect(headOf(target)).toEqual(["meta", `grid ${gridId(card)}`, "link stylesheet", "style"]);
    expect(target.styleSheets[1]?.cssRules[0]?.cssText).toBe(".app { }");
    expect((target.styleSheets[0]?.cssRules[0] as CSSLayerBlockRule).name).toBe("typed-grid-areas");
  });

  it("goes after earlier grids' tags, in the order definitions arrive", () => {
    const target = page(`${gridStyleTags([card])}<style>.app {}</style>`);

    insertGridStyle(target, list);

    expect(headOf(target)).toEqual([`grid ${gridId(card)}`, `grid ${gridId(list)}`, "style"]);
  });

  it("goes at the end of <head> when the page has no other styles", () => {
    const target = page(`<meta charset="utf-8"><title>Page</title>`);

    insertGridStyle(target, card);

    expect(headOf(target)).toEqual(["meta", "title", `grid ${gridId(card)}`]);
  });
});

describe("insertServerGridStyle", () => {
  it("puts a definition's CSS where insertGridStyle would, once", () => {
    const target = page(
      `<meta charset="utf-8">${gridStyleTags([card])}<link rel="Stylesheet" href="app.css">`,
    );

    const first = insertServerGridStyle(target, list);
    const second = insertServerGridStyle(target, list);

    expect(second).toBe(first);
    expect(headOf(target)).toEqual([
      "meta",
      `grid ${gridId(card)}`,
      `grid ${gridId(list)}`,
      "link Stylesheet",
    ]);
  });

  it("serializes as gridStyleTags renders it, with CSS that can't close its tag", () => {
    const hostile = defineLayout({
      areas: ["a"],
      layouts: [{ template: "a", columns: "1fr/*</style><script>alert(1)</script>*/" }],
    });
    const target = page();

    insertServerGridStyle(target, hostile);

    expect(target.head.innerHTML).toBe(gridStyleTags([hostile]));
  });
});
