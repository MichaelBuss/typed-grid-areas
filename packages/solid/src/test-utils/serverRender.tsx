/**
 * Server rendering for the hydration spec, run on the server (Node, this
 * package's JSX compiled for the server) by the `renderOnServer` command.
 */
import { generateHydrationScript, renderToString } from "solid-js/web";
import { GRID_STYLE_ATTRIBUTE } from "typed-grid-areas/adapter";
import { App, Document } from "./serverApp.tsx";

/** What a server render sends for the browser to hydrate. */
export type ServerRender = {
  /** The grid style tags the document's `<head>` got, as HTML. */
  styles: string;
  /** The app's HTML, as it is inside the document's `<body>`. */
  app: string;
  /** The body of Solid's hydration script. */
  hydrationScript: string;
};

export function renderForHydration(): ServerRender {
  const document = renderToString(() => <Document />);
  const head = /<head>([\s\S]*)<\/head>/.exec(document)![1]!;
  const styles = Array.from(
    head.matchAll(new RegExp(`<style ${GRID_STYLE_ATTRIBUTE}=[\\s\\S]*?</style>`, "g")),
    match => match[0],
  ).join("");
  const script = /<script[^>]*>([\s\S]*)<\/script>/.exec(generateHydrationScript())![1]!;
  return { styles, app: renderToString(() => <App />), hydrationScript: script };
}
