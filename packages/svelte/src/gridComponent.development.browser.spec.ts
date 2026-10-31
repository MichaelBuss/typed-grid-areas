/**
 * Runs in the `browser-development` project, under the `development`
 * condition, where `esm-env`'s `DEV` is true.
 */
import { tick } from "svelte";
import { render } from "vitest-browser-svelte";
import Checked from "./fixtures/Checked.svelte";

/** Lets the grid's slot check see the latest DOM (it observes mutations). */
async function settle(): Promise<void> {
  await tick();
  await new Promise(resolve => setTimeout(resolve, 0));
}

const missingInfo = expect.stringMatching(/^typed-grid-areas: no slot for the required area "info"/);
const straySpan = expect.stringMatching(
  /^typed-grid-areas: <span> at index \d is a direct child .* make it a slot with a `child` snippet\.$/,
);

describe("in development, a grid", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns once after mount when a required area's slot isn't rendered", async () => {
    await render(Checked, { info: false });
    await settle();

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(missingInfo);
  });

  it("warns about a direct child that isn't a slot, naming the child snippet", async () => {
    await render(Checked, { stray: true });
    await settle();

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(straySpan);
  });

  it("doesn't warn when only optional slots are absent", async () => {
    await render(Checked);
    await settle();

    expect(console.warn).not.toHaveBeenCalled();
  });

  it("warns again after an update that introduces problems, once per distinct set", async () => {
    const { rerender } = await render(Checked);
    await settle();

    await rerender({ info: false });
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenLastCalledWith(missingInfo);

    await rerender({ info: false, stray: false });
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(1);

    await rerender({ info: false, stray: true });
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(3);
    expect(console.warn).toHaveBeenNthCalledWith(2, missingInfo);
    expect(console.warn).toHaveBeenNthCalledWith(3, straySpan);
  });

  it("checks your own element as the grid too", async () => {
    const { rerender } = await render(Checked, { ownGrid: true, info: false });
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(missingInfo);

    await rerender({ ownGrid: true, info: true, stray: true });
    await settle();
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenLastCalledWith(straySpan);
  });
});
