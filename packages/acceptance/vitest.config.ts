import { defineConfig } from "vitest/config";

/** The designs' own checks. The browser acceptance tests run in each adapter's package. */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
