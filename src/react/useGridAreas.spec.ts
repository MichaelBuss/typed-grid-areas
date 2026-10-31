import { renderHook } from "@testing-library/react";
import { useMemo } from "react";
import { defineLayout } from "../defineLayout";
import { GridConfig } from "../types";
import { useGridAreas } from "./useGridAreas";

// Test grid config defined at module level (as recommended usage)
const testGridConfig = defineLayout({
  areas: ["icon", "info", "tag"],
  layouts: [
    { template: "info" },
    {
      when: ["icon", "info"],
      template: "icon info",
      columns: "48px 1fr",
    },
  ],
});

describe("useGridAreas", () => {
  it("should return slots, css, and containerProps", () => {
    const { result } = renderHook(() => useGridAreas(testGridConfig));

    // Verify slots are generated
    expect(result.current.slots.icon).toEqual({ "data-area": "icon" });
    expect(result.current.slots.info).toEqual({ "data-area": "info" });
    expect(result.current.slots.tag).toEqual({ "data-area": "tag" });

    // Verify CSS is generated
    expect(result.current.css).toContain("grid-template-areas");
    expect(result.current.css).toContain("data-grid-id");

    // Verify containerProps
    expect(result.current.containerProps).toHaveProperty("data-grid-id");
  });

  it("should generate consistent id across re-renders", () => {
    const { result, rerender } = renderHook(() => useGridAreas(testGridConfig));

    const initialId = result.current.containerProps["data-grid-id"];

    rerender();

    expect(result.current.containerProps["data-grid-id"]).toBe(initialId);
  });

  it("should memoize slots when config.areas does not change", () => {
    const { result, rerender } = renderHook(() => useGridAreas(testGridConfig));

    const initialSlots = result.current.slots;

    rerender();

    expect(result.current.slots).toBe(initialSlots);
  });

  it("should memoize css when config does not change", () => {
    const { result, rerender } = renderHook(() => useGridAreas(testGridConfig));

    const initialCss = result.current.css;

    rerender();

    expect(result.current.css).toBe(initialCss);
  });

  it("should memoize containerProps when id does not change", () => {
    const { result, rerender } = renderHook(() => useGridAreas(testGridConfig));

    const initialContainerProps = result.current.containerProps;

    rerender();

    expect(result.current.containerProps).toBe(initialContainerProps);
  });

  it("should preserve referential stability when the config object is stable", () => {
    const { result, rerender } = renderHook(() => {
      const config = useMemo(() => testGridConfig, []);
      return useGridAreas(config);
    });

    const initialResult = result.current;

    rerender();

    expect(result.current).toBe(initialResult);
  });

  describe("development validation", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.restoreAllMocks();
    });

    it("leaves validation to defineLayout, which runs it once per definition", () => {
      const invalidConfig: GridConfig<string> = {
        areas: ["icon"],
        layouts: [
          {
            layout: [["icon", "unknown"]],
          },
        ],
      };

      renderHook(() => useGridAreas(invalidConfig));

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
