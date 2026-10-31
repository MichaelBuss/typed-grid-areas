/**
 * The component the server-rendering specs render with `@lit-labs/ssr` and
 * hydrate in the browser. Plain TypeScript Node can run without a build
 * (type annotations only), since `renderOnServer.ts` runs it on stock Node.
 */
import { css, html, LitElement, nothing } from "lit";
import { defineLayout } from "typed-grid-areas";
import { createGrid, gridStyles } from "../index.ts";

export const contentGrid = defineLayout({
  areas: ["icon?", "title", "tag?"],
  layouts: [
    {
      template: "icon title tag",
      columns: "auto minmax(0, 1fr) auto",
      breakpoints: { "@sm": { template: "icon title / tag tag" } },
    },
  ],
});

export const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
});

const Content = createGrid(contentGrid);

const Card = createGrid(cardGrid, { nest: { content: Content } });

export const serverCardTag = "server-card";

export class ServerCard extends LitElement {
  static override styles = [
    gridStyles(Card),
    css`
      :host {
        display: block;
      }
      .gap {
        gap: 4px;
      }
    `,
  ];

  static override properties = { tagged: { type: Boolean } };

  declare tagged: boolean;

  constructor() {
    super();
    this.tagged = false;
  }

  override render() {
    return Card(
      html`
        <label data-area=${Card.input}><input type="checkbox" /></label>
        ${Card.content(
          html`
            <span data-area=${Card.content.icon}>★</span>
            <div data-area=${Card.content.title}>Title</div>
            ${this.tagged ? html`<span data-area=${Card.content.tag}>New</span>` : nothing}
          `,
          { class: "content" },
        )}
      `,
      { class: "gap" },
    );
  }
}

/** Registers `<server-card>`, once. */
export function defineServerCard(): void {
  if (customElements.get(serverCardTag) === undefined) {
    customElements.define(serverCardTag, ServerCard);
  }
}
