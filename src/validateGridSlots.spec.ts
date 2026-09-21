import { validateGridSlots } from "./validateGridSlots";

describe("validateGridSlots", () => {
  type ChildConfig = {
    tagName: string;
    dataSlot?: string;
    gridArea?: string;
  };

  function createMockContainer(children: Array<ChildConfig>): HTMLElement {
    const container = document.createElement("div");

    for (const child of children) {
      const element = document.createElement(child.tagName);
      if (child.dataSlot !== undefined) {
        element.setAttribute("data-slot", child.dataSlot);
      }
      if (child.gridArea !== undefined) {
        element.style.gridArea = child.gridArea;
      }
      container.appendChild(element);
    }

    return container;
  }

  describe("unwired children detection", () => {
    it("should warn when child is missing both data-slot and gridArea", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "icon", gridArea: "icon" },
        { tagName: "span" }, // Missing both
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("without slot props"));
      expect(warnings).toContainEqual(expect.stringContaining("<span> at index 1"));
    });

    it("should warn for multiple unwired children", () => {
      const container = createMockContainer([
        { tagName: "div" }, // Missing both
        { tagName: "span" }, // Missing both
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(
        expect.stringContaining("2 child element(s) without slot props"),
      );
      expect(warnings).toContainEqual(expect.stringContaining("<div> at index 0"));
      expect(warnings).toContainEqual(expect.stringContaining("<span> at index 1"));
    });

    it("should include hint about spreading slot props", () => {
      const container = createMockContainer([{ tagName: "div" }]);

      const warnings = validateGridSlots(container, ["icon"]);

      expect(warnings).toContainEqual(
        expect.stringContaining("Did you forget to spread {...slots.name}"),
      );
    });
  });

  describe("partial slot props detection", () => {
    it("should warn when child has data-slot but missing gridArea", () => {
      const container = createMockContainer([{ tagName: "div", dataSlot: "icon" }]); // Missing gridArea

      const warnings = validateGridSlots(container, ["icon"]);

      expect(warnings).toContainEqual(expect.stringContaining("incomplete slot props"));
      expect(warnings).toContainEqual(expect.stringContaining('data-slot="icon"'));
      expect(warnings).toContainEqual(expect.stringContaining("missing style.gridArea"));
    });

    it("should warn when child has gridArea but missing data-slot", () => {
      const container = createMockContainer([{ tagName: "div", gridArea: "icon" }]); // Missing data-slot

      const warnings = validateGridSlots(container, ["icon"]);

      expect(warnings).toContainEqual(expect.stringContaining("incomplete slot props"));
      expect(warnings).toContainEqual(expect.stringContaining('style.gridArea="icon"'));
      expect(warnings).toContainEqual(expect.stringContaining("missing data-slot"));
    });

    it("should include hint about using full slot props spread", () => {
      const container = createMockContainer([{ tagName: "div", dataSlot: "icon" }]);

      const warnings = validateGridSlots(container, ["icon"]);

      expect(warnings).toContainEqual(
        expect.stringContaining("spread the full slot props {...slots.name}"),
      );
    });
  });

  describe("mismatched slot values detection", () => {
    it("should warn when data-slot and gridArea values don't match", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "icon", gridArea: "info" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("mismatched slot values"));
      expect(warnings).toContainEqual(expect.stringContaining('data-slot="icon"'));
      expect(warnings).toContainEqual(expect.stringContaining('style.gridArea="info"'));
    });

    it("should include hint about consistency", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "icon", gridArea: "info" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("should have the same value"));
    });
  });

  describe("unknown slot detection", () => {
    it("should warn when child has unknown slot name", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "icon", gridArea: "icon" },
        { tagName: "span", dataSlot: "unknown", gridArea: "unknown" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("unknown slot names"));
      expect(warnings).toContainEqual(expect.stringContaining('data-slot="unknown"'));
    });

    it("should list valid slot names in warning", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "badname", gridArea: "badname" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info", "tag"]);

      expect(warnings).toContainEqual(
        expect.stringContaining("Valid slot names are: icon, info, tag"),
      );
    });
  });

  describe("valid configurations", () => {
    it("should return empty array when all children have valid complete slots", () => {
      const container = createMockContainer([
        { tagName: "div", dataSlot: "icon", gridArea: "icon" },
        { tagName: "span", dataSlot: "info", gridArea: "info" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toHaveLength(0);
    });

    it("should return empty array for empty container", () => {
      const container = createMockContainer([]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toHaveLength(0);
    });
  });
});
