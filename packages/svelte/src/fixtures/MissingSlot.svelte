<script lang="ts">
  import { Card } from "./grids.ts";
</script>

<!-- No slot for the required `info`, and a stray direct child. -->
<Card>
  <Card.icon />
  <span>stray</span>
</Card>
