<script lang="ts">
  import PreferenceCard from "./PreferenceCard.svelte";
</script>

{#snippet star()}★{/snippet}

<main>
  <h1>typed-grid-areas with Svelte</h1>
  <div class="cards">
    <PreferenceCard selectable icon={star} title="Weekly digest" tag="New">
      Sent on Mondays at 8:00
    </PreferenceCard>
    <PreferenceCard icon={star} title="Monthly report" />
    <PreferenceCard title="Security alerts" tag="Recommended" />
  </div>
</main>
