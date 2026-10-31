/** The browser commands `vitest.config.ts` defines, typed for browser tests. */
declare module "vitest/browser" {
  interface BrowserCommands {
    /**
     * Renders a component on the server (`render` from `svelte/server`).
     * `component` is a path relative to the package folder.
     */
    renderOnServer: (
      component: string,
      props?: Record<string, unknown>,
    ) => Promise<{ head: string; body: string }>;
  }
}

export {};
