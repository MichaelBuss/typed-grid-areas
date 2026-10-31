/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { render } from "vitest-browser-react";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent.tsx";

describe("grid components", () => {
  describe("in development", () => {
    const Card = createGridComponent(
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
      await render(
        <Card>
          <Card.icon />
        </Card>,
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('required area "info"'));
    });

    it("warns when a grid has a direct child that isn't a slot", async () => {
      await render(
        <Card>
          <Card.info />
          <span>stray</span>
        </Card>,
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("<span>"));
    });

    it("doesn't warn when only optional slots are absent", async () => {
      await render(
        <Card>
          <Card.info />
        </Card>,
      );

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
