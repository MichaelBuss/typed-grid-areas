<script setup lang="ts">
/** A grid and a slot rendered `as-child`, each with attributes of its own on both sides. */
import { onMounted, ref } from "vue";
import { defineLayout } from "typed-grid-areas";
import { createGridComponent } from "../index.ts";

const props = defineProps<{
  onSlotClick: () => void;
  onChildClick: () => void;
  onRefs: (refs: { grid: HTMLElement | null; label: HTMLElement | null }) => void;
}>();

const Card = createGridComponent(
  defineLayout({
    areas: ["input", "content"],
    layouts: [{ template: "input content", columns: "40px minmax(0, 1fr)" }],
  }),
);

const grid = ref<HTMLElement | null>(null);
const label = ref<HTMLElement | null>(null);
onMounted(() => props.onRefs({ grid: grid.value, label: label.value }));
</script>

<template>
  <div style="width: 300px">
    <Card as-child class="from-grid" title="from the grid" data-testid="card">
      <section ref="grid" class="own-grid" title="the section's own" data-grid-id="not-this">
        <Card.input
          as-child
          class="from-slot"
          style="color: rgb(255, 0, 0)"
          title="from the slot"
          data-area="not-this"
          @click="onSlotClick"
        >
          <!-- A comment before the child is skipped. -->
          <label
            ref="label"
            class="own"
            style="padding: 3px"
            title="the label's own"
            @click="onChildClick"
          >
            Notify me
          </label>
        </Card.input>
        <Card.content />
      </section>
    </Card>
  </div>
</template>
