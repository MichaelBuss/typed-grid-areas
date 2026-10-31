<!--
  Each line marked `error:` must be a type error, and nothing else here may
  be. Checked by `gridComponent.types.node.spec.ts`; left out of `npm run
  typecheck`.
-->
<script lang="ts">
  import { defineLayout } from "typed-grid-areas";
  import { createGridComponent } from "../../lib/index.ts";

  const Content = createGridComponent(
    defineLayout({ areas: ["icon?", "title"], layouts: [{ template: "icon title" }] }),
  );
  const Card = createGridComponent(
    defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
    { nest: { content: Content } },
  );

  createGridComponent(
    defineLayout({ areas: ["input?", "content"], layouts: [{ template: "input content" }] }),
    { nest: { contnet: Content } }, // error: a misspelled nest key
  );
</script>

<Card.inputt /><!-- error: a misspelled area -->
<Card.content.iconn /><!-- error: a misspelled area of the nested grid -->
<Card.content.input /><!-- error: an area of the outer grid, not the nested one -->
<Card.input href="/" /><!-- error: an attribute a div doesn't take -->
