/**
 * An app rendered on the server and hydrated in the browser: two instances
 * of a card whose content is a nested grid with breakpoints, a second
 * definition, and an optional slot left out with `@if`.
 */
import { Component, CSP_NONCE, EnvironmentProviders, Provider } from "@angular/core";
import {
  bootstrapApplication,
  BootstrapContext,
  provideClientHydration,
} from "@angular/platform-browser";
import { defineLayout } from "typed-grid-areas";
import { createGrid, TgaArea, TgaGrid, TgaSizeContainer } from "../index.ts";

export const contentGrid = defineLayout({
  areas: ["icon?", "title"],
  layouts: [{ template: "title", breakpoints: { "@sm": { template: "icon title" } } }],
});
export const cardGrid = defineLayout({
  areas: ["input?", "content"],
  layouts: [{ template: "input content", columns: "auto minmax(0, 1fr)" }],
});
export const listGrid = defineLayout({
  areas: ["header", "items"],
  layouts: [{ template: "header / items" }],
});

const Card = createGrid(cardGrid, { nest: { content: createGrid(contentGrid) } });
const List = createGrid(listGrid);

@Component({
  selector: "app-root",
  imports: [TgaGrid, TgaArea, TgaSizeContainer],
  template: `
    <div [tgaGrid]="List" class="list">
      <h1 [tgaArea]="List.header">Cards</h1>
      <div [tgaArea]="List.items">
        @for (selectable of [true, false]; track $index) {
          <div [tgaGrid]="Card" class="card">
            @if (selectable) {
              <label [tgaArea]="Card.input"><input type="checkbox" /></label>
            }
            <div tgaSizeContainer>
              <div [tgaGrid]="Card.content" class="content">
                <span [tgaArea]="Card.content.icon">★</span>
                <h2 [tgaArea]="Card.content.title">Title</h2>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class App {
  protected readonly Card = Card;
  protected readonly List = List;
}

/** The page the app renders into, before rendering. */
export const PAGE =
  "<!doctype html><html><head><title>Cards</title><style>.app {}</style></head><body><app-root></app-root></body></html>";

/** The CSP nonce the app provides. */
export const NONCE = "r4nd0m";

export const providers: Array<Provider | EnvironmentProviders> = [
  provideClientHydration(),
  { provide: CSP_NONCE, useValue: NONCE },
];

/**
 * Starts the app; on the server, within `renderApplication`'s context and
 * with `provideServerRendering()` among `serverProviders`.
 */
export function bootstrap(
  context?: BootstrapContext,
  serverProviders: Array<Provider | EnvironmentProviders> = [],
) {
  return bootstrapApplication(App, { providers: [...providers, ...serverProviders] }, context);
}
