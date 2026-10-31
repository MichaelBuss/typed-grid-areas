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
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.spec.{ts,tsx}"],
          exclude: ["src/**/*.browser.spec.{ts,tsx}", "src/**/*.node.spec.ts"],
          setupFiles: ["src/test-setup.ts"],
        },
      },
      {
        // The packed package, outside any DOM.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.node.spec.ts"],
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
