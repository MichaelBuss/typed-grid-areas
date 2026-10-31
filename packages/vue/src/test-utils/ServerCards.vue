<script setup lang="ts">
/** Two definitions, one nested in the other, each rendered more than once. */
import { createGridComponent } from "../index.ts";
import { cardGrid, contentGrid } from "./serverDefinitions.ts";

defineProps<{ count: number }>();

const Content = createGridComponent(contentGrid);
const Card = createGridComponent(cardGrid, { nest: { content: Content } });
</script>

<template>
  <main>
    <Card v-for="index in count" :key="index" class="card">
      <Card.input v-if="index % 2 === 0" as-child>
        <label><input type="checkbox" /></label>
      </Card.input>
      <Card.content>
        <Card.content.icon>★</Card.content.icon>
        <Card.content.title>Card {{ index }}</Card.content.title>
      </Card.content>
    </Card>
  </main>
</template>
