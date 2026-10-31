<script lang="ts">
  import { Card } from "./grids.ts";

  let keys = $state([1, 2, 3]);

  /** Unmounts the instance with this key. */
  export function remove(key: number): void {
    keys = keys.filter(other => other !== key);
  }
</script>

{#each keys as key (key)}
  <Card data-key={key}>
    <Card.info>Card {key}</Card.info>
  </Card>
{/each}
