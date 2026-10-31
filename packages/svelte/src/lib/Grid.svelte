<!--
  @component
  A grid instance: its size container (when the definition has breakpoints),
  the grid element (a `div`, or the element your `child` snippet renders),
  and the definition's CSS in `<svelte:head>`. Rendered through the component
  `createGridComponent` returns, which supplies `definition` and `outerArea`.
-->
<script lang="ts">
  import { BROWSER, DEV } from "esm-env";
  import { onDestroy, untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import type { GridConfig } from "typed-grid-areas";
  import { gridMarkup, gridStyleTags } from "typed-grid-areas/adapter";
  import { slotCheckAttachment } from "./slotCheck.ts";
  import { claimServerStyle, joinStyleOwners } from "./styleOwners.ts";
  import type { GridRootProps } from "./types.ts";

  type Props = GridRootProps & {
    definition: GridConfig<string>;
    outerArea?: string;
  };

  let { definition, outerArea, child, children, ...rest }: Props = $props();

  // `createGridComponent` fixes the definition for good.
  const config = untrack(() => definition);
  const markup = gridMarkup(config);
  const styleTag = gridStyleTags([config]);

  // Whether this instance renders the definition's CSS: one per definition does.
  let ownsStyle = $state(false);
  if (BROWSER) {
    const membership = joinStyleOwners(markup.id, () => (ownsStyle = true));
    ownsStyle = membership.owns;
    onDestroy(membership.leave);
  } else {
    ownsStyle = claimServerStyle(markup.id);
  }

  // In development, the grid element (yours too, through `child`) checks its slots.
  const checkSlots = DEV ? { [createAttachmentKey()]: slotCheckAttachment(config) } : {};

  const elements = $derived(markup.elements(outerArea));
  const gridProps = $derived({ ...rest, ...elements.grid.attributes, ...checkSlots });
</script>

<svelte:head>
  {#if ownsStyle}
    {@html styleTag}
  {/if}
</svelte:head>

{#snippet grid()}
  {#if child}
    {@render child({ props: gridProps })}
  {:else}
    <div {...gridProps}>{@render children?.()}</div>
  {/if}
{/snippet}

{#if elements.sizeContainer}
  <div {...elements.sizeContainer.attributes} style={elements.sizeContainer.styleText}>
    {@render grid()}
  </div>
{:else}
  {@render grid()}
{/if}
