/**
 * The playground: a React island (on Try it, and without its CSS view on the
 * optional-areas concept page) that renders an
 * example design in a container you can resize, with a checkbox per optional
 * area and the CSS the core generated for it. Its own JavaScript only keeps
 * the controls in step and reads out the container's width; the card inside
 * lays out from the generated CSS alone, like every other grid.
 */
import { useEffect, useId, useRef, useState } from "react";
import { WIDE } from "@typed-grid-areas/acceptance/designs";
import { playgroundDesigns, type PlaygroundDesignKey } from "../playground.ts";
import { DesignCard } from "./demos.tsx";

const MIN_WIDTH = 240;
const MAX_WIDTH = 720;

export function Playground({
  design: only,
  showCss = true,
}: {
  /** Shows this design only, with no picker. */
  design?: PlaygroundDesignKey;
  /** Shows the generated-CSS view. */
  showCss?: boolean;
}) {
  const [design, setDesign] = useState<PlaygroundDesignKey>(only ?? "preference-card");
  const [absent, setAbsent] = useState<ReadonlySet<string>>(new Set());
  const [width, setWidth] = useState(WIDE);
  const frame = useRef<HTMLDivElement>(null);
  const radios = useId();

  // The readout follows the container however it's resized: by the slider,
  // by dragging its corner, or by a narrow window.
  useEffect(() => {
    const element = frame.current;
    if (element === null) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { optional, css } = playgroundDesigns[design];
  const present = optional.filter(area => !absent.has(area));
  const toggle = (area: string) =>
    setAbsent(previous => {
      const next = new Set(previous);
      if (!next.delete(area)) next.add(area);
      return next;
    });

  return (
    <div className="not-content tga-playground" data-playground>
      <div className="tga-playground-controls">
        {only === undefined && (
          <fieldset>
            <legend>Design</legend>
            {(Object.keys(playgroundDesigns) as Array<PlaygroundDesignKey>).map(key => (
              <label key={key}>
                <input
                  type="radio"
                  name={radios}
                  checked={design === key}
                  onChange={() => setDesign(key)}
                />
                {playgroundDesigns[key].label}
              </label>
            ))}
          </fieldset>
        )}
        <fieldset>
          <legend>Optional areas</legend>
          {optional.map(area => (
            <label key={area}>
              <input type="checkbox" checked={!absent.has(area)} onChange={() => toggle(area)} />
              <code>{area}</code>
            </label>
          ))}
        </fieldset>
        <label className="tga-playground-width">
          Width
          <input
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            value={width}
            onChange={event => setWidth(Number(event.target.value))}
          />
          <output>{width}px</output>
        </label>
      </div>
      {/* Scrolls sideways when the picked width is wider than the screen. */}
      <div className="tga-playground-stage">
        <div ref={frame} className="tga-playground-frame" data-playground-frame style={{ width }}>
          <DesignCard design={design} present={present} />
        </div>
      </div>
      {showCss && <GeneratedCss blocks={css} />}
    </div>
  );
}

/** The CSS the core generated for each of the design's definitions. */
function GeneratedCss({ blocks }: { blocks: ReadonlyArray<{ name: string; css: string }> }) {
  return (
    <div className="tga-playground-css" data-generated-css>
      {blocks.map(({ name, css }) => (
        <figure key={name}>
          <figcaption>
            The CSS the core generated for <code>{name}</code>
          </figcaption>
          <pre>
            <code>{css}</code>
          </pre>
        </figure>
      ))}
    </div>
  );
}
