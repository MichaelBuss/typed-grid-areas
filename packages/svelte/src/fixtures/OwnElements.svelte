<script lang="ts">
  import { Card, Nested } from "./grids.ts";
</script>

<Card>
  {#snippet child({ props })}
    <section {...props} data-testid="card" class="card">
      <Card.icon class="icon">
        {#snippet child({ props })}
          <label {...props}><input type="checkbox" /></label>
        {/snippet}
      </Card.icon>
      <Card.info>Info</Card.info>
    </section>
  {/snippet}
</Card>

<Nested data-testid="nested">
  <Nested.content>
    {#snippet child({ props })}
      <article {...props}>
        <Nested.content.title>Title</Nested.content.title>
      </article>
    {/snippet}
  </Nested.content>
  <Nested.aside>
    <Nested.aside.icon />
    <Nested.aside.info />
  </Nested.aside>
</Nested>
