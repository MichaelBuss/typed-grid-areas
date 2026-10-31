/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { createSignal, JSX, Show } from "solid-js";
import { render } from "solid-js/web";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./gridComponent.tsx";

const disposers: Array<() => void> = [];
function mount(code: () => JSX.Element): void {
  const container = document.createElement("div");
  document.body.append(container);
  const dispose = render(code, container);
  disposers.push(() => {
    dispose();
    container.remove();
  });
}

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
    disposers.splice(0).forEach(dispose => dispose());
    vi.restoreAllMocks();
  });

  it("warns once when a required area's slot isn't rendered", () => {
    mount(() => (
      <Card>
        <Card.icon />
      </Card>
    ));

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: .*required area "info"/),
    );
  });

  it("warns once about a direct child that isn't a slot, naming `as`", () => {
    mount(() => (
      <Card>
        <Card.info />
        <span>stray</span>
      </Card>
    ));

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^typed-grid-areas: <span>.*make it a slot with `as`/),
    );
  });

  it("doesn't warn when only optional slots are absent", () => {
    mount(() => (
      <Card>
        <Card.info />
      </Card>
    ));

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns again after an update that introduces new problems, once per set of problems", () => {
    const [hasIcon, setHasIcon] = createSignal(false);
    const [hasInfo, setHasInfo] = createSignal(true);
    const [hasStray, setHasStray] = createSignal(false);
    mount(() => (
      <Card>
        <Show when={hasIcon()}>
          <Card.icon />
        </Show>
        <Show when={hasInfo()}>
          <Card.info />
        </Show>
        <Show when={hasStray()}>
          <span>stray</span>
        </Show>
      </Card>
    ));
    expect(console.warn).not.toHaveBeenCalled();

    setHasInfo(false);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining('required area "info"'));

    // The slots change, the problems don't: no new warning.
    setHasIcon(true);
    expect(console.warn).toHaveBeenCalledTimes(1);

    setHasStray(true);
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenLastCalledWith(expect.stringContaining("<span>"));
  });
});
