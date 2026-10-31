import { defineLayout } from "typed-grid-areas";

/** The definitions `ServerCards.vue` renders. */
export const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "icon title", breakpoints: { "@sm": { template: "title icon" } } }],
});

export const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "32px 1fr" }],
});

/** Rendered by no component. */
export const unusedGrid = defineLayout({
  areas: ["a", "b"],
  layouts: [{ template: "b a" }],
});
