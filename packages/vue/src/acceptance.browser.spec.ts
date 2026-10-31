/**
 * Acceptance for issue #4, with Vue's mounting: the two target designs,
 * rendered with real content through the Vue adapter, place every slot
 * correctly in every combination of their optional areas. The checks
 * themselves are shared by every adapter.
 */
import { describeIdCard, describePreferenceCard } from "@typed-grid-areas/acceptance";
import { render } from "vitest-browser-vue";
import type { Component } from "vue";
import AcceptanceIdCard from "./test-utils/AcceptanceIdCard.vue";
import AcceptancePreferenceCard from "./test-utils/AcceptancePreferenceCard.vue";

/** Renders a design into its `width` px wrapper and returns its outermost element. */
async function mount(design: Component, props: Record<string, unknown>): Promise<HTMLElement> {
  const { container } = await render(design, { props });
  const root = container.firstElementChild?.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("mount: nothing was rendered");
  }
  return root;
}

describePreferenceCard((present, width) => mount(AcceptancePreferenceCard, { present, width }));
describeIdCard((present, width) => mount(AcceptanceIdCard, { present, width }));
