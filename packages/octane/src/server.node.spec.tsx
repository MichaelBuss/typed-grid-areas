/** @jsxImportSource octane */
/**
 * Server rendering with `octane/server`: each definition's CSS travels in the
 * render's `css` (and leads a stream's shell), never inline in the markup.
 */
import { renderToReadableStream, renderToString } from "octane/server";
import { defineLayout, generateCss, gridId } from "typed-grid-areas";
import { createGridComponent } from "./index";

const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "icon title", breakpoints: { "@sm": { template: "title icon" } } }],
});
const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content" }],
});
const Content = createGridComponent(contentGrid);
const Card = createGridComponent(cardGrid, { nest: { content: Content } });

function Cards() {
  return (
    <main>
      {[1, 2, 3].map(index => (
        <Card key={index}>
          <Card.input render={<label />}>
            <input type="checkbox" />
          </Card.input>
          <Card.content>
            <Card.content.icon>★</Card.content.icon>
            <Card.content.title>Title</Card.content.title>
          </Card.content>
        </Card>
      ))}
    </main>
  );
}

/** How often `needle` occurs in `haystack`. */
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe("server rendering", () => {
  it("returns each definition's CSS once in css, and no <style> in html", () => {
    const { html, css } = renderToString(Cards);

    for (const definition of [cardGrid, contentGrid]) {
      expect(count(css, `data-octane="typed-grid-areas-${gridId(definition)}"`)).toBe(1);
      expect(count(css, generateCss(definition))).toBe(1);
    }
    expect(html).not.toContain("<style");
    expect(count(html, `data-grid-id="${gridId(cardGrid)}"`)).toBe(3);
    expect(count(html, `data-grid-id="${gridId(contentGrid)}"`)).toBe(3);
    expect(html).toMatch(/<label[^>]*data-area="input"/);
  });

  it("leads a stream's shell with the CSS, before the first grid", async () => {
    const stream = await renderToReadableStream(Cards);
    const shell = await new Response(stream).text();

    const firstGrid = shell.search(/<[a-z]+ [^>]*data-grid-id="/);
    expect(firstGrid).toBeGreaterThan(-1);
    for (const definition of [cardGrid, contentGrid]) {
      const style = shell.indexOf(`data-octane="typed-grid-areas-${gridId(definition)}"`);
      expect(style).toBeGreaterThan(-1);
      expect(style).toBeLessThan(firstGrid);
      expect(count(shell, generateCss(definition))).toBe(1);
    }
  });

  it("logs nothing, even in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const environment = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      renderToString(() => (
        <Card>
          <span>stray</span>
        </Card>
      ));
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = environment;
      warn.mockRestore();
    }
  });
});
