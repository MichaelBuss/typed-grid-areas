/**
 * The mistakes the Reading type errors page shows, each a module of its own.
 * `typeErrors.node.spec.ts` compiles them and captures tsc's error for each
 * into `typeErrors.captured.json`, which the page shows next to the code.
 */
export type Mistake = {
  /** Also the key of its error in `typeErrors.captured.json`. */
  name: string;
  code: string;
};

const card = (layout: string) => `import { defineLayout } from "typed-grid-areas";

defineLayout({
  areas: ["icon?", "information", "cardTag?"],
  layouts: [
${layout}
  ],
});
`;

export const mistakes: ReadonlyArray<Mistake> = [
  {
    name: "unknownArea",
    code: card(`    { template: "iconn information cardTag" },`),
  },
  {
    name: "unknownLayer",
    code: card(`    { template: "icon information cardTag+badgee" },`),
  },
  {
    name: "raggedRow",
    code: card(`    { template: "icon cardTag / information" },`),
  },
  {
    name: "columnCount",
    code: card(`    {
      template: "icon cardTag / information information",
      columns: "min-content minmax(0, 1fr) auto",
    },`),
  },
  {
    name: "rowCount",
    code: card(`    {
      template: "icon cardTag / information information",
      rows: "auto",
    },`),
  },
];
