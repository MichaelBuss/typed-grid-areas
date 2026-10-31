/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { render } from "vitest-browser-preact";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

describe("grid components in development", () => {
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

  it("warns when a required area's slot isn't rendered", () => {
    render(
      <Card>
        <Card.icon />
      </Card>,
    );

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: .*required area "info"/),
    );
  });

  it("warns when a grid has a direct child that isn't a slot, naming asChild", () => {
    render(
      <Card>
        <Card.info />
        <span>stray</span>
      </Card>,
    );

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: <span>.*make it a slot with asChild/),
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

  it("warns once per distinct set of problems, again after an update that introduces one", async () => {
    function App({ info, stray }: { info: boolean; stray: boolean }) {
      return (
        <Card>
          {info && <Card.info />}
          {stray && <span>stray</span>}
        </Card>
      );
    }

    const { rerender } = render(<App info={false} stray={false} />);
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledTimes(1));

    rerender(<App info={false} stray={false} />);
    rerender(<App info={true} stray={false} />);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(console.warn).toHaveBeenCalledTimes(1);

    rerender(<App info={true} stray={true} />);
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledTimes(2));
    expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining("<span>"));
  });
});
