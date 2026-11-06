import { resolve } from "node:path";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import { reactCompiler } from "./src/test-utils/reactCompiler.ts";

/** Headless Chromium. A function, since Vitest names each project's instances in place. */
const chromium = () => ({
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: "chromium" as const }],
});

/** Shared by every browser project. */
const browserSetupFiles = ["src/test-setup.browser.ts"];

/**
 * The browser projects again, with React Compiler applied to the adapter and
 * its tests, as in an app that compiles its own source.
 */
const underReactCompiler = {
  plugins: [reactCompiler(resolve(import.meta.dirname, "src"))],
  // Pre-bundled with the rest of React: found mid-run, it would load a second
  // React ("Cannot read properties of null (reading 'useMemoCache')").
  optimizeDeps: { include: ["react/compiler-runtime"] },
};

const browserSpecs = "src/**/*.browser.spec.{ts,tsx}";
const developmentSpecs = "src/**/*.development.browser.spec.{ts,tsx}";
/** `process.env.NODE_ENV` as a dev server sets it, for development-only behaviour (warnings). */
const developmentDefine = { "process.env.NODE_ENV": JSON.stringify("development") };

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
        // The packed package, and React Compiler over the source, outside any DOM.
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
          include: [browserSpecs],
          exclude: [developmentSpecs],
          setupFiles: browserSetupFiles,
          browser: chromium(),
        },
      },
      {
        extends: true,
        define: developmentDefine,
        test: {
          name: "browser-development",
          include: [developmentSpecs],
          setupFiles: browserSetupFiles,
          browser: chromium(),
        },
      },
      {
        extends: true,
        ...underReactCompiler,
        test: {
          name: "react-compiler",
          include: [browserSpecs],
          exclude: [developmentSpecs],
          setupFiles: browserSetupFiles,
          browser: chromium(),
        },
      },
      {
        extends: true,
        ...underReactCompiler,
        define: developmentDefine,
        test: {
          name: "react-compiler-development",
          include: [developmentSpecs],
          setupFiles: browserSetupFiles,
          browser: chromium(),
        },
      },
    ],
  },
});
