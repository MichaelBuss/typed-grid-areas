/**
 * The example apps in `examples/<adapter>/`, one per stable adapter, which
 * the Try it page links to. Each opens in StackBlitz from `main` through its
 * GitHub import URL. They are the stable adapters, the list the site's
 * other adapter lists come from.
 */
import { repo, repoUrl } from "./site.ts";

export const examples = [
  { adapter: "react", label: "React", tooling: "Vite" },
  { adapter: "vue", label: "Vue", tooling: "Vite, vue-tsc" },
  { adapter: "svelte", label: "Svelte", tooling: "Vite, svelte-check" },
  { adapter: "solid", label: "Solid", tooling: "Vite" },
  { adapter: "preact", label: "Preact", tooling: "Vite" },
  { adapter: "angular", label: "Angular", tooling: "Angular CLI" },
  { adapter: "lit", label: "Lit", tooling: "Vite" },
] as const;

export type ExampleAdapter = (typeof examples)[number]["adapter"];

/** Opens the example in StackBlitz, imported from the repo's `main`. */
export const stackblitzUrl = (adapter: ExampleAdapter) =>
  `https://stackblitz.com/github/${repo}/tree/main/examples/${adapter}`;

/** The example's folder on GitHub. */
export const sourceUrl = (adapter: ExampleAdapter) => `${repoUrl}/tree/main/examples/${adapter}`;
