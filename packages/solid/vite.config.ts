/**
 * The compiled browser build (`dist/index.js`, the `import` export): Solid's
 * JSX compiled for the DOM, with `solid-js` and the core left as imports.
 * The `solid` export (`dist/index.jsx`) is `tsc`'s preserved JSX instead,
 * for bundlers that compile Solid themselves (and for the server).
 */
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  // Quiet: `npm pack --json` runs the build, and its output must stay JSON.
  logLevel: "warn",
  build: {
    target: "es2022",
    minify: false,
    emptyOutDir: true,
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: [/^solid-js(\/|$)/, /^typed-grid-areas(\/|$)/],
    },
  },
});
