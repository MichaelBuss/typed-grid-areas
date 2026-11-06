<script module lang="ts">
  import { createGridComponent } from "@typed-grid-areas/svelte";
  import { preferenceCardGrid, preferenceContentGrid } from "./designs";

  const Content = createGridComponent(preferenceContentGrid);
  const Card = createGridComponent(preferenceCardGrid, { nest: { content: Content } });
</script>

<script lang="ts">
  import type { Snippet } from "svelte";

  // Optional areas are absent when their slot isn't rendered: leave out a prop to see the layout change.
  let {
    selectable = false,
    icon,
    title,
    tag,
    children,
  }: {
    selectable?: boolean;
    icon?: Snippet;
    title: string;
    tag?: string;
    children?: Snippet;
  } = $props();
</script>

<Card class="card">
  {#if selectable}
    <Card.input>
      {#snippet child({ props })}
        <label {...props} class="panel input"><input type="checkbox" checked aria-label={title} /></label>
      {/snippet}
    </Card.input>
  {/if}
  <Card.content class="panel content">
    <!-- Misspell an area, say <Card.content.iconn>, and `npm run typecheck` reports it. -->
    {#if icon}
      <Card.content.icon>{@render icon()}</Card.content.icon>
    {/if}
    <Card.content.information>{title}</Card.content.information>
    {#if tag}
      <Card.content.cardTag class="tag">{tag}</Card.content.cardTag>
    {/if}
    {#if children}
      <Card.content.children>{@render children()}</Card.content.children>
    {/if}
  </Card.content>
</Card>
