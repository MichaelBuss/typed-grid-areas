/**
 * Hydrating what the server rendered: the app's HTML and the style tags its
 * document's `<head>` got, rendered in Node by the `renderOnServer` command.
 */
import { hydrate } from "solid-js/web";
import { commands } from "vitest/browser";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { App, appGridIds } from "./test-utils/serverApp.tsx";

describe("hydrating a server-rendered page", () => {
  it("adds no second style tag and logs no hydration mismatch", async () => {
    const { styles, app, hydrationScript } = await commands.renderOnServer();
    document.head.insertAdjacentHTML("beforeend", styles);
    const script = document.createElement("script");
    script.textContent = hydrationScript;
    document.head.append(script);
    const container = document.createElement("div");
    container.innerHTML = app;
    document.body.append(container);
    const serverGrid = container.querySelector("[data-grid-id]");
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");

    const dispose = hydrate(() => <App />, container);

    try {
      const styleIds = Array.from(
        document.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}]`),
        style => style.getAttribute(GRID_STYLE_ATTRIBUTE),
      );
      expect(styleIds.sort()).toEqual([...appGridIds].sort());
      expect(container.querySelector("[data-grid-id]")).toBe(serverGrid);
      expect(container.querySelectorAll("[data-grid-id]")).toHaveLength(7);
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      dispose();
      container.remove();
    }
  });
});
