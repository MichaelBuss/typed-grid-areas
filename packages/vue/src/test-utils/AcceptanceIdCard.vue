<script setup lang="ts">
/** The ID card design of the shared acceptance tests, in Vue. */
import { idCardGrid, idCardImages, type IdCardOptional } from "@typed-grid-areas/acceptance";
import { createGridComponent } from "../index.ts";

const props = defineProps<{ present: ReadonlyArray<IdCardOptional>; width: number }>();
const has = (area: IdCardOptional) => props.present.includes(area);

const IdCard = createGridComponent(idCardGrid);
const fill = "width: 100%; height: 100%; object-fit: cover";
</script>

<template>
  <div :style="{ width: `${width}px` }">
    <IdCard>
      <IdCard.photo as-child>
        <img :src="idCardImages.photo" alt="" :style="fill" />
      </IdCard.photo>
      <IdCard.logo v-if="has('logo')" style="padding: 4px">ACME</IdCard.logo>
      <IdCard.badge v-if="has('badge')" style="padding: 4px; text-align: right">
        <span aria-label="Verified">✓</span>
      </IdCard.badge>
      <IdCard.identity style="padding: 4px"><strong>Ada Lovelace</strong></IdCard.identity>
      <IdCard.details style="padding: 4px">Analyst, Engine Division</IdCard.details>
      <IdCard.qr v-if="has('qr')" as-child>
        <img :src="idCardImages.qr" alt="QR code" :style="[fill, { objectFit: 'contain' }]" />
      </IdCard.qr>
    </IdCard>
  </div>
</template>
