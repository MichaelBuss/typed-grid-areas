<script lang="ts">
  import { Card } from "./grids.ts";

  let { icon }: { icon: boolean } = $props();
</script>

<div style="width: 300px">
  <Card data-testid="card">
    {#if icon}
      <Card.icon />
    {/if}
    <Card.info style="min-height: 10px" />
  </Card>
</div>
