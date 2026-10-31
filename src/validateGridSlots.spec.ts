import { validateGridSlots } from "./validateGridSlots";

describe("validateGridSlots", () => {
  type ChildConfig = {
    tagName: string;
    area?: string;
  };

  function createMockContainer(children: Array<ChildConfig>): HTMLElement {
    const container = document.createElement("div");

    for (const child of children) {
      const element = document.createElement(child.tagName);
      if (child.area !== undefined) {
        element.setAttribute("data-area", child.area);
      }
      container.appendChild(element);
    }

    return container;
  }

  describe("unwired children detection", () => {
    it("should warn when child has no data-area", () => {
      const container = createMockContainer([
        { tagName: "div", area: "icon" },
        { tagName: "span" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("without slot props"));
      expect(warnings).toContainEqual(expect.stringContaining("<span> at index 1"));
    });

    it("should not treat the old data-slot attribute as a slot", () => {
      const container = document.createElement("div");
      const legacy = document.createElement("div");
      legacy.setAttribute("data-slot", "icon");
      container.appendChild(legacy);

      const warnings = validateGridSlots(container, ["icon"]);

      expect(warnings).toContainEqual(expect.stringContaining("without slot props"));
    });

    it("should warn for multiple unwired children", () => {
      const container = createMockContainer([{ tagName: "div" }, { tagName: "span" }]);

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

  describe("unknown slot detection", () => {
    it("should warn when child has unknown slot name", () => {
      const container = createMockContainer([
        { tagName: "div", area: "icon" },
        { tagName: "span", area: "unknown" },
      ]);

      const warnings = validateGridSlots(container, ["icon", "info"]);

      expect(warnings).toContainEqual(expect.stringContaining("unknown slot names"));
      expect(warnings).toContainEqual(expect.stringContaining('data-area="unknown"'));
    });

    it("should list valid slot names in warning", () => {
      const container = createMockContainer([{ tagName: "div", area: "badname" }]);

      const warnings = validateGridSlots(container, ["icon", "info", "tag"]);

      expect(warnings).toContainEqual(
        expect.stringContaining("Valid slot names are: icon, info, tag"),
      );
    });
  });

  describe("valid configurations", () => {
    it("should return empty array when all children are valid slots", () => {
      const container = createMockContainer([
        { tagName: "div", area: "icon" },
        { tagName: "span", area: "info" },
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
