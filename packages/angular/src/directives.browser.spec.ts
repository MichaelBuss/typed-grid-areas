import { Component } from "@angular/core";
import { defineLayout } from "typed-grid-areas";
import { gridMarkup } from "typed-grid-areas/adapter";
import { render } from "vitest-browser-angular";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "./index.ts";

const cardGrid = defineLayout({
  areas: ["icon?", "info"],
  layouts: [{ template: "icon info" }],
});
const Card = createGrid(cardGrid);

@Component({ selector: "app-info", template: "<ng-content />" })
class Info {}

describe("the grid and slot directives", () => {
  it("mark the grid with its id and each slot, native element or component host, with its area", async () => {
    @Component({
      imports: [TgaGrid, TgaArea, Info],
      template: `
        <section [tgaGrid]="Card" class="card">
          <span [tgaArea]="Card.icon">★</span>
          <app-info [tgaArea]="Card.info">Information</app-info>
        </section>
      `,
    })
    class Example {
      protected readonly Card = Card;
    }

    const { container } = await render(Example);
    const grid = container.querySelector("section")!;
    expect(grid.getAttribute("data-grid-id")).toBe(gridMarkup(cardGrid).id);
    expect(grid.className).toBe("card");
    expect(Array.from(grid.children, child => child.getAttribute("data-area"))).toEqual([
      "icon",
      "info",
    ]);
    expect(grid.children[1]!.localName).toBe("app-info");
  });

  describe("a nested grid", () => {
    const contentGrid = defineLayout({
      areas: ["icon?", "title"],
      layouts: [{ template: "title", breakpoints: { "@sm": { template: "icon title" } } }],
    });
    const panelGrid = defineLayout({ areas: ["body"], layouts: [{ template: "body" }] });
    const Outer = createGrid(
      defineLayout({ areas: ["panel", "content"], layouts: [{ template: "panel content" }] }),
      { nest: { panel: createGrid(panelGrid), content: createGrid(contentGrid) } },
    );

    @Component({
      imports: [TgaGrid, TgaArea, TgaSizeContainer],
      template: `
        <div [tgaGrid]="Outer">
          <div [tgaGrid]="Outer.panel" class="panel">
            <p [tgaArea]="Outer.panel.body">Body</p>
          </div>
          <div tgaSizeContainer class="frame">
            <div [tgaGrid]="Outer.content" class="content p-4">
              <h2 [tgaArea]="Outer.content.title">Title</h2>
            </div>
          </div>
        </div>
      `,
    })
    class Nested {
      protected readonly Outer = Outer;
    }

    it("carries the outer area itself when it has no size container", async () => {
      const { container } = await render(Nested);
      const panel = container.querySelector(".panel")!;
      expect(panel.getAttribute("data-area")).toBe("panel");
      expect(panel.getAttribute("data-grid-id")).toBe(gridMarkup(panelGrid).id);
    });

    it("sits in a size container that carries the outer area, with the user's classes on the grid", async () => {
      const { container } = await render(Nested);
      const frame = container.querySelector<HTMLElement>(".frame")!;
      const content = frame.querySelector(":scope > .content")!;
      const { id } = gridMarkup(contentGrid);
      expect(frame.getAttribute("data-area")).toBe("content");
      expect(frame.style.containerType).toBe("inline-size");
      expect(frame.style.containerName).toBe(`grid-${id}`);
      expect(frame.style.display).toBe("grid");
      expect(frame.style.gridTemplateColumns).toBe("minmax(0px, 1fr)");
      expect(content.hasAttribute("data-area")).toBe(false);
      expect(content.getAttribute("data-grid-id")).toBe(id);
      expect(content.className).toBe("content p-4");
    });
  });
});
