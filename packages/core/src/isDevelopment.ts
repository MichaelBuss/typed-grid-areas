/**
 * Whether this is a development build. Bundlers replace
 * `process.env.NODE_ENV`; without one, `process` may not exist at all.
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false;
  }
}
