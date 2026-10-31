/**
 * Compile-time checks of grid template functions. Each `@ts-expect-error`
 * must stay an error, so `just typecheck` fails if a check goes missing.
 */
import { html } from "lit";
import { createRef } from "lit/directives/ref.js";
import { defineLayout } from "typed-grid-areas";
import { createGrid, gridStyles } from "./index.ts";

const Content = createGrid(
  defineLayout({
    areas: ["icon?", "information"],
    layouts: [{ template: "icon information" }],
  }),
);

const Card = createGrid(
  defineLayout({
    areas: ["input?", "content"],
    layouts: [{ template: "input content" }],
  }),
  { nest: { content: Content } },
);

describe("grid type checks", () => {
  it("accepts the definition's areas, and a nested grid's areas through its area", () => {
    const input: "input" = Card.input;
    const icon: "icon" = Card.content.icon;
    void [input, icon, gridStyles(Card)];
    void Card(
      html`
        <label data-area=${Card.input}></label>
        ${Card.content(html`<span data-area=${Card.content.information}></span>`, {
          class: "p-4",
          style: { padding: "8px" },
          ref: createRef<HTMLDivElement>(),
        })}
      `,
      { class: "card", style: "gap: 4px", ref: (element?: Element) => void element },
    );
  });

  it("rejects an area the definition doesn't have", () => {
    // @ts-expect-error -- `nope` is not an area of Card
    void html`<div data-area=${Card.nope}></div>`;
  });

  it("rejects a nested grid's area that it doesn't have", () => {
    // @ts-expect-error -- `input` is an area of Card, not of the nested content grid
    void html`<div data-area=${Card.content.input}></div>`;
  });

  it("rejects nesting into an area the definition doesn't have", () => {
    createGrid(
      defineLayout({ areas: ["input", "content"], layouts: [{ template: "input content" }] }),
      // @ts-expect-error -- `body` is not an area
      { nest: { body: Content } },
    );
  });

  it("rejects grid options Lit can't render on the grid", () => {
    // @ts-expect-error -- only `class`, `style` and `ref`; other attributes go through `ref`
    void Card(html``, { id: "card" });
  });
});
