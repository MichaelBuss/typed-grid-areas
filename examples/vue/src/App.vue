<script setup lang="ts">
import PreferenceCard from "./PreferenceCard.vue";
</script>

<template>
  <main>
    <h1>typed-grid-areas with Vue</h1>
    <div class="cards">
      <PreferenceCard selectable title="Weekly digest" tag="New">
        <template #icon>★</template>
        Sent on Mondays at 8:00
      </PreferenceCard>
      <PreferenceCard title="Monthly report">
        <template #icon>★</template>
      </PreferenceCard>
      <PreferenceCard title="Security alerts" tag="Recommended" />
    </div>
  </main>
</template>
