/**
 * Server rendering with `renderApplication`, as `@angular/ssr` runs it.
 */
import { Component } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideServerRendering, renderApplication } from "@angular/platform-server";
import { Window } from "happy-dom";
import { defineLayout } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE, gridMarkup } from "typed-grid-areas/adapter";
import { createGrid, TgaArea, TgaGrid } from "./index.ts";
import { bootstrap, cardGrid, contentGrid, listGrid, NONCE, PAGE } from "./test-utils/serverApp.ts";

let html: string;
let page: Document;
/** What was logged while rendering, by console method. */
let logged: Record<"warn" | "error" | "log" | "info", Array<unknown>>;

beforeAll(async () => {
  const methods = ["warn", "error", "log", "info"] as const;
  const spies = methods.map(method => vi.spyOn(console, method).mockImplementation(() => {}));
  try {
    html = await renderApplication(context => bootstrap(context, [provideServerRendering()]), {
      document: PAGE,
      url: "/",
    });
  } finally {
    logged = Object.fromEntries(
      methods.map((method, index) => [
        method,
        spies[index]!.mock.calls.map(([message]) => message),
      ]),
    ) as typeof logged;
    vi.restoreAllMocks();
  }
  page = new Window().document as unknown as Document;
  page.write(html);
});

describe("server rendering", () => {
  it("puts each definition's CSS in <head> once, with the nonce, ahead of the app's styles", () => {
    const styles = Array.from(page.head.querySelectorAll("style"));
    const grids = [listGrid, cardGrid, contentGrid].map(definition => gridMarkup(definition));
    expect(styles.map(style => style.getAttribute(GRID_STYLE_ATTRIBUTE))).toEqual([
      ...grids.map(grid => grid.id),
      null,
    ]);
    for (const [index, grid] of grids.entries()) {
      expect(styles[index]!.textContent).toBe(grid.css);
      expect(styles[index]!.getAttribute("nonce")).toBe(NONCE);
    }
  });

  it("renders the grid and slot attributes, with each nested grid in its size container", () => {
    const list = page.querySelector(".list")!;
    expect(list.getAttribute("data-grid-id")).toBe(gridMarkup(listGrid).id);
    const cards = Array.from(page.querySelectorAll(".card"));
    expect(cards).toHaveLength(2);
    expect(cards.map(card => card.parentElement!.getAttribute("data-area"))).toEqual([
      "items",
      "items",
    ]);

    const [selectable, plain] = cards as [Element, Element];
    expect(Array.from(selectable.children, child => child.getAttribute("data-area"))).toEqual([
      "input",
      "content",
    ]);
    expect(Array.from(plain.children, child => child.getAttribute("data-area"))).toEqual([
      "content",
    ]);

    const { id } = gridMarkup(contentGrid);
    const sizeContainer = plain.children[0]!;
    expect(sizeContainer.getAttribute("style")).toBe(
      `container-type: inline-size; container-name: grid-${id}; display: grid; ` +
        "grid-template-columns: minmax(0, 1fr);",
    );
    const content = sizeContainer.children[0]!;
    expect(content.getAttribute("data-grid-id")).toBe(id);
    expect(content.hasAttribute("data-area")).toBe(false);
    expect(content.className).toBe("content");
    expect(Array.from(content.children, child => child.getAttribute("data-area"))).toEqual([
      "icon",
      "title",
    ]);
  });

  it("keeps CSS containing </style> inside its tag", async () => {
    const Hostile = createGrid(
      defineLayout({
        areas: ["a"],
        layouts: [{ template: "a", columns: "1fr/*</style><script>alert(1)</script>*/" }],
      }),
    );

    @Component({
      selector: "app-root",
      imports: [TgaGrid, TgaArea],
      template: `<div [tgaGrid]="Hostile"><p [tgaArea]="Hostile.a">A</p></div>`,
    })
    class Page {
      protected readonly Hostile = Hostile;
    }

    const rendered = new Window().document as unknown as Document;
    rendered.write(
      await renderApplication(
        context => bootstrapApplication(Page, { providers: [provideServerRendering()] }, context),
        { document: PAGE, url: "/" },
      ),
    );
    expect(rendered.querySelector("script")).toBeNull();
    expect(rendered.head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}]`)).toHaveLength(1);
  });

  it("renders without errors", () => {
    expect(logged.error).toEqual([]);
  });

  it("logs no warnings, even about slots that are wired wrong", async () => {
    const Responsive = createGrid(
      defineLayout({
        areas: ["icon", "info"],
        layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
      }),
    );

    @Component({
      selector: "app-root",
      imports: [TgaGrid, TgaArea],
      template: `
        <div [tgaGrid]="Responsive">
          <span [tgaArea]="Responsive.icon">★</span>
          <span>stray</span>
        </div>
      `,
    })
    class Broken {
      protected readonly Responsive = Responsive;
    }

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const rendered = await renderApplication(
        context => bootstrapApplication(Broken, { providers: [provideServerRendering()] }, context),
        { document: PAGE, url: "/" },
      );
      expect(rendered).toContain("stray");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.restoreAllMocks();
    }
    expect([...logged.warn, ...logged.log, ...logged.info]).not.toContainEqual(
      expect.stringContaining("typed-grid-areas"),
    );
  });
});
