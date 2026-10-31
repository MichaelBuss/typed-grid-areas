import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The repo's README, which every package ships. */
export const readmePath = resolve(__dirname, "..", "..", "..", "..", "README.md");

/**
 * The README's Preact code blocks, fenced as ` ```tsx preact `: the info
 * string keeps them out of the React adapter's README check, which reads
 * every plain ` ```tsx ` block as React.
 */
export function preactReadmeBlocks(): Array<{ code: string; line: number }> {
  const readme = readFileSync(readmePath, "utf8");
  return Array.from(readme.matchAll(/^```tsx preact\n([\s\S]*?)^```/gm), match => ({
    code: match[1]!,
    line: readme.slice(0, match.index).split("\n").length,
  }));
}
