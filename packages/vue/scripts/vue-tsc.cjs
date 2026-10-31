// Runs vue-tsc on this workspace's own TypeScript 6: vue-tsc is hoisted to the
// root, where `typescript` is 7, whose API it can't run on.
require("vue-tsc").run(require.resolve("typescript/lib/tsc"));
