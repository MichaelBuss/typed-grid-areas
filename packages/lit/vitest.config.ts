import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * `<server-card>` as `@lit-labs/ssr` renders it, on stock Node: a browser
 * command, so browser specs can hydrate real server output.
 */
async function renderOnServer(): Promise<string> {
  const script = fileURLToPath(new URL("./src/test-utils/renderOnServer.ts", import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [script], { encoding: "utf8" });
  return stdout;
}

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
  commands: { renderOnServer },
});

export default defineConfig({
  // Optimized up front, so Vite doesn't reload a browser spec that first imports one.
  optimizeDeps: {
    include: [
      "@lit-labs/ssr-client/lit-element-hydrate-support.js",
      "lit",
      "lit/directive.js",
      "lit/directives/ref.js",
      "lit/directives/style-map.js",
    ],
  },
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
        // Server rendering and the packed package, outside any DOM.
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
