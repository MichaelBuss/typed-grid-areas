import { defineLayout } from "../defineLayout.ts";
import { generateCss } from "../generateCss.ts";
import { gridId } from "../engine/gridId.ts";
import { GRID_STYLE_ATTRIBUTE, gridStyleTags } from "./index.ts";

const card = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info" }],
});

const list = defineLayout({
  areas: ["header", "items"],
  layouts: [{ template: "header / items" }],
});

/** Parses HTML the way a browser parses it inside `<head>`. */
function parseHead(html: string): HTMLHeadElement {
  return new DOMParser().parseFromString(`<!doctype html><head>${html}</head>`, "text/html").head;
}

describe("gridStyleTags", () => {
  it("identifies each definition's style tag by its grid id", () => {
    expect(GRID_STYLE_ATTRIBUTE).toBe("data-typed-grid-areas");
  });

  it("renders one style tag per definition, carrying its CSS", () => {
    const head = parseHead(gridStyleTags([card, list]));

    const tags = Array.from(head.children);
    expect(tags.map(tag => tag.outerHTML.split(">")[0] + ">")).toEqual([
      `<style data-typed-grid-areas="${gridId(card)}">`,
      `<style data-typed-grid-areas="${gridId(list)}">`,
    ]);
    expect(tags.map(tag => tag.textContent)).toEqual([generateCss(card), generateCss(list)]);
  });

  it("renders a definition once, however often it's given", () => {
    expect(parseHead(gridStyleTags([card, list, card])).children).toHaveLength(2);
  });

  it("keeps CSS containing </style> inside its tag", () => {
    const hostile = defineLayout({
      areas: ["a"],
      layouts: [{ template: "a", columns: "1fr/*</style><script>alert(1)</script>*/" }],
    });

    const head = parseHead(gridStyleTags([hostile]));

    expect(head.querySelector("script")).toBeNull();
    expect(head.children).toHaveLength(1);
    expect(gridStyleTags([hostile])).not.toMatch(/<\/style[^>]*>.*<\/style>/is);
  });
});
