/**
 * Runs in the `browser-development` project, where `process.env.NODE_ENV`
 * is "development".
 */
import { defineLayout } from "typed-grid-areas";
import { render } from "vitest-browser-vue";
import { h, nextTick, ref } from "vue";
import { createGridComponent } from "./index.ts";

describe("grid components in development", () => {
  const Card = createGridComponent(
    defineLayout({
      areas: ["icon?", "info"],
      layouts: [{ template: "icon info" }],
    }),
  );

  const warnings = () =>
    vi
      .mocked(console.warn)
      .mock.calls.filter(([message]) => String(message).startsWith("typed-grid-areas: "));

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns once when a required area's slot isn't rendered", async () => {
    await render(() => h(Card, () => [h(Card.icon)]));

    expect(warnings()).toEqual([[expect.stringContaining('required area "info"')]]);
  });

  it("warns once about a direct child that isn't a slot, naming as-child", async () => {
    await render(() => h(Card, () => [h(Card.info), h("span", "stray")]));

    expect(warnings()).toEqual([[expect.stringContaining("<span> at index 1")]]);
    expect(warnings()[0]![0]).toContain("as-child");
  });

  it("doesn't warn when only optional slots are absent", async () => {
    await render(() => h(Card, () => [h(Card.info)]));

    expect(warnings()).toEqual([]);
  });

  it("warns again after an update that introduces new problems, but not for the same ones", async () => {
    const info = ref(true);
    const stray = ref(false);
    const Example = () =>
      h(Card, () => [info.value ? h(Card.info) : null, stray.value ? h("span") : null]);
    await render(Example);
    expect(warnings()).toEqual([]);

    info.value = false;
    await nextTick();
    expect(warnings()).toHaveLength(1);
    expect(warnings()[0]![0]).toContain('required area "info"');

    // A re-render with the same problem stays quiet.
    stray.value = false;
    info.value = false;
    await nextTick();
    expect(warnings()).toHaveLength(1);

    stray.value = true;
    await nextTick();
    expect(warnings()).toHaveLength(3);
    expect(warnings()[2]![0]).toContain("<span>");
  });

  it("checks a grid rendered as-child", async () => {
    await render(() => h(Card, { asChild: true }, () => [h("section", [h(Card.icon)])]));

    expect(warnings()).toEqual([[expect.stringContaining('required area "info"')]]);
  });
});
