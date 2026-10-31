import { CSP_NONCE, DOCUMENT, inject, Injectable, PLATFORM_ID } from "@angular/core";
import type { GridConfig } from "typed-grid-areas";
import { GRID_STYLE_ATTRIBUTE, gridMarkup, insertGridStyle } from "typed-grid-areas/adapter";

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
    const style = this.server
      ? this.insertOnServer(definition)
      : insertGridStyle(this.document, definition);
    if (this.nonce !== null && style.getAttribute("nonce") === null) {
      style.setAttribute("nonce", this.nonce);
    }
  }

  /**
   * `insertGridStyle`'s contract on the server's DOM (Domino), which it
   * can't run on: one tag per definition, after earlier grids' tags and
   * ahead of the page's other styles, with CSS that can't close its tag.
   */
  private insertOnServer(definition: GridConfig<string>): HTMLStyleElement {
    const { id, css } = gridMarkup(definition);
    const head = this.document.head;
    const existing = head.querySelector<HTMLStyleElement>(`style[${GRID_STYLE_ATTRIBUTE}="${id}"]`);
    if (existing) {
      return existing;
    }
    const style = this.document.createElement("style");
    style.setAttribute(GRID_STYLE_ATTRIBUTE, id);
    // Domino escapes `<` in the serialized text, so the CSS cannot close its tag.
    style.textContent = css;
    const grids = head.querySelectorAll(`style[${GRID_STYLE_ATTRIBUTE}]`);
    const before =
      grids.length > 0
        ? grids[grids.length - 1]!.nextSibling
        : head.querySelector('style, link[rel~="stylesheet"]');
    head.insertBefore(style, before ?? null);
    return style;
  }
}
