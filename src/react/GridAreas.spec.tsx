import { render } from "@testing-library/react";
import { createRef } from "react";
import { createGrid } from "../createGrid";
import { GridAreas } from "./GridAreas";
import { useGridAreas } from "./useGridAreas";

const cardGrid = createGrid()
  .areas(["icon", "info"])
  .layout({ layout: [["icon", "info"]] })
  .build();

const responsiveGrid = createGrid()
  .areas(["icon", "info"])
  .layout({ layout: [["icon"], ["info"]], breakpoints: { "@sm": { layout: [["icon", "info"]] } } })
  .build();

function Card({ asChild = false }: { asChild?: boolean }) {
  const gridAreas = useGridAreas(cardGrid);

  return (
    <GridAreas {...gridAreas} asChild={asChild} data-testid="grid" className="gap-4">
      {slots =>
        asChild ? (
          <section aria-label="card" {...slots.icon} />
        ) : (
          <>
            <span {...slots.icon}>icon</span>
            <span {...slots.info}>info</span>
          </>
        )
      }
    </GridAreas>
  );
}

describe("GridAreas", () => {
  it("renders a style tag with the generated CSS and a container carrying containerProps/className", () => {
    const { container, getByTestId } = render(<Card />);

    expect(container.querySelector("style")).toHaveTextContent("grid-template-areas");

    const grid = getByTestId("grid");
    expect(grid.tagName).toBe("DIV");
    expect(grid).toHaveAttribute("data-grid-id");
    expect(grid.className).toBe("gap-4");
    expect(grid.style.display).toBe("grid");
  });

  it("renders a grid without breakpoints with no wrapper, and not as a size container", () => {
    const { container, getByTestId } = render(<Card />);

    const grid = getByTestId("grid");
    expect(grid.parentElement).toBe(container);
    expect(grid.style.containerType).toBe("");
  });

  it("wraps a grid with breakpoints in its own named size container", () => {
    function Responsive() {
      const gridAreas = useGridAreas(responsiveGrid);
      return (
        <GridAreas {...gridAreas} data-testid="grid">
          {slots => <span {...slots.icon} />}
        </GridAreas>
      );
    }

    const { container, getByTestId } = render(<Responsive />);

    const wrapper = getByTestId("grid").parentElement;
    expect(wrapper?.parentElement).toBe(container);
    expect(wrapper?.style.containerType).toBe("inline-size");
    expect(wrapper?.style.containerName).not.toBe("");
    expect(container.querySelector("style")).toHaveTextContent(
      `@container ${wrapper?.style.containerName} (min-width: 24rem)`,
    );
  });

  it("renders the slots returned by the render prop", () => {
    const { getByText } = render(<Card />);

    expect(getByText("icon")).toHaveAttribute("data-area", "icon");
    expect(getByText("info")).toHaveAttribute("data-area", "info");
  });

  it("gives two instances of one definition identical CSS and the same scope", () => {
    const { container } = render(
      <>
        <Card />
        <Card />
      </>,
    );

    const [firstStyle, secondStyle] = Array.from(container.querySelectorAll("style"));
    const [firstGrid, secondGrid] = Array.from(container.querySelectorAll("[data-grid-id]"));

    expect(firstStyle?.textContent).toBeTruthy();
    expect(secondStyle?.textContent).toBe(firstStyle?.textContent);
    expect(secondGrid?.getAttribute("data-grid-id")).toBe(firstGrid?.getAttribute("data-grid-id"));
  });

  it("scopes different definitions differently", () => {
    const otherGrid = createGrid()
      .areas(["icon", "info"])
      .layout({ layout: [["info", "icon"]] })
      .build();

    function OtherCard() {
      const gridAreas = useGridAreas(otherGrid);
      return <GridAreas {...gridAreas}>{slots => <span {...slots.icon} />}</GridAreas>;
    }

    const { container } = render(
      <>
        <Card />
        <OtherCard />
      </>,
    );

    const [firstGrid, secondGrid] = Array.from(container.querySelectorAll("[data-grid-id]"));
    expect(secondGrid?.getAttribute("data-grid-id")).not.toBe(
      firstGrid?.getAttribute("data-grid-id"),
    );
  });

  it("renders asChild as the single element returned by the render prop instead of a div", () => {
    const { getByTestId } = render(<Card asChild />);

    const grid = getByTestId("grid");
    expect(grid.tagName).toBe("SECTION");
    expect(grid).toHaveAttribute("aria-label", "card");
    expect(grid.className).toBe("gap-4");
  });

  it("forwards the ref to the container element", () => {
    const ref = createRef<HTMLDivElement>();

    function WithRef() {
      const gridAreas = useGridAreas(cardGrid);
      return (
        <GridAreas {...gridAreas} ref={ref}>
          {slots => <span {...slots.icon} />}
        </GridAreas>
      );
    }

    render(<WithRef />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  describe("development slot validation", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = "development";
      vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
      vi.restoreAllMocks();
    });

    it("warns when a child is not wired up to any slot", () => {
      function Unwired() {
        const gridAreas = useGridAreas(cardGrid);
        return (
          <GridAreas {...gridAreas}>
            {slots => (
              <>
                <span {...slots.icon} />
                <span>unwired</span>
              </>
            )}
          </GridAreas>
        );
      }

      render(<Unwired />);

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("GridAreas:"));
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("without slot props"));
    });

    it("does not warn when every child is wired to a valid slot", () => {
      render(<Card />);

      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
