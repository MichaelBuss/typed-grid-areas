<script lang="ts">
  import { Card } from "./grids.ts";

  /** The instances to render, by key, in order. */
  let { keys }: { keys: ReadonlyArray<number> } = $props();
</script>

{#each keys as key (key)}
  <Card data-key={key}>
    <Card.info>Card {key}</Card.info>
  </Card>
{/each}
