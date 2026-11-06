// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { sidebar } from "./src/sidebar.ts";

// GitHub Pages serves the repo's site under its name.
export default defineConfig({
  site: "https://michaelbuss.github.io",
  base: "/typed-grid-areas",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "typed-grid-areas",
      description:
        "Type-safe CSS grid layouts that rearrange themselves based on which slots are rendered and how much room they get.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/MichaelBuss/typed-grid-areas",
        },
      ],
      sidebar,
      customCss: ["./src/styles/site.css"],
    }),
    react(),
  ],
});
