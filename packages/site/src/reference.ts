/**
 * Links to REFERENCE.md, the API reference (ADR 0007). Each section is linked
 * as of the release of the package it documents (its `<name>@<version>` git
 * tag), so the site never points at unreleased API on `main`.
 */
import GithubSlugger from "github-slugger";
// Each workspace's own package.json, by path: no package's `exports` offers
// `./package.json`, and adding it would change what each package ships.
import angular from "../../angular/package.json";
import core from "../../core/package.json";
import lit from "../../lit/package.json";
import octane from "../../octane/package.json";
import preact from "../../preact/package.json";
import react from "../../react/package.json";
import solid from "../../solid/package.json";
import svelte from "../../svelte/package.json";
import vue from "../../vue/package.json";
import { repoUrl } from "./site.ts";

type Package = { name: string; version: string };

/** REFERENCE.md sections the site links to: the package each documents, and its heading. */
export const referenceSections = {
  defineLayout: { package: core, heading: "Defining a grid: `defineLayout()`" },
  optionalAreas: { package: core, heading: "Optional areas and derived layouts" },
  overrides: { package: core, heading: "Overrides: `when` and `unless`" },
  breakpoints: { package: core, heading: "Breakpoints" },
  layers: { package: core, heading: "Layers: `base+layer`" },
  tgaOver: { package: core, heading: "Restyling layered content: `--tga-over`" },
  withoutFramework: { package: core, heading: "Without React: `typed-grid-areas/adapter`" },
  agentSkill: { package: core, heading: "Agent skill" },
  react: { package: react, heading: "Rendering with React: grid components" },
  vue: { package: vue, heading: "Rendering with Vue: `@typed-grid-areas/vue`" },
  svelte: { package: svelte, heading: "Rendering with Svelte: `@typed-grid-areas/svelte`" },
  solid: { package: solid, heading: "Rendering with Solid: `@typed-grid-areas/solid`" },
  preact: { package: preact, heading: "Rendering with Preact: `@typed-grid-areas/preact`" },
  angular: { package: angular, heading: "Rendering with Angular: grid directives" },
  lit: { package: lit, heading: "Rendering with Lit: grid template functions" },
  octane: {
    package: octane,
    heading: "Rendering with Octane: `@typed-grid-areas/octane` (experimental)",
  },
} satisfies Record<string, { package: Package; heading: string }>;

export type ReferenceSection = keyof typeof referenceSections;

/** REFERENCE.md's section, on GitHub, as of the release of the package it documents. */
export function referenceLink(section: ReferenceSection): string {
  const { package: pkg, heading } = referenceSections[section];
  const anchor = new GithubSlugger().slug(heading.replaceAll("`", ""));
  return `${repoUrl}/blob/${pkg.name}@${pkg.version}/REFERENCE.md#${anchor}`;
}
