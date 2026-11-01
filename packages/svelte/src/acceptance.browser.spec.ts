/**
 * Acceptance for issue #4, with Svelte's mounting: the two target designs,
 * rendered with real content through the Svelte adapter, place every slot
 * correctly in every combination of their optional areas. The checks
 * themselves are shared by every adapter; the designs' markup is in
 * `fixtures/PreferenceCard.svelte` and `fixtures/IdCard.svelte`.
 */
import { describeIdCard, describePreferenceCard } from "@typed-grid-areas/acceptance";
import type { Component } from "svelte";
import { render } from "vitest-browser-svelte";
import IdCard from "./fixtures/IdCard.svelte";
import PreferenceCard from "./fixtures/PreferenceCard.svelte";

/** Renders a design (inside its `width` px wrapper) and returns its outermost element. */
async function mount<TProps extends Record<string, unknown>>(
  design: Component<TProps>,
  props: TProps,
): Promise<HTMLElement> {
  const { container } = await render(design, props);
  const root = container.firstElementChild?.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mount: nothing was rendered");
  }
  return root;
}

describePreferenceCard((present, width) => mount(PreferenceCard, { present, width }));
describeIdCard((present, width) => mount(IdCard, { present, width }));
