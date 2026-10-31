import {
  isNpmAlreadyPublished,
  isNpmSetupError,
  npmSetupInstructions,
  planRelease,
} from "./release.ts";

describe("planRelease", () => {
  it("publishes a version npm doesn't have", () => {
    expect(planRelease({ version: "0.2.0", npmVersions: ["0.1.0"] })).toEqual({ npm: true });
  });

  it("publishes the first version of a package npm has never seen", () => {
    expect(planRelease({ version: "0.1.0", npmVersions: [] })).toEqual({ npm: true });
  });

  it("skips a version npm already has", () => {
    expect(planRelease({ version: "0.2.0", npmVersions: ["0.1.0", "0.2.0"] })).toEqual({
      npm: false,
    });
  });
});

describe("npm errors", () => {
  it("count registry rejections a human must fix as setup errors", () => {
    expect(isNpmSetupError("npm error 404 Not Found - Package name not found")).toBe(true);
    expect(isNpmSetupError("npm error 403 Forbidden - You do not have permission to publish")).toBe(
      true,
    );
    expect(isNpmSetupError("npm error code ENEEDAUTH")).toBe(true);
    expect(isNpmSetupError("npm error 402 Payment Required")).toBe(true);
  });

  it("don't count transient failures as setup errors", () => {
    expect(isNpmSetupError("npm error network ECONNRESET")).toBe(false);
    expect(isNpmSetupError("npm error ETIMEDOUT")).toBe(false);
    expect(isNpmSetupError("npm error 500 Internal Server Error")).toBe(false);
  });

  it("recognize an already-published race instead of misreading it as setup", () => {
    const stderr =
      "npm error 409 Conflict - Cannot publish over the previously published versions: 0.2.0.";
    expect(isNpmAlreadyPublished(stderr)).toBe(true);
    expect(isNpmSetupError(stderr)).toBe(false);
  });
});

describe("npmSetupInstructions", () => {
  const text = npmSetupInstructions("typed-grid-areas", "0.1.0");

  it("name the package, trusted publishing, the workflow and the re-run", () => {
    expect(text).toMatch(/npmjs\.com/);
    expect(text).toMatch(/`typed-grid-areas`/);
    expect(text).toMatch(/trusted publishing/i);
    expect(text).toMatch(/MichaelBuss\/typed-grid-areas/);
    expect(text).toMatch(/\.github\/workflows\/publish\.yml/);
    expect(text).toMatch(/re-run/i);
  });

  it("ask for no scope, since the package is unscoped", () => {
    expect(text).not.toMatch(/scope/i);
  });
});
