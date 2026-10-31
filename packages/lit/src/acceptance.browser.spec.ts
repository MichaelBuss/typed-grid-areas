/**
 * Acceptance for issue #4, with Lit's mounting: the two target designs,
 * rendered with real content through the Lit adapter inside a LitElement's
 * shadow root, place every slot correctly in every combination of their
 * optional areas. The checks themselves are shared by every adapter.
 */
import {
  describeIdCard,
  describePreferenceCard,
  idCardGrid,
  idCardImages,
  type IdCardOptional,
  type PreferenceCardOptional,
  preferenceCardGrid,
  preferenceContentGrid,
} from "@typed-grid-areas/acceptance";
import { html, nothing } from "lit";
import { createGrid } from "./index.ts";
import { defineHost, mountElement } from "./test-utils/mount.ts";

/**
 * Renders a design inside a LitElement's shadow root, in a wrapper `width` px
 * wide, and returns its outermost element.
 */
async function mount<TOptional extends string>(
  design: (has: (area: TOptional) => boolean) => unknown,
  present: ReadonlyArray<TOptional>,
  width: number,
): Promise<HTMLElement> {
  const wrapper = document.createElement("div");
  wrapper.style.width = `${width}px`;
  const host = await mountElement(
    defineHost(() => design(area => present.includes(area))),
    wrapper,
  );
  const root = host.shadowRoot.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mount: nothing was rendered");
  }
  return root;
}

const PreferenceContent = createGrid(preferenceContentGrid);
const PreferenceCard = createGrid(preferenceCardGrid, { nest: { content: PreferenceContent } });

const preference = (has: (area: PreferenceCardOptional) => boolean) =>
  PreferenceCard(html`
    ${
      has("input")
        ? html`<label
            data-area=${PreferenceCard.input}
            style="display: flex; align-items: center; padding: 16px"
          >
            <input type="checkbox" aria-label="Weekly digest" />
          </label>`
        : nothing
    }
    ${PreferenceCard.content(
      html`
        ${
          has("icon")
            ? html`<div data-area=${PreferenceCard.content.icon}>
                <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>`
            : nothing
        }
        <div
          data-area=${PreferenceCard.content.information}
          style="display: flex; flex-direction: column; gap: 4px"
        >
          <div style="display: flex; align-items: center; gap: 8px">
            <strong data-part="title">Weekly digest</strong>
            <span data-part="titleTag">New</span>
          </div>
          <p data-part="description" style="margin: 0">
            A summary of everything that happened in your projects this week.
          </p>
        </div>
        ${
          has("cardTag")
            ? html`<div data-area=${PreferenceCard.content.cardTag}><span>Recommended</span></div>`
            : nothing
        }
        ${
          has("children")
            ? html`<div data-area=${PreferenceCard.content.children}>
                <button type="button">Choose a day</button>
              </div>`
            : nothing
        }
      `,
      { style: "gap: 8px; padding: 16px" },
    )}
  `);

const IdCard = createGrid(idCardGrid);
const fill = "width: 100%; height: 100%; object-fit: cover";

const id = (has: (area: IdCardOptional) => boolean) =>
  IdCard(html`
    <img data-area=${IdCard.photo} src=${idCardImages.photo} alt="" style=${fill} />
    ${has("logo") ? html`<div data-area=${IdCard.logo} style="padding: 4px">ACME</div>` : nothing}
    ${
      has("badge")
        ? html`<div data-area=${IdCard.badge} style="padding: 4px; text-align: right">
            <span aria-label="Verified">✓</span>
          </div>`
        : nothing
    }
    <div data-area=${IdCard.identity} style="padding: 4px"><strong>Ada Lovelace</strong></div>
    <div data-area=${IdCard.details} style="padding: 4px">Analyst, Engine Division</div>
    ${
      has("qr")
        ? html`<img
            data-area=${IdCard.qr}
            src=${idCardImages.qr}
            alt="QR code"
            style="${fill}; object-fit: contain"
          />`
        : nothing
    }
  `);

describePreferenceCard((present, width) => mount(preference, present, width));
describeIdCard((present, width) => mount(id, present, width));
