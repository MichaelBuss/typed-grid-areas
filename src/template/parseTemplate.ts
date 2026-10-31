import { GridLayout } from "../types.ts";

/**
 * Parses a text template into its cells: rows are separated by newlines or
 * `/`, cells by whitespace. Blank rows (such as the first and last line of an
 * indented template literal) are skipped.
 */
export function parseTemplate(template: string): GridLayout<string> {
  return template
    .split(/[\n/]/)
    .map(row => row.split(/\s+/).filter(cell => cell !== ""))
    .filter(row => row.length > 0);
}

/**
 * Splits a track list (`"min-content minmax(0, 1fr)"`) into its tracks.
 * Whitespace inside parentheses or brackets doesn't split a track, and line
 * names (`[name]`) stay attached to the track after them (the last track,
 * for trailing names).
 */
export function parseTracks(trackList: string): Array<string> {
  const tokens: Array<string> = [];
  let depth = 0;
  let token = "";
  for (const char of trackList.trim()) {
    if (/\s/.test(char) && depth === 0) {
      if (token !== "") {
        tokens.push(token);
        token = "";
      }
      continue;
    }
    if (char === "(" || char === "[") {
      depth++;
    } else if (char === ")" || char === "]") {
      depth = Math.max(0, depth - 1);
    }
    token += char;
  }
  if (token !== "") {
    tokens.push(token);
  }

  const tracks: Array<string> = [];
  let lineNames: Array<string> = [];
  for (const current of tokens) {
    if (current.startsWith("[")) {
      lineNames.push(current);
      continue;
    }
    tracks.push([...lineNames, current].join(" "));
    lineNames = [];
  }
  if (lineNames.length > 0) {
    const last = tracks.pop();
    tracks.push([...(last === undefined ? [] : [last]), ...lineNames].join(" "));
  }
  return tracks;
}
