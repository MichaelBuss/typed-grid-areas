/**
 * Acceptance for issue #4, with Preact's mounting: the two target designs,
 * rendered with real content through the Preact adapter, place every slot
 * correctly in every combination of their optional areas. The checks
 * themselves are shared by every adapter.
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
import type { JSX } from "preact";
import { render } from "vitest-browser-preact";
import { createGridComponent } from "./index.ts";

/** Renders a design into a wrapper `width` px wide and returns its outermost element. */
async function mount(design: JSX.Element, width: number): Promise<HTMLElement> {
  const { container } = render(<div style={{ width: `${width}px` }}>{design}</div>);
  const root = container.firstElementChild?.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mount: nothing was rendered");
  }
  return root;
}

const PreferenceContent = createGridComponent(preferenceContentGrid);
const PreferenceCard = createGridComponent(preferenceCardGrid, {
  nest: { content: PreferenceContent },
});

function Preference({ present }: { present: ReadonlyArray<PreferenceCardOptional> }) {
  const has = (area: PreferenceCardOptional) => present.includes(area);
  return (
    <PreferenceCard>
      {has("input") && (
        <PreferenceCard.input
          asChild
          style={{ display: "flex", alignItems: "center", padding: "16px" }}
        >
          <label>
            <input type="checkbox" aria-label="Weekly digest" />
          </label>
        </PreferenceCard.input>
      )}
      <PreferenceCard.content style={{ gap: "8px", padding: "16px" }}>
        {has("icon") && (
          <PreferenceCard.content.icon>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </PreferenceCard.content.icon>
        )}
        <PreferenceCard.content.information
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <strong data-part="title">Weekly digest</strong>
            <span data-part="titleTag">New</span>
          </div>
          <p data-part="description" style={{ margin: "0" }}>
            A summary of everything that happened in your projects this week.
          </p>
        </PreferenceCard.content.information>
        {has("cardTag") && (
          <PreferenceCard.content.cardTag>
            <span>Recommended</span>
          </PreferenceCard.content.cardTag>
        )}
        {has("children") && (
          <PreferenceCard.content.children>
            <button type="button">Choose a day</button>
          </PreferenceCard.content.children>
        )}
      </PreferenceCard.content>
    </PreferenceCard>
  );
}

const IdCard = createGridComponent(idCardGrid);
const fill = { width: "100%", height: "100%", objectFit: "cover" } as const;

function Id({ present }: { present: ReadonlyArray<IdCardOptional> }) {
  const has = (area: IdCardOptional) => present.includes(area);
  return (
    <IdCard>
      <IdCard.photo asChild>
        <img src={idCardImages.photo} alt="" style={fill} />
      </IdCard.photo>
      {has("logo") && <IdCard.logo style={{ padding: "4px" }}>ACME</IdCard.logo>}
      {has("badge") && (
        <IdCard.badge style={{ padding: "4px", textAlign: "right" }}>
          <span aria-label="Verified">✓</span>
        </IdCard.badge>
      )}
      <IdCard.identity style={{ padding: "4px" }}>
        <strong>Ada Lovelace</strong>
      </IdCard.identity>
      <IdCard.details style={{ padding: "4px" }}>Analyst, Engine Division</IdCard.details>
      {has("qr") && (
        <IdCard.qr asChild>
          <img src={idCardImages.qr} alt="QR code" style={{ ...fill, objectFit: "contain" }} />
        </IdCard.qr>
      )}
    </IdCard>
  );
}

describePreferenceCard((present, width) => mount(<Preference present={present} />, width));
describeIdCard((present, width) => mount(<Id present={present} />, width));
