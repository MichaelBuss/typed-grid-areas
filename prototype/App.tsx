// PROTOTYPE (issue #4) — throwaway comparison page: ?variant=A|B|C, ← → to switch.
import { ReactNode, useEffect, useState } from "react";
import { CompiledGrid } from "./engine/core";
import { Parts } from "./parts";
import * as A from "./variants/A-nested-explicit";
import sourceA from "./variants/A-nested-explicit.tsx?raw";
import * as B from "./variants/B-nested-derived";
import sourceB from "./variants/B-nested-derived.tsx?raw";
import * as C from "./variants/C-flat-derived";
import sourceC from "./variants/C-flat-derived.tsx?raw";

type Variant = {
  title: string;
  points: Array<string>;
  source: string;
  grids: Array<CompiledGrid>;
  PreferenceCard: (parts: Parts) => ReactNode;
};

const VARIANTS: Record<string, Variant> = {
  A: {
    title: "Nested grids, explicit layouts",
    points: [
      "Today's API: builder, hook, render prop, spread slot props. Fixes from round 1 applied.",
      "Every combination you care about is written out; partial conditions + later-wins keep it to 4 head layouts.",
      "Children can't be an area cheaply (another optional area doubles the explicit layouts), so a plain stack holds them.",
    ],
    source: sourceA,
    grids: A.grids,
    PreferenceCard: A.PreferenceCard,
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
    PreferenceCard: B.PreferenceCard,
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
    PreferenceCard: C.PreferenceCard,
  },
};
const KEYS = Object.keys(VARIANTS);

/** Non-blank lines inside `// #region <name>` … `// #endregion`. */
function regionLines(source: string, region: string): number {
  const match = source.match(new RegExp(`// #region ${region}\\n([\\s\\S]*?)// #endregion`));
  return (
    match?.[1]?.split("\n").filter(line => line.trim() && !line.trim().startsWith("//")).length ?? 0
  );
}

const OPTIONAL: Array<keyof Parts> = ["input", "icon", "cardTag", "children"];
const COMBOS: Array<Parts> = Array.from({ length: 16 }, (_, i) => ({
  input: Boolean(i & 8),
  icon: Boolean(i & 4),
  cardTag: Boolean(i & 2),
  children: Boolean(i & 1),
  titleTag: true,
})).reverse();
const label = (parts: Parts) => OPTIONAL.map(k => (parts[k] ? `+${k}` : `−${k}`)).join(" ");

export function App() {
  const [key, setKey] = useState(() => {
    const fromUrl = new URLSearchParams(location.search).get("variant") ?? "A";
    return KEYS.includes(fromUrl) ? fromUrl : "A";
  });
  const [playground, setPlayground] = useState<Parts>(COMBOS[0]!);

  const go = (step: number) =>
    setKey(current => {
      const next = KEYS[(KEYS.indexOf(current) + step + KEYS.length) % KEYS.length]!;
      history.replaceState(null, "", `?variant=${next}`);
      return next;
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]"))
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const variant = VARIANTS[key]!;
  const { PreferenceCard } = variant;
  const css = variant.grids.map(g => g.css).join("\n\n");

  return (
    <div className="page">
      <header>
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
          {(["input", "icon", "titleTag", "cardTag", "children"] as const).map(k => (
            <label key={k}>
              <input
                checked={playground[k]}
                onChange={e => setPlayground({ ...playground, [k]: e.target.checked })}
                type="checkbox"
              />{" "}
              {k}
            </label>
          ))}
        </div>
        <div className="resizable" data-testid="playground">
          <PreferenceCard {...playground} />
        </div>

        {[300, 560].map(width => (
          <section key={width}>
            <h2>Every combination of optional parts at {width}px</h2>
            <div className="matrix" style={{ ["--w" as string]: `${width}px` }}>
              {COMBOS.map(parts => (
                <div
                  className="cell"
                  data-combo={label(parts)}
                  data-width={width}
                  key={label(parts)}
                >
                  <div className="cell-label">{label(parts)}</div>
                  <PreferenceCard {...parts} />
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
