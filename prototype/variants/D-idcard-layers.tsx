// PROTOTYPE (issue #4) — Variant D: ID card, layering by naming the area underneath.
// `layers: { badge: "photo" }` puts badge over the whole photo; `align` pins it to a corner.
import { defineLayout } from "../engine/defineLayout";
import { Badge, Details, Identity, IdParts, Logo, Photo, Qr } from "../idParts";

// #region definition
const IdCardGrid = defineLayout({
  name: "d-id",
  areas: ["photo", "identity", "details", "logo?", "qr?", "badge?"],
  layouts: [
    {
      template: `
        photo   photo
        details qr`,
      rows: "minmax(160px, auto) auto",
      columns: "minmax(0, 1fr) auto",
      layers: { logo: "photo", badge: "photo", identity: "photo" },
      align: {
        logo: { justify: "start", align: "start" },
        badge: { justify: "end", align: "start" },
        identity: { align: "end" },
        qr: { align: "end" },
      },
      breakpoints: {
        "@md": {
          template: `
            photo identity logo
            photo details  qr`,
          rows: "auto 1fr",
          columns: "160px minmax(0, 1fr) auto",
          layers: { badge: "photo" },
          align: { badge: { justify: "end", align: "start" }, qr: { align: "end" } },
        },
      },
    },
  ],
});
// #endregion

// #region render
export function IdCard(parts: IdParts) {
  return (
    <IdCardGrid className="id-card">
      <IdCardGrid.photo>
        <Photo />
      </IdCardGrid.photo>
      <IdCardGrid.identity>
        <Identity />
      </IdCardGrid.identity>
      <IdCardGrid.details>
        <Details />
      </IdCardGrid.details>
      {parts.logo ? (
        <IdCardGrid.logo>
          <Logo />
        </IdCardGrid.logo>
      ) : null}
      {parts.qr ? (
        <IdCardGrid.qr>
          <Qr />
        </IdCardGrid.qr>
      ) : null}
      {parts.badge ? (
        <IdCardGrid.badge>
          <Badge />
        </IdCardGrid.badge>
      ) : null}
    </IdCardGrid>
  );
}
// #endregion

export const grids = (IdCardGrid as unknown as { grids: [] }).grids;
