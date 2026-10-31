<script lang="ts">
  import { Card, Nested, Responsive } from "./grids.ts";
</script>

<Card class="card" aria-label="Card" data-testid="card">
  <Card.icon class="icon">★</Card.icon>
  <Card.info>Info</Card.info>
</Card>

<Responsive class="responsive" data-testid="responsive">
  <Responsive.icon />
  <Responsive.info />
</Responsive>

<Nested data-testid="nested">
  <Nested.content class="content">
    <Nested.content.title>Title</Nested.content.title>
  </Nested.content>
  <Nested.aside class="aside">
    <Nested.aside.icon />
    <Nested.aside.info />
  </Nested.aside>
</Nested>
