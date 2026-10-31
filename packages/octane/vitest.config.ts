import { resolve } from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { octane } from "octane/compiler/vite";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";

/**
 * Server-renders a module's exported component with `octane/server`, through
 * Vite's SSR pipeline (so the compiler runs in server mode), for a browser
 * spec to hydrate. `path` is relative to this package.
 */
const renderOnServer: BrowserCommand<[path: string, exportName: string]> = async (
  { project },
  path,
  exportName,
) => {
  const component = (await project.vite.ssrLoadModule(resolve(project.config.root, path)))[
    exportName
  ];
  const { renderToString } = await project.vite.ssrLoadModule("octane/server");
  const { html, css } = renderToString(component);
  return { html, css };
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
  // This workspace's own Vitest process, so the compiler only ever sees this
  // package's files; `requireDirective` keeps it to `.tsrx` and the `.tsx` and
  // `.ts` modules that say `@jsxImportSource octane`.
  plugins: [octane({ requireDirective: true })],
  optimizeDeps: { include: ["@testing-library/dom"] },
  test: {
    globals: true,
    projects: [
      {
        // The packed package and the server renderer, outside any DOM.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.node.spec.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.spec.{ts,tsx}"],
          exclude: ["src/**/*.development.browser.spec.{ts,tsx}"],
          browser: chromium(),
        },
      },
      {
        // Development-only behaviour (warnings), with NODE_ENV as a dev server sets it.
        extends: true,
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
        test: {
          name: "browser-development",
          include: ["src/**/*.development.browser.spec.{ts,tsx}"],
          browser: chromium(),
        },
      },
    ],
  },
});
