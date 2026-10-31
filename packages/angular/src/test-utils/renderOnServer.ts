/**
 * Server-renders the hydration app (`serverApp.ts`) in Node, for the browser
 * spec that hydrates it: the `renderOnServer` browser command loads this.
 */
import { provideServerRendering, renderApplication } from "@angular/platform-server";
import { bootstrap, PAGE } from "./serverApp.ts";

export function renderOnServer(): Promise<string> {
  return renderApplication(context => bootstrap(context, [provideServerRendering()]), {
    document: PAGE,
    url: "/",
  });
}
