// node gen-stress.mjs -> stress-{plain,parse,rect}.ts
import { writeFileSync } from "node:fs";
const fns = { plain: "defineLayoutPlain", parse: "defineLayout", rect: "defineLayoutRect" };
const base = ["header", "avatar", "title", "meta", "actions", "body"];
function call(i, fn) {
  const n = base.map((b) => `${b}${i}`);
  const [h, av, t, m, ac, b] = n;
  // 4 rows x 5 cols, rectangular areas
  const t1 = `
        ${h}  ${h}  ${h}  ${h}  ${ac}
        ${av} ${t}  ${t}  ${t}  ${ac}
        ${av} ${m}  ${m}  .     ${ac}
        ${b}  ${b}  ${b}  ${b}  ${b}`;
  const t2 = `${av} ${h} ${h} ${h} ${h} / ${av} ${t} ${t} ${m} ${m} / ${b} ${b} ${b} ${b} ${b} / ${ac} ${ac} ${ac} ${ac} ${ac}`;
  const t3 = `${h} ${h} ${h} ${h} / ${t} ${t} ${m} ${m} / ${b} ${b} ${b} ${b} / ${ac} ${ac} . .`;
  const bp = (tpl, cols) => `{ template: ${JSON.stringify(tpl)}, columns: ${JSON.stringify(cols)}, rows: "auto auto auto auto" }`;
  const bps = `{ "@sm": ${bp(t2, "min-content minmax(0, 1fr) auto auto 1fr")}, "@lg": ${bp(t3, "1fr minmax(0, 2fr) auto 1fr")} }`;
  return `export const G${i} = ${fn}({
  areas: ["${h}", "${av}?", "${t}", "${m}?", "${ac}?", "${b}"],
  layouts: [
    {
      template: \`${t1}\`,
      columns: "min-content minmax(0, 1fr) minmax(0, 1fr) auto max-content",
      rows: "auto auto auto 1fr",
      align: { ${ac}: { justify: "end" }, ${av}: { align: "start" } },
      breakpoints: ${bps},
    },
    { unless: ["${av}"], template: ${JSON.stringify(t3.replaceAll(av, h))}, columns: "1fr 1fr auto auto", breakpoints: ${bps} },
    { when: ["${m}", "${ac}"], template: ${JSON.stringify(t2)}, columns: "min-content minmax(0, 1fr) auto auto 1fr", rows: "auto auto auto auto", breakpoints: ${bps} },
  ],
});
`;
}
for (const [k, fn] of Object.entries(fns)) {
  let src = `import { ${fn} } from "./lib";\n\n`;
  for (let i = 0; i < 30; i++) src += call(i, fn);
  writeFileSync(`stress-${k}.ts`, src);
  writeFileSync(`tsconfig.stress-${k}.json`, JSON.stringify({ extends: "./tsconfig.json", files: [`stress-${k}.ts`] }, null, 2));
}
