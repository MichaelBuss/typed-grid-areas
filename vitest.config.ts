import { defineConfig } from "vitest/config";

/** The repo's own release scripts. Each package under packages/ has its own Vitest config. */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["scripts/**/*.spec.ts"],
  },
});
