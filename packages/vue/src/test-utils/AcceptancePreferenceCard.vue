<script setup lang="ts">
/** The PreferenceCard design of the shared acceptance tests, in Vue. */
import {
  type PreferenceCardOptional,
  preferenceCardGrid,
  preferenceContentGrid,
} from "@typed-grid-areas/acceptance";
import { createGridComponent } from "../index.ts";

const props = defineProps<{ present: ReadonlyArray<PreferenceCardOptional>; width: number }>();
const has = (area: PreferenceCardOptional) => props.present.includes(area);

const PreferenceContent = createGridComponent(preferenceContentGrid);
const PreferenceCard = createGridComponent(preferenceCardGrid, {
  nest: { content: PreferenceContent },
});
</script>

<template>
  <div :style="{ width: `${width}px` }">
    <PreferenceCard>
      <PreferenceCard.input
        v-if="has('input')"
        as-child
        style="display: flex; align-items: center; padding: 16px"
      >
        <label><input type="checkbox" aria-label="Weekly digest" /></label>
      </PreferenceCard.input>
      <PreferenceCard.content style="gap: 8px; padding: 16px">
        <PreferenceCard.content.icon v-if="has('icon')">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </PreferenceCard.content.icon>
        <PreferenceCard.content.information style="display: flex; flex-direction: column; gap: 4px">
          <div style="display: flex; align-items: center; gap: 8px">
            <strong data-part="title">Weekly digest</strong>
            <span data-part="titleTag">New</span>
          </div>
          <p data-part="description" style="margin: 0">
            A summary of everything that happened in your projects this week.
          </p>
        </PreferenceCard.content.information>
        <PreferenceCard.content.cardTag v-if="has('cardTag')">
          <span>Recommended</span>
        </PreferenceCard.content.cardTag>
        <PreferenceCard.content.children v-if="has('children')">
          <button type="button">Choose a day</button>
        </PreferenceCard.content.children>
      </PreferenceCard.content>
    </PreferenceCard>
  </div>
</template>
