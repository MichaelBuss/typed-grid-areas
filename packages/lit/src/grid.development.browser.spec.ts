/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { html, nothing } from "lit";
import { defineLayout } from "typed-grid-areas";
import { createGrid } from "./index.ts";
import { defineHost, mountElement, mountInDocument, rerender, settle } from "./test-utils/mount.ts";

describe("grid template functions", () => {
  describe("in development", () => {
    const Card = createGrid(
      defineLayout({
        areas: ["icon?", "info"],
        layouts: [{ template: "icon info" }],
      }),
    );

    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("warns when a required area's slot isn't rendered", async () => {
      mountInDocument(Card(html`<div data-area=${Card.icon}></div>`));
      await settle();

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^typed-grid-areas: .*required area "info"/),
      );
    });

    it("warns when a grid has a direct child that isn't a slot, naming data-area", async () => {
      mountInDocument(
        Card(
          html`<div data-area=${Card.info}></div>
            <span>stray</span>`,
        ),
      );
      await settle();

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/^typed-grid-areas: <span>/));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("data-area"));
    });

    it("doesn't warn when only optional slots are absent", async () => {
      mountInDocument(Card(html`<div data-area=${Card.info}></div>`));
      await settle();

      expect(console.warn).not.toHaveBeenCalled();
    });

    it("warns once per set of problems, and again after an update introduces new ones", async () => {
      let state: "fine" | "missing" | "stray" = "missing";
      const host = await mountElement(
        defineHost(() =>
          Card(html`
            ${state === "missing" ? nothing : html`<div data-area=${Card.info}></div>`}
            ${state === "stray" ? html`<span>stray</span>` : nothing}
          `),
        ),
      );
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining('area "info"'));

      await rerender(host);
      expect(console.warn).toHaveBeenCalledTimes(1);

      state = "fine";
      await rerender(host);
      expect(console.warn).toHaveBeenCalledTimes(1);

      state = "stray";
      await rerender(host);
      expect(console.warn).toHaveBeenCalledTimes(2);
      expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining("<span>"));

      await rerender(host);
      expect(console.warn).toHaveBeenCalledTimes(2);
    });
  });
});
