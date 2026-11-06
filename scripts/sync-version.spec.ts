import { syncVersions, type Lockfile } from "./sync-version.ts";

describe("syncVersions", () => {
  function lockfile(): Lockfile {
    return {
      version: "0.1.0",
      packages: {
        "": { name: "monorepo" },
        "packages/core": { name: "typed-grid-areas", version: "0.1.0" },
        "packages/react": {
          name: "@typed-grid-areas/react",
          version: "0.0.0",
          dependencies: { "@radix-ui/react-slot": "^1.3.3", "typed-grid-areas": "^0.1.0" },
          devDependencies: { "@typed-grid-areas/acceptance": "*" },
        },
        "node_modules/typed-grid-areas": { resolved: "packages/core", link: true },
      },
    };
  }

  it("brings each workspace's version and dependency ranges in package-lock.json to its package.json", () => {
    const lock = lockfile();
    const result = syncVersions({
      workspaces: [
        { dir: "packages/core", manifest: { version: "0.2.0" } },
        {
          dir: "packages/react",
          manifest: {
            version: "0.1.0",
            dependencies: { "@radix-ui/react-slot": "^1.3.3", "typed-grid-areas": "^0.2.0" },
            devDependencies: { "@typed-grid-areas/acceptance": "*" },
          },
        },
      ],
      lock,
    });
    expect(result.changed).toEqual(["package-lock.json"]);
    expect(lock.packages!["packages/core"]!.version).toBe("0.2.0");
    expect(lock.packages!["packages/react"]).toMatchObject({
      version: "0.1.0",
      dependencies: { "typed-grid-areas": "^0.2.0" },
    });
    expect(lock.packages!["node_modules/typed-grid-areas"]).toEqual({
      resolved: "packages/core",
      link: true,
    });
  });

  it("has nothing to sync without a lockfile", () => {
    expect(
      syncVersions({
        workspaces: [{ dir: "packages/core", manifest: { version: "0.3.0" } }],
        lock: undefined,
      }).changed,
    ).toEqual([]);
  });

  it("reports nothing to change when everything agrees", () => {
    const lock = lockfile();
    expect(
      syncVersions({
        workspaces: [
          { dir: "packages/core", manifest: { version: "0.1.0" } },
          {
            dir: "packages/react",
            manifest: {
              version: "0.0.0",
              dependencies: { "@radix-ui/react-slot": "^1.3.3", "typed-grid-areas": "^0.1.0" },
              devDependencies: { "@typed-grid-areas/acceptance": "*" },
            },
          },
        ],
        lock,
      }).changed,
    ).toEqual([]);
  });

  it("moves each example app's ranges on published packages to their new versions", () => {
    const example = {
      dir: "examples/react",
      manifest: {
        dependencies: {
          "@typed-grid-areas/react": "^0.1.0",
          react: "^19.3.0",
          "typed-grid-areas": "^0.2.0",
        },
        devDependencies: { typescript: "~6.0.3" },
      },
    };
    const result = syncVersions({
      workspaces: [
        { dir: "packages/core", manifest: { name: "typed-grid-areas", version: "0.3.0" } },
        { dir: "packages/react", manifest: { name: "@typed-grid-areas/react", version: "0.1.1" } },
        {
          dir: "packages/acceptance",
          manifest: { name: "@typed-grid-areas/acceptance", version: "0.0.0", private: true },
        },
      ],
      lock: undefined,
      examples: [example],
    });
    expect(result.changed).toEqual(["examples/react/package.json"]);
    expect(example.manifest).toEqual({
      dependencies: {
        "@typed-grid-areas/react": "^0.1.1",
        react: "^19.3.0",
        "typed-grid-areas": "^0.3.0",
      },
      devDependencies: { typescript: "~6.0.3" },
    });
  });

  it("leaves an example app alone when its ranges are at the current versions", () => {
    const result = syncVersions({
      workspaces: [
        { dir: "packages/core", manifest: { name: "typed-grid-areas", version: "0.2.0" } },
      ],
      lock: undefined,
      examples: [
        { dir: "examples/react", manifest: { dependencies: { "typed-grid-areas": "^0.2.0" } } },
      ],
    });
    expect(result.changed).toEqual([]);
  });
});
