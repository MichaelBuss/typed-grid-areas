/**
 * Prints `<server-card>` as `@lit-labs/ssr` renders it. Run on stock Node
 * (`node src/test-utils/renderOnServer.ts`), so the browser specs can hydrate
 * real server output (see `vitest.config.ts`).
 */
import { render } from "@lit-labs/ssr";
import { collectResult } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";
import { defineServerCard } from "./serverCard.ts";

defineServerCard();
process.stdout.write(await collectResult(render(html`<server-card></server-card>`)));
