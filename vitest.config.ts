import { defineConfig } from "vitest/config";

/**
 * The repo's own release scripts, and what every published package's npm page
 * shows. Each package under packages/ has its own Vitest config.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["scripts/**/*.spec.ts"],
  },
});
