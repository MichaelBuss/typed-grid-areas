// @ts-check
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { sidebar } from "./src/sidebar.ts";
import { basePath, repoUrl, siteOrigin } from "./src/site.ts";

// GitHub Pages serves the repo's site under its name.
export default defineConfig({
  site: siteOrigin,
  base: basePath,
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
          href: repoUrl,
        },
      ],
      sidebar,
      customCss: ["./src/styles/site.css"],
    }),
    react(),
  ],
});
