<script module lang="ts">
  import { idCardGrid, idCardImages, type IdCardOptional } from "@typed-grid-areas/acceptance";
  import { createGridComponent } from "../lib/index.ts";

  const IdCard = createGridComponent(idCardGrid);
  const fill = "width: 100%; height: 100%";
</script>

<script lang="ts">
  let { present, width }: { present: ReadonlyArray<IdCardOptional>; width: number } = $props();
  const has = (area: IdCardOptional) => present.includes(area);
</script>

<div style="width: {width}px">
  <IdCard>
    <IdCard.photo>
      {#snippet child({ props })}
        <img {...props} src={idCardImages.photo} alt="" style="{fill}; object-fit: cover" />
      {/snippet}
    </IdCard.photo>
    {#if has("logo")}
      <IdCard.logo style="padding: 4px">ACME</IdCard.logo>
    {/if}
    {#if has("badge")}
      <IdCard.badge style="padding: 4px; text-align: right">
        <span aria-label="Verified">✓</span>
      </IdCard.badge>
    {/if}
    <IdCard.identity style="padding: 4px">
      <strong>Ada Lovelace</strong>
    </IdCard.identity>
    <IdCard.details style="padding: 4px">Analyst, Engine Division</IdCard.details>
    {#if has("qr")}
      <IdCard.qr>
        {#snippet child({ props })}
          <img {...props} src={idCardImages.qr} alt="QR code" style="{fill}; object-fit: contain" />
        {/snippet}
      </IdCard.qr>
    {/if}
  </IdCard>
</div>
