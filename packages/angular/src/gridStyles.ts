import { CSP_NONCE, DOCUMENT, inject, Injectable, PLATFORM_ID } from "@angular/core";
import type { GridConfig } from "typed-grid-areas";
import { insertGridStyle, insertServerGridStyle } from "typed-grid-areas/adapter";

/**
 * Puts each definition's CSS in the `<head>` of Angular's `DOCUMENT`, once
 * (ADR 0005). On the server that document is what's serialized, so the tag
 * is in the rendered HTML, and hydration finds and reuses it.
 */
@Injectable({ providedIn: "root" })
export class GridStyles {
  private readonly document = inject(DOCUMENT);
  private readonly nonce = inject(CSP_NONCE, { optional: true });
  // `isPlatformServer` without depending on `@angular/common`.
  private readonly server = inject(PLATFORM_ID) === "server";

  insert(definition: GridConfig<string>): void {
    // On the server the document is serialized, so the CSS is escaped as the
    // core escapes server-rendered tags, and hydration reuses that text.
    const style = this.server
      ? insertServerGridStyle(this.document, definition)
      : insertGridStyle(this.document, definition);
    if (this.nonce !== null && style.getAttribute("nonce") === null) {
      style.setAttribute("nonce", this.nonce);
    }
  }
}
