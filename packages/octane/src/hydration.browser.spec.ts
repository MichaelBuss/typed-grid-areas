/** @jsxImportSource octane */
/**
 * Hydrating server-rendered grids: the client adopts the style tag the server
 * rendered instead of adding a second one.
 */
import { hydrateRoot } from "octane";
import { gridId } from "typed-grid-areas";
import { commands } from "vitest/browser";
import { Hydrated, hydratedGrid } from "./test-utils/Hydrated";

declare module "vitest/browser" {
  interface BrowserCommands {
    renderOnServer: (path: string, exportName: string) => Promise<{ html: string; css: string }>;
  }
}

describe("hydration", () => {
  it("adopts the server's style tag and adds no second one", async () => {
    const { html, css } = await commands.renderOnServer("src/test-utils/Hydrated.tsx", "Hydrated");
    expect(css).toContain(gridId(hydratedGrid));
    document.head.insertAdjacentHTML("beforeend", css);
    const serverTag = document.head.lastElementChild;
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const serverGrid = container.querySelector("[data-testid=card-1]");

    hydrateRoot(container, Hydrated);

    const tags = Array.from(document.querySelectorAll("style")).filter(style =>
      style.textContent?.includes(gridId(hydratedGrid)),
    );
    expect(tags).toEqual([serverTag]);
    expect(container.querySelector("[data-testid=card-1]")).toBe(serverGrid);
    expect(container.querySelector("style")).toBeNull();
  });
});
