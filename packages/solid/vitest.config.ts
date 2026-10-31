import { playwright } from "@vitest/browser-playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { renderOnServer } from "./src/test-utils/renderOnServer.ts";

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
  // Lets a browser spec render on the server, to hydrate what it rendered.
  commands: { renderOnServer },
});

export default defineConfig({
  // Solid's JSX, for this package's own files only. `ssr: true` compiles a
  // module for the server when it's loaded there (the node projects, and
  // `renderOnServer`) and as hydratable DOM code in the browser.
  plugins: [solid({ ssr: true, include: ["src/**/*.tsx"] })],
  test: {
    globals: true,
    projects: [
      {
        // Type tests, the entry point, and server rendering.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.spec.{ts,tsx}"],
          exclude: ["src/**/*.browser.spec.{ts,tsx}", "src/**/*.node.spec.ts"],
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
