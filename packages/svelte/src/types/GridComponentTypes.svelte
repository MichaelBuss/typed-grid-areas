<!--
  Compile-time checks of grid components that must pass, run by `svelte-check`
  (`npm run typecheck`). What must fail is in `errors/`, checked by
  `gridComponent.types.node.spec.ts`.
-->
<script lang="ts">
  import { defineLayout } from "typed-grid-areas";
  import { createGridComponent } from "../lib/index.ts";

  const Content = createGridComponent(
    defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
  );
  const Card = createGridComponent(
    defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
    { nest: { content: Content } },
  );
</script>

<!-- The definition's slots, and a nested grid's slots through its area. -->
<Card class="card" aria-label="Card">
  <Card.input>
    {#snippet child({ props })}<label {...props}><input type="checkbox" /></label>{/snippet}
  </Card.input>
  <Card.content style="padding: 8px">
    <Card.content.icon aria-hidden="true">★</Card.content.icon>
    <Card.content.title>Title</Card.content.title>
  </Card.content>
</Card>

<!-- Your own element as the grid. -->
<Content>
  {#snippet child({ props })}
    <section {...props}>
      <Content.title>Title</Content.title>
    </section>
  {/snippet}
</Content>
