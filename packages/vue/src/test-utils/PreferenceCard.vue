<script setup lang="ts">
/** The nested PreferenceCard of the browser specs, with fixed tracks to measure. */
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../index.ts";

defineProps<{ input?: boolean }>();

const Content = createGridComponent(
  defineLayout({
    areas: ["icon?", "information", "cardTag?", "children?"],
    layouts: [
      {
        template: "icon cardTag / information information / children children",
        rows: "20px 30px 40px",
        columns: "48px minmax(0, 1fr)",
      },
    ],
  }),
);

const Card = createGridComponent(
  defineLayout({
    areas: ["input?", "content"],
    layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
  }),
  { nest: { content: Content } },
);
</script>

<template>
  <div style="width: 300px">
    <Card data-testid="card" class="card">
      <Card.input v-if="input" />
      <Card.content>
        <Card.content.icon />
        <Card.content.cardTag />
        <Card.content.information />
        <Card.content.children />
      </Card.content>
    </Card>
  </div>
</template>
