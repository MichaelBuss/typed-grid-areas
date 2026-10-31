<script setup lang="ts">
/**
 * Compile-time checks of grid components in a template, run by vue-tsc in
 * `npm run typecheck`. Each `@vue-expect-error` must stay an error, so the
 * typecheck fails if a check goes missing.
 */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "./index.ts";

defineProps<{ selectable: boolean }>();

const Content = createGridComponent(
  defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
);
const Card = createGridComponent(
  defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
  { nest: { content: Content } },
);
</script>

<template>
  <!-- The definition's slots, and the nested grid's slots through its area. -->
  <Card class="gap-4" aria-label="Card">
    <Card.input v-if="selectable" as-child
      ><label><input type="checkbox" /></label
    ></Card.input>
    <Card.content class="p-4">
      <Card.content.icon>★</Card.content.icon>
      <Card.content.title>Title</Card.content.title>
    </Card.content>
  </Card>

  <Card>
    <!-- @vue-expect-error `inputt` is not an area of Card -->
    <Card.inputt />
    <Card.content>
      <!-- @vue-expect-error `iconn` is not an area of the nested grid -->
      <Card.content.iconn />
      <!-- @vue-expect-error `input` is an area of Card, not of the nested grid -->
      <Card.content.input />
      <Card.content.title />
    </Card.content>
  </Card>
</template>
