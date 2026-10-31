// PROTOTYPE (issue #4) — Variant B: nested grids, one definition per grid, derived layouts.
// "?" marks optional areas; you draw the everything-present picture and the library derives
// the rest (absent areas collapse out). Grids nest by handing one to another's `nest`.
// Rendering uses slot components instead of hook + render prop + spreads.
import { defineLayout } from "../engine/defineLayout";
import { Checkbox, ExtraContent, IconBox, Information, Parts, Tag } from "../parts";

// #region definition
const ContentGrid = defineLayout({
  name: "b-content",
  areas: ["icon?", "information", "cardTag?", "children?"],
  layouts: [
    {
      template: `
        icon        cardTag
        information information
        children    children`,
      columns: "min-content minmax(0, 1fr)",
      align: { cardTag: { justify: "end" } },
      breakpoints: {
        "@sm": {
          template: `
            icon     information cardTag
            children children    children`,
          columns: "min-content minmax(0, 1fr) auto",
        },
      },
    },
    // Overrides: keep a lone icon or tag beside the information at every width.
    // (Delete these two and the derived narrow layout stacks them on top instead.)
    {
      unless: ["cardTag"],
      template: "icon information / children children",
      columns: "min-content minmax(0, 1fr)",
    },
    {
      unless: ["icon"],
      template: "information cardTag / children children",
      columns: "minmax(0, 1fr) auto",
    },
  ],
});

const CardGrid = defineLayout({
  name: "b-card",
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
  nest: { content: ContentGrid },
});
// #endregion

// #region render
export function PreferenceCard(parts: Parts) {
  return (
    <CardGrid className="card">
      {parts.input ? (
        <CardGrid.input as="label" className="input-panel">
          <Checkbox />
        </CardGrid.input>
      ) : null}
      <CardGrid.content className="pad content">
        {parts.icon ? (
          <CardGrid.content.icon>
            <IconBox />
          </CardGrid.content.icon>
        ) : null}
        <CardGrid.content.information>
          <Information titleTag={parts.titleTag} />
        </CardGrid.content.information>
        {parts.cardTag ? (
          <CardGrid.content.cardTag>
            <Tag>Paid app</Tag>
          </CardGrid.content.cardTag>
        ) : null}
        {parts.children ? (
          <CardGrid.content.children>
            <ExtraContent />
          </CardGrid.content.children>
        ) : null}
      </CardGrid.content>
    </CardGrid>
  );
}
// #endregion

export const grids = (CardGrid as unknown as { grids: [] }).grids;
