/**
 * The site's pages, in reading order. Starlight builds the sidebar (and the
 * previous/next links) from this list.
 */
export const sidebar = [
  { label: "Introduction", slug: "index" },
  { label: "Getting started", slug: "getting-started" },
  {
    label: "Concepts",
    items: [
      { label: "Areas, optional areas and derived layouts", slug: "concepts/areas" },
      { label: "Overrides", slug: "concepts/overrides" },
      { label: "Breakpoints", slug: "concepts/breakpoints" },
      { label: "Layers", slug: "concepts/layers" },
      { label: "Nested grids", slug: "concepts/nested-grids" },
    ],
  },
  { label: "How it works", slug: "how-it-works" },
  { label: "Reading type errors", slug: "type-errors" },
  { label: "Examples", slug: "examples" },
  { label: "Try it", slug: "try-it" },
];
