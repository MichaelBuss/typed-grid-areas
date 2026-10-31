/** @jsxImportSource octane */
/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { render } from "@octanejs/testing-library";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent";

const Card = createGridComponent(
  defineLayout({
    areas: ["icon?", "info"],
    layouts: [{ template: "icon info" }],
  }),
);

function Example({ info = true, stray = false, label = "" }) {
  return (
    <Card>
      <Card.icon>{label}</Card.icon>
      {info && <Card.info />}
      {stray && <span>stray</span>}
    </Card>
  );
}

describe("grid components in development", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns once when a required area's slot isn't rendered", () => {
    render(<Example info={false} />);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: .*required area "info"/),
    );
  });

  it("warns once when a grid has a direct child that isn't a slot, naming render", () => {
    render(<Example stray />);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: <span>.*render=\{<element \/>\}/),
    );
  });

  it("doesn't warn when only optional slots are absent", () => {
    render(
      <Card>
        <Card.info />
      </Card>,
    );

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns after an update that introduces a problem, and not again while it persists", () => {
    const { rerender } = render(<Example />);
    expect(console.warn).not.toHaveBeenCalled();

    rerender(<Example stray />);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining("<span>"));

    rerender(<Example stray label="changed" />);
    expect(console.warn).toHaveBeenCalledTimes(1);

    rerender(<Example stray info={false} label="changed" />);
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('required area "info"'));
  });
});
