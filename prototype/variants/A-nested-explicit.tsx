// PROTOTYPE (issue #4) — Variant A: nested grids, explicit layouts.
// Today's API (builder + hook + render prop + spread slots) with the round-1 fixes:
// partial conditions (when/unless, later wins), per-area alignment, component-owned container.
import { createGrid, GridAreas, useGridAreas } from "../engine/builder";
import { Checkbox, ExtraContent, IconBox, Information, Parts, Tag } from "../parts";

// #region definition
const cardGrid = createGrid("a-card")
  .areas(["input", "content"])
  .layout({ layout: [["content"]], columns: ["minmax(0, 1fr)"] })
  .layout({
    when: ["input"],
    layout: [["input", "content"]],
    columns: ["auto", "minmax(0, 1fr)"],
  })
  .build();

const headGrid = createGrid("a-head")
  .areas(["icon", "information", "cardTag"])
  .layout({ layout: [["information"]], columns: ["minmax(0, 1fr)"] })
  .layout({
    when: ["icon"],
    layout: [["icon", "information"]],
    columns: ["min-content", "minmax(0, 1fr)"],
  })
  .layout({
    when: ["cardTag"],
    layout: [["information", "cardTag"]],
    columns: ["minmax(0, 1fr)", "auto"],
  })
  .layout({
    when: ["icon", "cardTag"],
    layout: [
      ["icon", "cardTag"],
      ["information", "information"],
    ],
    rows: ["min-content", "1fr"],
    columns: ["min-content", "minmax(0, 1fr)"],
    align: { cardTag: { justify: "end" } },
    breakpoints: {
      "@sm": {
        layout: [["icon", "information", "cardTag"]],
        columns: ["min-content", "minmax(0, 1fr)", "auto"],
      },
    },
  })
  .build();
// #endregion

// #region render
export function PreferenceCard(parts: Parts) {
  const card = useGridAreas(cardGrid);
  const head = useGridAreas(headGrid);

  return (
    <GridAreas {...card} className="card">
      {slots => (
        <>
          {parts.input ? (
            <label {...slots.input} className="input-panel">
              <Checkbox />
            </label>
          ) : null}
          {/* children aren't an area: a plain stack holds the head grid + children */}
          <div {...slots.content} className="pad stack">
            <GridAreas {...head} className="head">
              {s => (
                <>
                  {parts.icon ? <IconBox {...s.icon} /> : null}
                  <Information {...s.information} titleTag={parts.titleTag} />
                  {parts.cardTag ? (
                    <div {...s.cardTag}>
                      <Tag>Paid app</Tag>
                    </div>
                  ) : null}
                </>
              )}
            </GridAreas>
            {parts.children ? <ExtraContent /> : null}
          </div>
        </>
      )}
    </GridAreas>
  );
}
// #endregion

export const grids = [cardGrid, headGrid];
