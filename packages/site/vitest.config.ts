import { defineConfig } from "vitest/config";

/**
 * `node`: checks of the site's sources (its code blocks, captured type
 * errors, generated CSS, links and deploy workflow), with no build needed.
 * `browser`: checks of the built site in `dist/`, some in Chromium with
 * JavaScript turned off; `npm run test:browser` builds it first.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    projects: [
      {
        extends: true,
        test: { name: "node", include: ["src/**/*.node.spec.ts"] },
      },
      {
        extends: true,
        test: { name: "browser", include: ["src/**/*.built.spec.ts"], testTimeout: 30_000 },
      },
    ],
  },
});
