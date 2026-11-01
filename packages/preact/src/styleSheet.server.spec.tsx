/**
 * Server rendering with `preact-render-to-string`, outside any DOM: the CSS
 * goes through a per-render `createGridStyleSheet()` (ADR 0005).
 */
import { renderToString } from "preact-render-to-string";
import { defineLayout, gridId } from "typed-grid-areas";
import { createGridComponent, createGridStyleSheet } from "./index.ts";

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

function App() {
  return (
    <>
      {[1, 2, 3].map(index => (
        <Card key={index} class="card">
          <Card.content>
            <Card.content.icon>★</Card.content.icon>
            <Card.content.title>Title {index}</Card.content.title>
          </Card.content>
        </Card>
      ))}
    </>
  );
}

const styleTags = (html: string) => html.match(/<style[^>]*>/g) ?? [];

describe("server rendering with a grid style sheet", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("leaves the body free of style tags and collects one tag per rendered definition", () => {
    const sheet = createGridStyleSheet();
    const body = renderToString(sheet.collect(<App />));

    expect(styleTags(body)).toEqual([]);
    expect(body).toContain(`data-grid-id="${gridId(cardGrid)}"`);
    expect(body).toContain('data-area="title"');

    const head = sheet.toString();
    expect(styleTags(head)).toEqual([
      `<style data-typed-grid-areas="${gridId(cardGrid)}">`,
      `<style data-typed-grid-areas="${gridId(contentGrid)}">`,
    ]);
    expect(`${sheet}`).toBe(head);
  });

  it("gives a second sheet nothing from the first", () => {
    const first = createGridStyleSheet();
    renderToString(first.collect(<App />));

    const second = createGridStyleSheet();
    expect(second.toString()).toBe("");
    const Other = createGridComponent(
      defineLayout({ areas: ["only"], layouts: [{ template: "only" }] }),
    );
    renderToString(
      second.collect(
        <Other>
          <Other.only />
        </Other>,
      ),
    );
    expect(styleTags(second.toString())).toHaveLength(1);
    expect(styleTags(first.toString())).toHaveLength(2);
  });

  it("logs nothing, even in development with a slot missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    const sheet = createGridStyleSheet();
    renderToString(sheet.collect(<Card />));

    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("warns in development when a grid renders without a sheet", () => {
    vi.stubEnv("NODE_ENV", "development");
    const Lonely = createGridComponent(
      defineLayout({ areas: ["only"], layouts: [{ template: "only" }] }),
    );
    renderToString(
      <Lonely>
        <Lonely.only />
      </Lonely>,
    );

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: .*createGridStyleSheet/),
    );
  });

  it("doesn't warn outside development when a grid renders without a sheet", () => {
    const Lonely = createGridComponent(
      defineLayout({ areas: ["only"], layouts: [{ template: "only" }] }),
    );
    renderToString(
      <Lonely>
        <Lonely.only />
      </Lonely>,
    );

    expect(console.warn).not.toHaveBeenCalled();
  });
});
