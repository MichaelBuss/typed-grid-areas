<script setup lang="ts">
import { createGridComponent } from "@typed-grid-areas/vue";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

defineProps<{ selectable?: boolean; title: string; tag?: string }>();

const Content = createGridComponent(preferenceContentGrid);
const Card = createGridComponent(preferenceCardGrid, { nest: { content: Content } });
</script>

<!-- Optional areas are absent when their slot isn't rendered: leave out a prop to see the layout change. -->
<template>
  <Card class="card">
    <Card.input v-if="selectable" as-child>
      <label class="panel input"><input type="checkbox" checked :aria-label="title" /></label>
    </Card.input>
    <Card.content class="panel content">
      <!-- Misspell an area, say <Card.content.iconn>, and `npm run typecheck` reports it. -->
      <Card.content.icon v-if="$slots.icon"><slot name="icon" /></Card.content.icon>
      <Card.content.information>{{ title }}</Card.content.information>
      <Card.content.cardTag v-if="tag" class="tag">{{ tag }}</Card.content.cardTag>
      <Card.content.children v-if="$slots.default"><slot /></Card.content.children>
    </Card.content>
  </Card>
</template>
