/**
 * The grid template areas explainer: a template drawn as a picture of named
 * areas, beside the card it lays out, each area in the same colour in both.
 * Hovering an area in either highlights it in both. Unticking an optional
 * area takes its slot out of the card, and the picture shows the template
 * the browser now applies, read back from the card's grid: the layout
 * typed-grid-areas derived for that combination.
 *
 * Rendered without JavaScript (or with `controls={false}`, as in the
 * README's screenshot) it shows the template as written.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createGridComponent } from "@typed-grid-areas/react";
import {
  authoredRows,
  explainerGrid,
  templateRows,
  type ExplainerArea,
} from "../areasExplainer.ts";

const Card = createGridComponent(explainerGrid);

const optional = ["icon", "tag"] as const;

/** An area's colour, the same in the picture and on the card. */
const tint = (area: string, dimmed: boolean): CSSProperties => ({
  background: `color-mix(in oklab, var(--tga-area-${area}) ${dimmed ? 8 : 22}%, transparent)`,
  boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, var(--tga-area-${area}) ${dimmed ? 25 : 80}%, transparent)`,
  borderRadius: "0.375rem",
  transition: "background 120ms, box-shadow 120ms",
});

/** Each area of a template, as the rows and columns its cells span (1-based CSS lines). */
function areaBoxes(rows: ReadonlyArray<ReadonlyArray<string>>) {
  const boxes = new Map<string, { top: number; bottom: number; left: number; right: number }>();
  rows.forEach((row, r) =>
    row.forEach((area, c) => {
      if (area === ".") return;
      const box = boxes.get(area);
      boxes.set(
        area,
        box === undefined
          ? { top: r, bottom: r, left: c, right: c }
          : {
              top: Math.min(box.top, r),
              bottom: Math.max(box.bottom, r),
              left: Math.min(box.left, c),
              right: Math.max(box.right, c),
            },
      );
    }),
  );
  return Array.from(boxes, ([area, { top, bottom, left, right }]) => ({
    area,
    row: `${top + 1} / ${bottom + 2}`,
    column: `${left + 1} / ${right + 2}`,
  }));
}

export function AreasExplainer({ controls = true }: { controls?: boolean }) {
  const [absent, setAbsent] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState<ReadonlyArray<ReadonlyArray<string>>>(authoredRows);
  const card = useRef<HTMLDivElement>(null);

  // What the browser applies, after each change of slots.
  useLayoutEffect(() => {
    const grid = card.current?.querySelector("[data-grid-id]");
    if (grid) setRows(templateRows(getComputedStyle(grid).gridTemplateAreas));
  }, [absent]);

  const has = (area: ExplainerArea) => !absent.has(area);
  const toggle = (area: string) =>
    setAbsent(previous => {
      const next = new Set(previous);
      if (!next.delete(area)) next.add(area);
      return next;
    });
  const hover = (area: string) => ({
    onMouseEnter: () => setActive(area),
    onMouseLeave: () => setActive(null),
  });
  const dimmed = (area: string) => active !== null && active !== area;
  const slot = (area: ExplainerArea): CSSProperties => ({
    ...tint(area, dimmed(area)),
    padding: "0.375rem 0.625rem",
  });
  const columns = Math.max(...rows.map(row => row.length));

  return (
    <div className="not-content tga-explainer" data-areas-explainer>
      <figure className="tga-explainer-code" data-explainer-code>
        <pre>
          <code>
            <span className="tga-explainer-key">template:</span> {"`"}
          </code>
        </pre>
        <div
          className="tga-explainer-picture"
          style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}
          aria-label={rows.map(row => row.join(" ")).join(" / ")}
        >
          {/* Each area's colour, one rectangle over every cell it names. */}
          {areaBoxes(rows).map(({ area, row, column }) => (
            <span
              key={area}
              aria-hidden="true"
              className="tga-explainer-box"
              style={{ ...tint(area, dimmed(area)), gridRow: row, gridColumn: column }}
              {...hover(area)}
            />
          ))}
          {rows.flatMap((row, r) =>
            row.map((area, c) => (
              <code
                key={`${r}-${c}`}
                data-row={r}
                data-cell={area}
                style={{ gridRow: r + 1, gridColumn: c + 1 }}
                {...hover(area)}
              >
                {area}
              </code>
            )),
          )}
        </div>
        <pre>
          <code>{"`"}</code>
        </pre>
        <figcaption>
          {absent.size === 0
            ? "The template you write: a picture of the layout."
            : "The template your browser applies now, derived by typed-grid-areas."}
        </figcaption>
      </figure>

      <div className="tga-explainer-card" ref={card}>
        <Card className="tga-explainer-grid">
          {has("icon") && (
            <Card.icon
              style={{ ...slot("icon"), display: "grid", placeItems: "center" }}
              {...hover("icon")}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="var(--tga-area-icon)" />
              </svg>
            </Card.icon>
          )}
          <Card.title style={slot("title")} {...hover("title")}>
            <strong>Weekly digest</strong>
          </Card.title>
          {has("tag") && (
            <Card.tag style={slot("tag")} {...hover("tag")}>
              New
            </Card.tag>
          )}
          <Card.body style={slot("body")} {...hover("body")}>
            A summary of the week's activity, every Monday morning.
          </Card.body>
        </Card>
      </div>

      {controls && (
        <fieldset className="tga-explainer-controls">
          <legend>Slots</legend>
          {optional.map(area => (
            <label key={area}>
              <input type="checkbox" checked={has(area)} onChange={() => toggle(area)} />
              <code>{area}</code>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
}
