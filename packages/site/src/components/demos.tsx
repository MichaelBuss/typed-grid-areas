/**
 * The site's live demos: the acceptance package's PreferenceCard and ID
 * card definitions, rendered with the React adapter. On the Examples and
 * Try it pages, Astro renders them to static HTML on the server, with no
 * client directive, so nothing hydrates: the browser lays them out from the
 * generated CSS alone. The playground (`playground.tsx`) renders the same
 * cards in a React island.
 */
import type { CSSProperties, ReactNode } from "react";
import { createGridComponent } from "@typed-grid-areas/react";
import {
  idCardGrid,
  NARROW,
  preferenceCardGrid,
  preferenceContentGrid,
  WIDE,
} from "@typed-grid-areas/acceptance/designs";
import { combinations, playgroundDesigns, type PlaygroundDesignKey } from "../playground.ts";

const PreferenceContent = createGridComponent(preferenceContentGrid);
const Preference = createGridComponent(preferenceCardGrid, {
  nest: { content: PreferenceContent },
});
const Id = createGridComponent(idCardGrid);

/** Which of a design's optional areas a demo renders. */
export type Present<TArea extends string> = ReadonlyArray<TArea>;

const card: CSSProperties = {
  border: "1px solid var(--sl-color-gray-5)",
  borderRadius: "0.75rem",
  background: "var(--sl-color-bg)",
  color: "var(--sl-color-white)",
  overflow: "hidden",
};

/** One card of a demo: which optional areas it renders, at which width. */
export type DemoFrame<TArea extends string> = {
  label: string;
  width: number;
  present: Present<TArea>;
};

/** A card at a fixed width, labelled with it, so the page shows how the width changes the layout. */
function Frame({
  width,
  label,
  present,
  children,
}: {
  width: number;
  label: string;
  /** The optional areas present, for a matrix of combinations to mark each card with. */
  present?: Present<string>;
  children: ReactNode;
}) {
  return (
    <figure
      className="tga-demo"
      style={{ width, maxWidth: "100%", margin: 0 }}
      data-present={present?.join(",")}
    >
      {children}
      <figcaption
        style={{ fontSize: "0.8rem", color: "var(--sl-color-gray-3)", marginTop: "0.25rem" }}
      >
        {label} · {width}px
      </figcaption>
    </figure>
  );
}

/**
 * PreferenceCards side by side, in one React tree, so React writes each
 * definition's CSS on the page once.
 */
export function PreferenceCardDemos({
  frames,
}: {
  frames: ReadonlyArray<DemoFrame<"input" | "icon" | "cardTag" | "children">>;
}) {
  return (
    <div className="not-content tga-demos" data-demos="preference-card">
      {frames.map(({ label, width, present }) => (
        <Frame key={`${label}-${width}`} label={label} width={width}>
          <PreferenceCard present={present} />
        </Frame>
      ))}
    </div>
  );
}

/** ID cards side by side, in one React tree, so React writes the definition's CSS once. */
export function IdCardDemos({
  frames,
}: {
  frames: ReadonlyArray<DemoFrame<"logo" | "qr" | "badge">>;
}) {
  return (
    <div className="not-content tga-demos" data-demos="id-card">
      {frames.map(({ label, width, present }) => (
        <Frame key={`${label}-${width}`} label={label} width={width}>
          <IdCard present={present} />
        </Frame>
      ))}
    </div>
  );
}

/**
 * A design in every combination of its optional areas, each at the narrow
 * and the wide width, in one React tree, so React writes each definition's
 * CSS once.
 */
export function CombinationMatrix({ design }: { design: PlaygroundDesignKey }) {
  return (
    <div className="not-content tga-demos" data-matrix={design}>
      {design === "preference-card"
        ? matrix(playgroundDesigns[design].optional, present => (
            <PreferenceCard present={present} />
          ))
        : matrix(playgroundDesigns[design].optional, present => <IdCard present={present} />)}
    </div>
  );
}

function matrix<TArea extends string>(
  optional: Present<TArea>,
  card: (present: Present<TArea>) => ReactNode,
) {
  return combinations(optional).flatMap(present =>
    [NARROW, WIDE].map(width => (
      <Frame
        key={`${present.join()}-${width}`}
        label={present.length === 0 ? "No optional areas" : present.join(", ")}
        width={width}
        present={present}
      >
        {card(present)}
      </Frame>
    )),
  );
}

/** The PreferenceCard, with only the given optional areas present. */
export function PreferenceCard({
  present,
}: {
  present: Present<"input" | "icon" | "cardTag" | "children">;
}) {
  const has = (area: (typeof present)[number]) => present.includes(area);
  return (
    <Preference style={card} data-demo="preference-card">
      {has("input") && (
        <Preference.input asChild>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              padding: 16,
              borderRight: "1px solid var(--sl-color-gray-5)",
            }}
          >
            <input type="checkbox" defaultChecked aria-label="Weekly digest" />
          </label>
        </Preference.input>
      )}
      <Preference.content style={{ gap: 8, padding: 16 }}>
        {has("icon") && (
          <Preference.content.icon>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="var(--sl-color-accent)" />
            </svg>
          </Preference.content.icon>
        )}
        <Preference.content.information
          style={{ display: "flex", flexDirection: "column", gap: 4 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>Weekly digest</strong>
            <span style={{ fontSize: "0.75rem", color: "var(--sl-color-accent-high)" }}>New</span>
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--sl-color-gray-2)" }}>
            A summary of the week's activity, every Monday morning.
          </span>
        </Preference.content.information>
        {has("cardTag") && (
          <Preference.content.cardTag
            style={{
              fontSize: "0.75rem",
              padding: "0 0.5rem",
              borderRadius: "999px",
              background: "var(--sl-color-accent-low)",
              alignSelf: "start",
            }}
          >
            Recommended
          </Preference.content.cardTag>
        )}
        {has("children") && (
          <Preference.content.children asChild>
            <span style={{ fontSize: "0.875rem" }}>Sent on Mondays at 8:00</span>
          </Preference.content.children>
        )}
      </Preference.content>
    </Preference>
  );
}

const corner: CSSProperties = {
  margin: 8,
  padding: "0 0.4rem",
  borderRadius: 4,
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "rgb(255 255 255 / 0.85)",
  color: "#1b1b1f",
  justifySelf: "start",
  alignSelf: "start",
};

/** The ID card, with only the given optional areas present. */
export function IdCard({ present }: { present: Present<"logo" | "qr" | "badge"> }) {
  const has = (area: (typeof present)[number]) => present.includes(area);
  return (
    <Id style={card} data-demo="id-card">
      <Id.photo
        aria-label="Photo"
        style={{ background: "linear-gradient(135deg, #3b6ea8, #8a4fa3)", minHeight: 0 }}
      />
      {has("logo") && <Id.logo style={corner}>ACME</Id.logo>}
      {has("badge") && (
        <Id.badge style={{ ...corner, justifySelf: "end" }} aria-label="Verified">
          ✓
        </Id.badge>
      )}
      <Id.identity style={{ padding: "0 8px", alignSelf: "center" }}>
        <strong className="tga-identity-name">Ada Lovelace</strong>
      </Id.identity>
      <Id.details style={{ padding: "0 8px", alignSelf: "center", fontSize: "0.875rem" }}>
        Analyst, Engine Team
      </Id.details>
      {has("qr") && (
        <Id.qr
          aria-label="QR code"
          style={{
            margin: 8,
            background:
              "repeating-conic-gradient(var(--sl-color-white) 0 25%, var(--sl-color-bg) 0 50%) 0 0 / 8px 8px",
          }}
        />
      )}
    </Id>
  );
}
