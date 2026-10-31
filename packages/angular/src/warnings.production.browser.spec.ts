/**
 * Runs in the `browser-production` project, after `enableProdMode()`, as a
 * production build does.
 */
import { Component, isDevMode } from "@angular/core";
import { defineLayout } from "typed-grid-areas";
import { render } from "vitest-browser-angular";
import { createGrid, TgaArea, TgaGrid } from "./index.ts";

const Responsive = createGrid(
  defineLayout({
    areas: ["icon", "info"],
    layouts: [{ template: "info", breakpoints: { "@sm": { template: "icon info" } } }],
  }),
);

@Component({
  imports: [TgaGrid, TgaArea],
  template: `
    <div [tgaGrid]="Responsive">
      <span [tgaArea]="Responsive.icon">★</span>
      <span>stray</span>
    </div>
  `,
})
class Broken {
  protected readonly Responsive = Responsive;
}

describe("in production", () => {
  it("logs nothing, however the slots are wired", async () => {
    expect(isDevMode()).toBe(false);
    const spies = (["warn", "error", "log", "info"] as const).map(method =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    try {
      const { container } = await render(Broken);
      expect(container.querySelector("[data-grid-id]")).not.toBeNull();
      for (const spy of spies) {
        expect(spy).not.toHaveBeenCalled();
      }
    } finally {
      vi.restoreAllMocks();
    }
  });
});
