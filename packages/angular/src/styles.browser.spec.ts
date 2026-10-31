import { Component, CSP_NONCE } from "@angular/core";
import { defineLayout } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE, gridMarkup } from "typed-grid-areas/adapter";
import { render } from "vitest-browser-angular";
import { createGrid, TgaArea, TgaGrid } from "./index.ts";

/** The style tags in <head> carrying a definition's CSS. */
function stylesOf(definition: Parameters<typeof gridMarkup>[0]): Array<HTMLStyleElement> {
  const { id } = gridMarkup(definition);
  return Array.from(
    document.head.querySelectorAll<HTMLStyleElement>(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`),
  );
}

describe("a definition's CSS", () => {
  it("is in <head> exactly once, however many instances render", async () => {
    const listGrid = defineLayout({
      areas: ["header", "items"],
      layouts: [{ template: "header / items" }],
    });
    const List = createGrid(listGrid);

    @Component({
      imports: [TgaGrid, TgaArea],
      template: `
        @for (list of lists; track list) {
          <div [tgaGrid]="List">
            <h2 [tgaArea]="List.header">{{ list }}</h2>
            <ul [tgaArea]="List.items"></ul>
          </div>
        }
      `,
    })
    class Lists {
      protected readonly List = List;
      protected readonly lists = ["a", "b", "c"];
    }

    await render(Lists);
    const styles = stylesOf(listGrid);
    expect(styles).toHaveLength(1);
    expect(styles[0]!.textContent).toBe(gridMarkup(listGrid).css);
  });

  it("carries the app's CSP nonce when it provides one", async () => {
    const noncedGrid = defineLayout({ areas: ["main"], layouts: [{ template: "main" }] });
    const Nonced = createGrid(noncedGrid);

    @Component({
      imports: [TgaGrid, TgaArea],
      template: `<div [tgaGrid]="Nonced"><main [tgaArea]="Nonced.main"></main></div>`,
    })
    class Page {
      protected readonly Nonced = Nonced;
    }

    await render(Page, { providers: [{ provide: CSP_NONCE, useValue: "r4nd0m" }] });
    const styles = stylesOf(noncedGrid);
    expect(styles).toHaveLength(1);
    expect(styles[0]!.nonce).toBe("r4nd0m");
  });
});
