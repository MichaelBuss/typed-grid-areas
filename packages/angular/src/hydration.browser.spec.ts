/**
 * Client hydration of a server-rendered page: the server renders the app in
 * Node (the `renderOnServer` command), this page loads that HTML as a
 * browser would, and the client app hydrates it.
 */
import { ApplicationRef } from "@angular/core";
import { GRID_STYLE_ATTRIBUTE, gridMarkup } from "typed-grid-areas/adapter";
import { commands } from "vitest/browser";
import { bootstrap, cardGrid, contentGrid, listGrid } from "./test-utils/serverApp.ts";

declare module "vitest/browser" {
  interface BrowserCommands {
    renderOnServer: () => Promise<string>;
  }
}

/** A copy of a server-rendered node for this page; scripts run, as they would on load. */
function load(node: Node): Node {
  if (node instanceof HTMLScriptElement) {
    const script = document.createElement("script");
    for (const { name, value } of Array.from(node.attributes)) {
      script.setAttribute(name, value);
    }
    script.textContent = node.textContent;
    return script;
  }
  return document.importNode(node, true);
}

/** Puts a server-rendered page's head and body into this page; returns what it added. */
function loadPage(html: string): Array<Node> {
  const server = new DOMParser().parseFromString(html, "text/html");
  const head = Array.from(server.head.childNodes, load);
  const body = Array.from(server.body.childNodes, load);
  document.head.append(...head);
  document.body.append(...body);
  return [...head, ...body];
}

/** The style tags in <head> carrying a definition's CSS. */
function stylesOf(definition: Parameters<typeof gridMarkup>[0]): Array<Element> {
  const { id } = gridMarkup(definition);
  return Array.from(document.head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`));
}

describe("client hydration", () => {
  let added: Array<Node> = [];
  let app: ApplicationRef | undefined;

  afterEach(() => {
    app?.destroy();
    added.forEach(node => node.parentNode?.removeChild(node));
    vi.restoreAllMocks();
  });

  it("reuses the server's grids and style tags, with no mismatch", async () => {
    added = loadPage(await commands.renderOnServer());
    const definitions = [listGrid, cardGrid, contentGrid];
    const serverStyles = definitions.map(stylesOf);
    expect(serverStyles.map(styles => styles.length)).toEqual([1, 1, 1]);
    const serverCards = Array.from(document.querySelectorAll(".card"));
    expect(serverCards).toHaveLength(2);

    const error = vi.spyOn(console, "error");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    app = await bootstrap();
    await app.whenStable();

    expect(error).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Angular hydrated 1 component\(s\)/));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("0 component(s) were skipped"));
    expect(definitions.map(stylesOf)).toEqual(serverStyles);
    expect(Array.from(document.querySelectorAll(".card"))).toEqual(serverCards);
    expect(serverCards.every(card => card.isConnected)).toBe(true);
  });
});
