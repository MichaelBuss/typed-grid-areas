import vue from "@vitejs/plugin-vue";
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
  // Compiles the `.vue` test fixtures; the package itself has none.
  plugins: [vue()],
  // Optimized up front, so Vite doesn't reload the browser mid-run on discovering them.
  optimizeDeps: { include: ["vue", "vue/server-renderer", "vitest-browser-vue"] },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.spec.ts"],
          exclude: ["src/**/*.browser.spec.ts", "src/**/*.node.spec.ts"],
        },
      },
      {
        // Server rendering, and the packed package, outside any DOM.
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
          include: ["src/**/*.browser.spec.ts"],
          exclude: ["src/**/*.development.browser.spec.ts"],
          browser: chromium(),
        },
      },
      {
        // Development-only behaviour (warnings), with NODE_ENV as a dev server sets it.
        extends: true,
        define: { "process.env.NODE_ENV": JSON.stringify("development") },
        test: {
          name: "browser-development",
          include: ["src/**/*.development.browser.spec.ts"],
          browser: chromium(),
        },
      },
    ],
  },
});
