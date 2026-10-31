// PROTOTYPE (issue #4) — Variant E: ID card, layering written into the template's cells.
// `photo+badge` = photo owns the cell, badge sits on top of it. Corners are cells, so the
// picture shows where things go; align only fine-tunes inside a cell.
import { defineLayout } from "../engine/defineLayout";
import { Badge, Details, Identity, IdParts, Logo, Photo, Qr } from "../idParts";

// #region definition
const IdCardGrid = defineLayout({
  name: "e-id",
  areas: ["photo", "identity", "details", "logo?", "qr?", "badge?"],
  layouts: [
    {
      template: `
        photo+logo     photo+badge
        photo          photo
        photo+identity photo+identity
        details        qr`,
      rows: "auto minmax(96px, 1fr) auto auto",
      columns: "minmax(0, 1fr) auto",
      align: { logo: { justify: "start" }, badge: { justify: "end" }, qr: { align: "end" } },
      breakpoints: {
        "@md": {
          template: `
            photo+badge identity logo
            photo       details  qr`,
          rows: "auto 1fr",
          columns: "160px minmax(0, 1fr) auto",
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
