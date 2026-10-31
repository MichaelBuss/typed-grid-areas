/**
 * The definition's CSS in the browser (ADR 0005): one style tag per
 * definition in `<head>`, there before any slot content lays out.
 */
import { useLayoutEffect, useRef } from "preact/hooks";
import { render } from "vitest-browser-preact";
import { defineLayout, gridId } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { createGridComponent } from "./index.ts";

function styleTags(definition: Parameters<typeof gridId>[0]): Array<HTMLStyleElement> {
  return Array.from(
    document.querySelectorAll<HTMLStyleElement>(
      `style[${GRID_STYLE_ATTRIBUTE}="${gridId(definition)}"]`,
    ),
  );
}

describe("the definition's CSS in the browser", () => {
  it("is one style tag in <head>, however many instances render", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "info icon", columns: "1fr 11px" }],
    });
    const Card = createGridComponent(definition);

    render(
      <>
        {Array.from({ length: 10 }, (_, index) => (
          <Card key={index}>
            <Card.icon />
            <Card.info />
          </Card>
        ))}
      </>,
    );

    const tags = styleTags(definition);
    expect(tags).toHaveLength(1);
    expect(tags[0]!.parentElement).toBe(document.head);
    expect(Array.from(document.querySelectorAll("body style"))).toEqual([]);
  });

  it("is on the page before a slot's content runs its layout effect", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "info icon", columns: "1fr 12px" }],
    });
    const Card = createGridComponent(definition);
    const measured: Array<number> = [];

    function Measure() {
      const ref = useRef<HTMLSpanElement>(null);
      useLayoutEffect(() => {
        measured.push(ref.current!.parentElement!.getBoundingClientRect().width);
      }, []);
      return <span ref={ref} />;
    }

    render(
      <div style={{ width: "300px" }}>
        <Card>
          <Card.icon>
            <Measure />
          </Card.icon>
          <Card.info />
        </Card>
      </div>,
    );

    expect(measured).toEqual([12]);
  });

  it("stays when an instance unmounts", () => {
    const definition = defineLayout({
      areas: ["icon", "info"],
      layouts: [{ template: "info icon", columns: "1fr 13px" }],
    });
    const Card = createGridComponent(definition);

    const { unmount } = render(
      <Card>
        <Card.icon />
        <Card.info />
      </Card>,
    );
    unmount();

    expect(styleTags(definition)).toHaveLength(1);
  });
});
