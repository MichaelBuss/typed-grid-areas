/**
 * A browser command (it runs in Node, called from a browser spec) that
 * renders `serverApp.tsx` on the server, with this package's JSX compiled
 * for the server, for the browser to hydrate.
 */
import type { BrowserCommand } from "vitest/node";
import type { ServerRender } from "./serverRender.tsx";

export const renderOnServer: BrowserCommand<[], ServerRender> = async ({ project }) => {
  const { renderForHydration } = await project.import<typeof import("./serverRender.tsx")>(
    "/src/test-utils/serverRender.tsx",
  );
  return renderForHydration();
};

declare module "vitest/browser" {
  interface BrowserCommands {
    renderOnServer: () => Promise<ServerRender>;
  }
}
