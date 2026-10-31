<script lang="ts">
  import { Card } from "./grids.ts";

  let {
    info = true,
    stray = false,
    ownGrid = false,
  }: {
    /** Renders the required `info` slot. */
    info?: boolean;
    /** Renders a `<span>` as a direct child of the grid. */
    stray?: boolean;
    /** Renders the grid as your own `<section>`, through a `child` snippet. */
    ownGrid?: boolean;
  } = $props();
</script>

{#snippet slots()}
  <Card.icon />
  {#if info}
    <Card.info />
  {/if}
  {#if stray}
    <span>stray</span>
  {/if}
{/snippet}

{#if ownGrid}
  <Card>
    {#snippet child({ props })}
      <section {...props}>{@render slots()}</section>
    {/snippet}
  </Card>
{:else}
  <Card>{@render slots()}</Card>
{/if}
