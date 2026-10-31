import angular from "@analogjs/vite-plugin-angular";
import { playwright } from "@vitest/browser-playwright";
import { resolve } from "node:path";
import { createServer } from "vite";
import type { BrowserCommand } from "vitest/node";
import { defineConfig } from "vitest/config";

/**
 * A browser command: server-renders the hydration app in Node (with the
 * test server's Angular compilation) and returns the page's HTML.
 */
const renderOnServer: BrowserCommand<[]> = async () => {
  // What the CLI defines in a server build.
  (globalThis as { ngServerMode?: boolean }).ngServerMode = true;
  // Angular's packages ship partially compiled; the compiler finishes them.
  await import("@angular/compiler");
  const server = await createServer({
    configFile: false,
    root: import.meta.dirname,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [angularPlugin()],
  });
  try {
    const app = await server.ssrLoadModule("/src/test-utils/renderOnServer.ts");
    return await app.renderOnServer();
  } finally {
    await server.close();
  }
};

/** Compiles the components in specs ahead of time, as the Angular CLI does. */
const angularPlugin = () =>
  angular({ tsconfig: resolve(import.meta.dirname, "tsconfig.spec.json") });

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
  commands: { renderOnServer },
});

export default defineConfig({
  plugins: [angularPlugin()],
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.spec.ts"],
          exclude: ["src/**/*.browser.spec.ts", "src/**/*.node.spec.ts"],
        },
      },
      {
        // Server rendering, and the packed package, outside any browser.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.node.spec.ts"],
          setupFiles: ["src/test-setup.node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.spec.ts"],
          exclude: ["src/**/*.production.browser.spec.ts"],
          setupFiles: ["src/test-setup.ts"],
          browser: chromium(),
        },
      },
      {
        // Production mode (`enableProdMode()`), where nothing warns.
        extends: true,
        test: {
          name: "browser-production",
          include: ["src/**/*.production.browser.spec.ts"],
          setupFiles: ["src/test-setup.production.ts", "src/test-setup.ts"],
          browser: chromium(),
        },
      },
    ],
  },
});
