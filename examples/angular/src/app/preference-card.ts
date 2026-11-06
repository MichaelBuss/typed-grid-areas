import { Component, input } from "@angular/core";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "@typed-grid-areas/angular";
import { preferenceCardGrid, preferenceContentGrid } from "./designs";

const Content = createGrid(preferenceContentGrid);
const Card = createGrid(preferenceCardGrid, { nest: { content: Content } });

/** Optional areas are absent when their slot isn't rendered: leave out an input to see the layout change. */
@Component({
  selector: "app-preference-card",
  imports: [TgaGrid, TgaArea, TgaSizeContainer],
  template: `
    <div [tgaGrid]="Card" class="card">
      @if (selectable()) {
        <label [tgaArea]="Card.input" class="panel input">
          <input type="checkbox" checked [attr.aria-label]="heading()" />
        </label>
      }
      <!-- The content grid has breakpoints, so it sits in its own size container. -->
      <div tgaSizeContainer>
        <div [tgaGrid]="Card.content" class="panel content">
          <!-- Misspell an area, say Card.content.iconn, and npm run typecheck reports it. -->
          @if (icon()) {
            <span [tgaArea]="Card.content.icon">{{ icon() }}</span>
          }
          <div [tgaArea]="Card.content.information">{{ heading() }}</div>
          @if (tag()) {
            <span [tgaArea]="Card.content.cardTag" class="tag">{{ tag() }}</span>
          }
          @if (details()) {
            <div [tgaArea]="Card.content.children">{{ details() }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class PreferenceCard {
  protected readonly Card = Card;
  readonly selectable = input(false);
  readonly icon = input<string>();
  readonly heading = input.required<string>();
  readonly tag = input<string>();
  readonly details = input<string>();
}
