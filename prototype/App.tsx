// PROTOTYPE (issue #4) — throwaway comparison page: ?variant=A…E, ← → to switch within a case.
import { ReactNode, useEffect, useState } from "react";
import { CompiledGrid } from "./engine/core";
import * as A from "./variants/A-nested-explicit";
import sourceA from "./variants/A-nested-explicit.tsx?raw";
import * as B from "./variants/B-nested-derived";
import sourceB from "./variants/B-nested-derived.tsx?raw";
import * as C from "./variants/C-flat-derived";
import sourceC from "./variants/C-flat-derived.tsx?raw";
import * as D from "./variants/D-idcard-layers";
import sourceD from "./variants/D-idcard-layers.tsx?raw";
import * as E from "./variants/E-idcard-cells";
import sourceE from "./variants/E-idcard-cells.tsx?raw";

type Flags = Record<string, boolean>;

type Variant = {
  title: string;
  points: Array<string>;
  source: string;
  grids: Array<CompiledGrid>;
  Render: (flags: Flags) => ReactNode;
};

type Case = {
  title: string;
  /** Optional parts the matrix enumerates. */
  optional: Array<string>;
  /** Extra flags the playground can toggle; always on in the matrix. */
  extras: Array<string>;
  widths: Array<number>;
  variants: Record<string, Variant>;
};

const CASES: Record<string, Case> = {
  "preference-card": {
    title: "PreferenceCard",
    optional: ["input", "icon", "cardTag", "children"],
    extras: ["titleTag"],
    widths: [300, 560],
    variants: {
      A: {
        title: "Nested grids, explicit layouts",
        points: [
          "Today's API: builder, hook, render prop, spread slot props. Fixes from round 1 applied.",
          "Every combination you care about is written out; partial conditions + later-wins keep it to 4 head layouts.",
          "Children can't be an area cheaply (another optional area doubles the explicit layouts), so a plain stack holds them.",
        ],
        source: sourceA,
        grids: A.grids,
        Render: A.PreferenceCard as unknown as Variant["Render"],
      },
      B: {
        title: "Nested grids, one definition each, derived layouts",
        points: [
          '"?" marks optional areas. You draw the everything-present picture; absent areas collapse out automatically.',
          "Overrides are only needed where the derived result isn't what you want (here: 2, both optional).",
          "Grids nest through `nest`, and render as slot components: no hooks, render props or spreads.",
        ],
        source: sourceB,
        grids: B.grids,
        Render: B.PreferenceCard as unknown as Variant["Render"],
      },
      C: {
        title: "One flat grid, derived layouts",
        points: [
          "Same definition style as B, but every part is an area of the card itself: one grid, one definition.",
          "Panels with their own padding/background (the input panel) don't map to cells: needs a negative-margin bleed.",
          "One row gap / column gap for everything; the breakpoint measures the whole card, not the content.",
        ],
        source: sourceC,
        grids: C.grids,
        Render: C.PreferenceCard as unknown as Variant["Render"],
      },
    },
  },
  "id-card": {
    title: "ID card (stretch goal)",
    optional: ["logo", "qr", "badge"],
    extras: [],
    widths: [300, 560],
    variants: {
      D: {
        title: "Layering by naming the area underneath",
        points: [
          '`layers: { badge: "photo" }` puts badge over all of photo; `align` pins it to a corner.',
          "Template stays a plain picture of the cells; what floats on top is listed beside it.",
          "Two layers that pin to the same corner would collide: they'd need to be one area (or a nested grid).",
        ],
        source: sourceD,
        grids: D.grids,
        Render: D.IdCard as unknown as Variant["Render"],
      },
      E: {
        title: "Layering written into the template cells",
        points: [
          "`photo+badge` = photo owns the cell, badge sits on top. Corners are cells, so the picture shows placement.",
          "Several layers can share one photo in different cells (logo, badge, identity) without colliding.",
          "Needs extra rows/columns to carve the photo into cells; align only fine-tunes within a cell.",
        ],
        source: sourceE,
        grids: E.grids,
        Render: E.IdCard as unknown as Variant["Render"],
      },
    },
  },
};

const caseOf = (variant: string) => Object.keys(CASES).find(c => variant in CASES[c]!.variants)!;

/** Non-blank, non-comment lines inside `// #region <name>` … `// #endregion`. */
function regionLines(source: string, region: string): number {
  const match = source.match(new RegExp(`// #region ${region}\\n([\\s\\S]*?)// #endregion`));
  return (
    match?.[1]?.split("\n").filter(line => line.trim() && !line.trim().startsWith("//")).length ?? 0
  );
}

function combos(c: Case): Array<Flags> {
  const n = c.optional.length;
  return Array.from({ length: 2 ** n }, (_, i) =>
    Object.fromEntries([
      ...c.optional.map((k, bit) => [k, Boolean(i & (1 << (n - 1 - bit)))]),
      ...c.extras.map(k => [k, true]),
    ]),
  ).reverse();
}

export function App() {
  const [key, setKey] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get("variant") ?? "A";
    return caseOf(fromUrl) ? fromUrl : "A";
  });
  const current = CASES[caseOf(key)]!;
  const keys = Object.keys(current.variants);
  const [playground, setPlayground] = useState<Flags>({});

  const select = (next: string) => {
    history.replaceState(null, "", `?variant=${next}`);
    setKey(next);
  };
  const go = (step: number) =>
    select(keys[(keys.indexOf(key) + step + keys.length) % keys.length]!);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]"))
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const variant = current.variants[key]!;
  const { Render } = variant;
  const css = variant.grids.map(g => g.css).join("\n\n");
  const flags = { ...combos(current)[0], ...playground };
  const label = (f: Flags) => current.optional.map(k => (f[k] ? `+${k}` : `−${k}`)).join(" ");

  return (
    <div className="page">
      <header>
        <nav className="cases">
          {Object.entries(CASES).map(([id, c]) => (
            <button
              aria-pressed={c === current}
              key={id}
              onClick={() => select(Object.keys(c.variants)[0]!)}
              type="button"
            >
              {c.title}
            </button>
          ))}
        </nav>
        <h1>
          Variant {key}: {variant.title}
        </h1>
        <ul className="blurb">
          {variant.points.map(p => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <ul className="stats">
          <li>definition lines: {regionLines(variant.source, "definition")}</li>
          <li>render lines: {regionLines(variant.source, "render")}</li>
          <li>grids: {variant.grids.length}</li>
          <li>generated rules: {variant.grids.reduce((n, g) => n + g.rules.length, 0)}</li>
          <li>CSS: {(css.length / 1024).toFixed(1)} KB</li>
        </ul>
      </header>

      <pre className="source">{variant.source}</pre>

      <main>
        <h2>Playground: drag the corner to resize</h2>
        <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
          {[...current.optional, ...current.extras].map(k => (
            <label key={k}>
              <input
                checked={flags[k] ?? false}
                onChange={e => setPlayground({ ...flags, [k]: e.target.checked })}
                type="checkbox"
              />{" "}
              {k}
            </label>
          ))}
        </div>
        <div className="resizable" data-testid="playground">
          <Render {...flags} />
        </div>

        {current.widths.map(width => (
          <section key={width}>
            <h2>Every combination of optional parts at {width}px</h2>
            <div className="matrix" style={{ ["--w" as string]: `${width}px` }}>
              {combos(current).map(f => (
                <div className="cell" data-combo={label(f)} data-width={width} key={label(f)}>
                  <div className="cell-label">{label(f)}</div>
                  <Render {...f} />
                </div>
              ))}
            </div>
          </section>
        ))}

        <details>
          <summary>Generated CSS</summary>
          <pre>{css}</pre>
        </details>
      </main>

      <nav className="switcher">
        <button onClick={() => go(-1)} type="button">
          ←
        </button>
        <span>
          {key} ({variant.title})
        </span>
        <button onClick={() => go(1)} type="button">
          →
        </button>
      </nav>
    </div>
  );
}
