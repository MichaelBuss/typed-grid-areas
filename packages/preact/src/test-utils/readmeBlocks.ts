import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const repoDir = resolve(__dirname, "..", "..", "..", "..");

/** The repo's README and REFERENCE.md, which every package ships. */
export const readmePaths = [resolve(repoDir, "README.md"), resolve(repoDir, "REFERENCE.md")];

/** REFERENCE.md, the API reference, where the Preact section is. */
export const referencePath = readmePaths[1]!;

/**
 * The Preact code blocks of the README and REFERENCE.md, fenced as
 * ` ```tsx preact `: the info string keeps them out of the React adapter's
 * check, which reads every plain ` ```tsx ` block as React. Each names its
 * file (`README`, `REFERENCE`) and the line it starts on.
 */
export function preactReadmeBlocks(): Array<{ code: string; file: string; line: number }> {
  return readmePaths.flatMap(path => {
    const markdown = readFileSync(path, "utf8");
    return Array.from(markdown.matchAll(/^```tsx preact\n([\s\S]*?)^```/gm), match => ({
      code: match[1]!,
      file: basename(path, ".md"),
      line: markdown.slice(0, match.index).split("\n").length,
    }));
  });
}
