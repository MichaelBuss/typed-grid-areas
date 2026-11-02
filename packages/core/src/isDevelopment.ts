/**
 * Whether this is a development build. Bundlers replace
 * `process.env.NODE_ENV`; without one, `process` may not exist at all.
 *
 * A production build keeps whatever this guards: bundlers can't see through
 * the call. To have them drop development-only code, read
 * `process.env.NODE_ENV` at the call site, alone in its `if` (esbuild keeps
 * code behind an early return, or a condition with more `&&` terms), and
 * nothing else of `process`: bundlers don't replace `typeof process`, and a
 * browser has no `process`.
 *
 * ```ts
 * try {
 *   if (process.env.NODE_ENV === "development") {
 *     // development-only code
 *   }
 * } catch (error) {
 *   // Without a bundler, `process` may not exist: then this isn't development.
 *   if (!(error instanceof ReferenceError)) throw error;
 * }
 * ```
 */
export function isDevelopment(): boolean {
  try {
    return process.env.NODE_ENV === "development";
  } catch {
    return false;
  }
}
