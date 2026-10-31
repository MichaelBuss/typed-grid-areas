/**
 * Hydration of `@lit-labs/ssr` output with `@lit-labs/ssr-client`: a
 * component whose grids were rendered on the server takes over its
 * declarative shadow root without errors. Hydration support has to load
 * before Lit itself, so it's the first import.
 */
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";
import { commands } from "vitest/browser";
import { defineServerCard, ServerCard } from "./test-utils/serverCard.ts";
import { settle } from "./test-utils/mount.ts";

declare module "vitest/browser" {
  interface BrowserCommands {
    renderOnServer: () => Promise<string>;
  }
}

describe("a server-rendered component", () => {
  it("hydrates without errors, its grids' CSS already in its shadow root", async () => {
    const errors: Array<unknown> = [];
    const onError = (event: ErrorEvent) => errors.push(event.error);
    window.addEventListener("error", onError);
    vi.spyOn(console, "error").mockImplementation(error => errors.push(error));

    const container = document.createElement("div");
    document.body.append(container);
    container.setHTMLUnsafe(await commands.renderOnServer());
    const card = container.querySelector("server-card") as ServerCard;
    const root = card.shadowRoot!;
    const serverGrid = root.querySelector("[data-grid-id]");
    expect(serverGrid).not.toBeNull();

    defineServerCard();
    await card.updateComplete;
    await settle();

    // Hydration kept the server's DOM, and the grids lay out.
    expect(root.querySelector("[data-grid-id]")).toBe(serverGrid);
    expect(getComputedStyle(serverGrid!).display).toBe("grid");
    // `gridStyles` is in `static styles`: no further grid sheet was adopted.
    const staticSheets = ServerCard.elementStyles.map(style =>
      style instanceof CSSStyleSheet ? style : style.styleSheet,
    );
    expect(root.adoptedStyleSheets).toEqual(staticSheets);

    // And it updates like any client-rendered component.
    card.tagged = true;
    await card.updateComplete;
    await settle();
    expect(root.querySelector("[data-area=tag]")?.textContent).toBe("New");
    expect(root.adoptedStyleSheets).toEqual(staticSheets);

    expect(errors).toEqual([]);
    window.removeEventListener("error", onError);
    vi.restoreAllMocks();
    container.remove();
  });
});
