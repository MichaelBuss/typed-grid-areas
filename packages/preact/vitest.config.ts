import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
});

export default defineConfig({
  // This package's JSX is Preact's, whatever another workspace's is.
  oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
  // One copy of Preact for the tests, the renderer and the hooks, or hooks lose their component.
  optimizeDeps: {
    include: [
      "preact",
      "preact/hooks",
      "preact/jsx-runtime",
      "preact-render-to-string",
      "vitest-browser-preact",
    ],
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.spec.{ts,tsx}"],
          exclude: [
            "src/**/*.browser.spec.{ts,tsx}",
            "src/**/*.node.spec.{ts,tsx}",
            "src/**/*.server.spec.{ts,tsx}",
          ],
        },
      },
      {
        // Server rendering, and the packed package: outside any DOM.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.node.spec.{ts,tsx}", "src/**/*.server.spec.{ts,tsx}"],
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
