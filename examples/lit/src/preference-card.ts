import { css, html, LitElement, nothing } from "lit";
import { createGrid, gridStyles } from "@typed-grid-areas/lit";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

const Content = createGrid(preferenceContentGrid);
const Card = createGrid(preferenceCardGrid, { nest: { content: Content } });

/** Optional areas are absent when their slot isn't rendered: leave out an attribute to see the layout change. */
export class PreferenceCard extends LitElement {
  static styles = [
    gridStyles(Card),
    css`
      :host {
        display: block;
      }
      .card {
        border: 1px solid #ccc;
        border-radius: 0.75rem;
        overflow: hidden;
      }
      .panel {
        padding: 1rem;
      }
      .input {
        display: flex;
        align-items: center;
        border-right: 1px solid #ccc;
      }
      .content {
        gap: 0.5rem;
      }
      .tag {
        padding: 0 0.5rem;
        border-radius: 999px;
        background: #e0e7ff;
        font-size: 0.75rem;
      }
    `,
  ];
  static properties = {
    selectable: { type: Boolean },
    icon: {},
    heading: {},
    tag: {},
    details: {},
  };
  declare selectable: boolean;
  declare icon?: string;
  declare heading: string;
  declare tag?: string;
  declare details?: string;

  constructor() {
    super();
    this.selectable = false;
    this.heading = "";
  }

  render() {
    const { icon, tag, details } = this;
    // Misspell an area, say Card.content.iconn, and `npm run typecheck` reports it.
    return Card(
      html`
        ${
          this.selectable
            ? html`<label data-area=${Card.input} class="panel input">
                <input type="checkbox" checked aria-label=${this.heading} />
              </label>`
            : nothing
        }
        ${Card.content(
          html`
            ${icon ? html`<span data-area=${Card.content.icon}>${icon}</span>` : nothing}
            <div data-area=${Card.content.information}>${this.heading}</div>
            ${tag ? html`<span data-area=${Card.content.cardTag} class="tag">${tag}</span>` : nothing}
            ${details ? html`<div data-area=${Card.content.children}>${details}</div>` : nothing}
          `,
          { class: "panel content" },
        )}
      `,
      { class: "card" },
    );
  }
}

customElements.define("preference-card", PreferenceCard);

declare global {
  interface HTMLElementTagNameMap {
    "preference-card": PreferenceCard;
  }
}
