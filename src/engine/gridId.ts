import { GridConfig } from "../types";

const ids = new WeakMap<GridConfig<string>, string>();

/**
 * A short id derived from a grid definition's content, used to scope its
 * generated CSS. Every instance of a definition gets the same id (so its CSS
 * can be emitted once), it is stable between server and client, and two
 * definitions with identical content share it (and their identical CSS).
 */
export function gridId(config: GridConfig<string>): string {
  const cached = ids.get(config);
  if (cached !== undefined) {
    return cached;
  }

  // 32-bit FNV-1a over the serialized definition.
  const source = JSON.stringify(config);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const id = `tga-${(hash >>> 0).toString(36)}`;

  ids.set(config, id);
  return id;
}
