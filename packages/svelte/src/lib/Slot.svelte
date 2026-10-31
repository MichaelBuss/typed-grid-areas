<!--
  @component
  The slot filling one area: a `div`, or the element your `child` snippet
  renders, marked with the area's `data-area`. Rendered through the
  component `createGridComponent` returns, which supplies `area`.
-->
<script lang="ts">
  import type { SlotProps } from "./types.ts";

  type Props = SlotProps & { area: string };

  let { area, child, children, ...rest }: Props = $props();

  const slotProps = $derived({ ...rest, "data-area": area });
</script>

{#if child}
  {@render child({ props: slotProps })}
{:else}
  <div {...slotProps}>{@render children?.()}</div>
{/if}
