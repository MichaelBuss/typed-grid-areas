<script module lang="ts">
  import {
    type PreferenceCardOptional,
    preferenceCardGrid,
    preferenceContentGrid,
  } from "@typed-grid-areas/acceptance";
  import { createGridComponent } from "../lib/index.ts";

  const PreferenceContent = createGridComponent(preferenceContentGrid);
  const PreferenceCard = createGridComponent(preferenceCardGrid, {
    nest: { content: PreferenceContent },
  });
</script>

<script lang="ts">
  let { present, width }: { present: ReadonlyArray<PreferenceCardOptional>; width: number } =
    $props();
  const has = (area: PreferenceCardOptional) => present.includes(area);
</script>

<div style="width: {width}px">
  <PreferenceCard>
    {#if has("input")}
      <PreferenceCard.input style="display: flex; align-items: center; padding: 16px">
        {#snippet child({ props })}
          <label {...props}><input type="checkbox" aria-label="Weekly digest" /></label>
        {/snippet}
      </PreferenceCard.input>
    {/if}
    <PreferenceCard.content style="gap: 8px; padding: 16px">
      {#if has("icon")}
        <PreferenceCard.content.icon>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </PreferenceCard.content.icon>
      {/if}
      <PreferenceCard.content.information style="display: flex; flex-direction: column; gap: 4px">
        <div style="display: flex; align-items: center; gap: 8px">
          <strong data-part="title">Weekly digest</strong>
          <span data-part="titleTag">New</span>
        </div>
        <p data-part="description" style="margin: 0">
          A summary of everything that happened in your projects this week.
        </p>
      </PreferenceCard.content.information>
      {#if has("cardTag")}
        <PreferenceCard.content.cardTag>
          <span>Recommended</span>
        </PreferenceCard.content.cardTag>
      {/if}
      {#if has("children")}
        <PreferenceCard.content.children>
          <button type="button">Choose a day</button>
        </PreferenceCard.content.children>
      {/if}
    </PreferenceCard.content>
  </PreferenceCard>
</div>
