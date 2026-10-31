// PROTOTYPE (issue #4) — Variant C: one flat grid for the whole card, derived layouts.
// Same definition style as B, but no nesting: every part is an area of the card itself.
// The cost shows up in the chrome: the input panel has to bleed out of the card's padding.
import { defineLayout } from "../engine/defineLayout";
import { Checkbox, ExtraContent, IconBox, Information, Parts, Tag } from "../parts";

// #region definition
const CardGrid = defineLayout({
  name: "c-card",
  areas: ["input?", "icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: `
        input icon        cardTag
        input information information
        input children    children`,
      columns: "auto min-content minmax(0, 1fr)",
      align: { cardTag: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: `
            input icon     information cardTag
            input children children    children`,
          columns: "auto min-content minmax(0, 1fr) auto",
        },
      },
    },
    // Overrides: keep a lone icon or tag beside the information at every width.
    {
      unless: ["cardTag"],
      template: "input icon information / input children children",
      columns: "auto min-content minmax(0, 1fr)",
    },
    {
      unless: ["icon"],
      template: "input information cardTag / input children children",
      columns: "auto minmax(0, 1fr) auto",
    },
  ],
});
// #endregion

// #region render
export function PreferenceCard(parts: Parts) {
  return (
    <CardGrid className="card pad flat">
      {parts.input ? (
        // Bleeds out of the card's padding so the panel stays flush with the card edge.
        <CardGrid.input as="label" className="input-panel bleed">
          <Checkbox />
        </CardGrid.input>
      ) : null}
      {parts.icon ? (
        <CardGrid.icon>
          <IconBox />
        </CardGrid.icon>
      ) : null}
      <CardGrid.information>
        <Information titleTag={parts.titleTag} />
      </CardGrid.information>
      {parts.cardTag ? (
        <CardGrid.cardTag>
          <Tag>Paid app</Tag>
        </CardGrid.cardTag>
      ) : null}
      {parts.children ? (
        <CardGrid.children>
          <ExtraContent />
        </CardGrid.children>
      ) : null}
    </CardGrid>
  );
}
// #endregion

export const grids = (CardGrid as unknown as { grids: [] }).grids;
