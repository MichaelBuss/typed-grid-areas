import { syncVersions } from "./sync-version.ts";

describe("syncVersions", () => {
  it("brings package-lock.json to package.json's version", () => {
    const lock = { version: "0.0.0", packages: { "": { version: "0.0.0" } } };
    const result = syncVersions({ pkg: { version: "0.1.0" }, lock });
    expect(result.changed).toEqual(["package-lock.json"]);
    expect(lock.version).toBe("0.1.0");
    expect(lock.packages[""].version).toBe("0.1.0");
  });

  it("syncs a lockfile's root version even without a packages entry", () => {
    const lock = { version: "0.9.0", packages: {} };
    const result = syncVersions({ pkg: { version: "1.0.0" }, lock });
    expect(result.changed).toEqual(["package-lock.json"]);
    expect(lock.version).toBe("1.0.0");
  });

  it("has nothing to sync without a lockfile", () => {
    expect(syncVersions({ pkg: { version: "0.3.0" }, lock: undefined }).changed).toEqual([]);
  });

  it("reports nothing to change when everything agrees", () => {
    const lock = { version: "0.1.5", packages: { "": { version: "0.1.5" } } };
    expect(syncVersions({ pkg: { version: "0.1.5" }, lock }).changed).toEqual([]);
  });
});
