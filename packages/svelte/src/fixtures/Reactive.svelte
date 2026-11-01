<script lang="ts">
  import { Card, Nested } from "./grids.ts";

  let { gridClass, slotClass }: { gridClass: string; slotClass: string } = $props();
</script>

<Card class={gridClass} data-testid="card">
  <Card.info class={slotClass}>Info</Card.info>
</Card>

<Nested>
  <Nested.content class={gridClass} data-testid="content">
    <Nested.content.title class={slotClass}>Title</Nested.content.title>
  </Nested.content>
  <Nested.aside>
    <Nested.aside.icon />
    <Nested.aside.info />
  </Nested.aside>
</Nested>
