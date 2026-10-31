import { svelte } from "@sveltejs/vite-plugin-svelte";
import { playwright } from "@vitest/browser-playwright";
import { fileURLToPath } from "node:url";
import type * as SvelteServer from "svelte/server";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

/**
 * A browser command: renders a component on the server, with `render` from
 * `svelte/server`, for a browser test to hydrate. `component` is a path
 * relative to this folder.
 */
const renderOnServer: BrowserCommand<[component: string, props?: Record<string, unknown>]> = async (
  { project },
  component,
  props = {},
) => {
  const { render } = (await project.vite.ssrLoadModule("svelte/server")) as typeof SvelteServer;
  const { default: Component } = await project.vite.ssrLoadModule(
    fileURLToPath(new URL(component, import.meta.url)),
  );
  const { head, body } = render(Component, { props });
  return { head, body };
};

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
  commands: { renderOnServer },
});

export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    projects: [
      {
        // Server rendering, svelte-check, and the packed package, outside any DOM.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.node.spec.ts"],
        },
      },
      {
        // Production: without the `development` condition, as a production build resolves.
        extends: true,
        resolve: { conditions: ["module", "browser", "production"] },
        test: {
          name: "browser",
          include: ["src/**/*.browser.spec.ts"],
          exclude: ["src/**/*.development.browser.spec.ts"],
          browser: chromium(),
        },
      },
      {
        // Development-only behaviour (warnings), under the `development` condition
        // that Vite's dev server and Vitest resolve with.
        extends: true,
        test: {
          name: "browser-development",
          include: ["src/**/*.development.browser.spec.ts"],
          browser: chromium(),
        },
      },
    ],
  },
});
