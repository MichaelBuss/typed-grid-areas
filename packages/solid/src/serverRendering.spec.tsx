/**
 * Server rendering, in the `unit` project: Node, with this package's JSX
 * compiled for the server (`vite-plugin-solid` with `ssr: true`).
 */
import { renderToStream, renderToString, renderToStringAsync } from "solid-js/web";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { App, appGridIds, Document, Miswired } from "./test-utils/serverApp.tsx";

/** The grid ids of the style tags in some HTML, in order. */
function styleTagIds(html: string): Array<string> {
  return Array.from(
    html.matchAll(new RegExp(`<style ${GRID_STYLE_ATTRIBUTE}="([^"]+)">`, "g")),
    match => match[1]!,
  );
}

/** The HTML of the rendered document's `<head>`. */
function head(html: string): string {
  const match = /<head>([\s\S]*)<\/head>/.exec(html);
  expect(match).not.toBeNull();
  return match![1]!;
}

function streamToString(): Promise<string> {
  return new Promise(resolve => {
    let html = "";
    // Solid ends the stream it's piped into, though its types only name `write`.
    const writable = {
      write: (chunk: string) => {
        html += chunk;
      },
      end: () => resolve(html),
    };
    renderToStream(() => <Document />).pipe(writable);
  });
}

describe("server rendering a full document", () => {
  it.each([
    ["renderToString", async () => renderToString(() => <Document />)],
    ["renderToStringAsync", () => renderToStringAsync(() => <Document />)],
    ["renderToStream", streamToString],
  ])("puts one style tag per definition inside <head> (%s)", async (_, render) => {
    const html = await render();

    expect(styleTagIds(html).sort()).toEqual([...appGridIds].sort());
    expect(styleTagIds(head(html)).sort()).toEqual([...appGridIds].sort());
    expect(html).toContain("grid-template-areas");
    expect(html).toMatch(/<main[^>]*>(<!--[^>]*-->)?<div[^>]*data-grid-id=/);
  });

  it("puts each definition's style tag in every request's document, once", () => {
    const first = renderToString(() => <Document />);
    const second = renderToString(() => <Document />);

    expect(styleTagIds(head(first)).sort()).toEqual([...appGridIds].sort());
    expect(styleTagIds(head(second)).sort()).toEqual([...appGridIds].sort());
  });

  it("renders no style tag when the app doesn't render the document's <head>", () => {
    const html = renderToString(() => <App />);

    expect(styleTagIds(html)).toEqual([]);
    expect(html).toMatch(/^<main/);
  });

  it("logs nothing about the slots, even in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    try {
      renderToString(() => <Miswired />);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      warn.mockRestore();
    }
  });
});
