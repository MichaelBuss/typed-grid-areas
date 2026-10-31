/**
 * Acceptance for issue #4, with Solid's mounting: the two target designs,
 * rendered with real content through the Solid adapter, place every slot
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
import { JSX, Show } from "solid-js";
import { render } from "solid-js/web";
import { createGridComponent } from "./index.tsx";

const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
});

/** Renders a design into a wrapper `width` px wide and returns its outermost element. */
async function mount(design: () => JSX.Element, width: number): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(() => <div style={{ width: `${width}px` }}>{design()}</div>, container);
  disposers.push(() => {
    dispose();
    container.remove();
  });
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

function Preference(props: { present: ReadonlyArray<PreferenceCardOptional> }) {
  const has = (area: PreferenceCardOptional) => props.present.includes(area);
  return (
    <PreferenceCard>
      <Show when={has("input")}>
        <PreferenceCard.input
          as="label"
          style={{ display: "flex", "align-items": "center", padding: "16px" }}
        >
          <input type="checkbox" aria-label="Weekly digest" />
        </PreferenceCard.input>
      </Show>
      <PreferenceCard.content style={{ gap: "8px", padding: "16px" }}>
        <Show when={has("icon")}>
          <PreferenceCard.content.icon>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </PreferenceCard.content.icon>
        </Show>
        <PreferenceCard.content.information
          style={{ display: "flex", "flex-direction": "column", gap: "4px" }}
        >
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            <strong data-part="title">Weekly digest</strong>
            <span data-part="titleTag">New</span>
          </div>
          <p data-part="description" style={{ margin: "0" }}>
            A summary of everything that happened in your projects this week.
          </p>
        </PreferenceCard.content.information>
        <Show when={has("cardTag")}>
          <PreferenceCard.content.cardTag>
            <span>Recommended</span>
          </PreferenceCard.content.cardTag>
        </Show>
        <Show when={has("children")}>
          <PreferenceCard.content.children>
            <button type="button">Choose a day</button>
          </PreferenceCard.content.children>
        </Show>
      </PreferenceCard.content>
    </PreferenceCard>
  );
}

const IdCard = createGridComponent(idCardGrid);
const fill = { width: "100%", height: "100%", "object-fit": "cover" } as const;

function Id(props: { present: ReadonlyArray<IdCardOptional> }) {
  const has = (area: IdCardOptional) => props.present.includes(area);
  return (
    <IdCard>
      <IdCard.photo as="img" src={idCardImages.photo} alt="" style={fill} />
      <Show when={has("logo")}>
        <IdCard.logo style={{ padding: "4px" }}>ACME</IdCard.logo>
      </Show>
      <Show when={has("badge")}>
        <IdCard.badge style={{ padding: "4px", "text-align": "right" }}>
          <span aria-label="Verified">✓</span>
        </IdCard.badge>
      </Show>
      <IdCard.identity style={{ padding: "4px" }}>
        <strong>Ada Lovelace</strong>
      </IdCard.identity>
      <IdCard.details style={{ padding: "4px" }}>Analyst, Engine Division</IdCard.details>
      <Show when={has("qr")}>
        <IdCard.qr
          as="img"
          src={idCardImages.qr}
          alt="QR code"
          style={{ ...fill, "object-fit": "contain" }}
        />
      </Show>
    </IdCard>
  );
}

describePreferenceCard((present, width) => mount(() => <Preference present={present} />, width));
describeIdCard((present, width) => mount(() => <Id present={present} />, width));
