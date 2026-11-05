/**
 * React Compiler skips what it can't compile and runs it as written, so a
 * component it bails out on still works and nothing else notices. This spec
 * notices: it compiles the adapter source and fails on any error or bailout,
 * and on any component the compiler didn't compile at all.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileWithReactCompiler } from "./test-utils/reactCompiler.ts";

const sourcePath = resolve(__dirname, "gridComponent.tsx");

describe("the React adapter under React Compiler", () => {
  it("compiles every component it creates, without errors or bailouts", async () => {
    const { events } = await compileWithReactCompiler(readFileSync(sourcePath, "utf8"), sourcePath);

    const problems = events.flatMap(event => {
      const line = "fnLoc" in event ? event.fnLoc?.start.line : undefined;
      switch (event.kind) {
        case "CompileError":
        case "CompileDiagnostic":
          return [`${event.kind} (line ${line}): ${event.detail.reason}`];
        case "CompileSkip":
          return [`${event.kind} (line ${line}): ${event.reason}`];
        case "PipelineError":
          return [`${event.kind} (line ${line}): ${event.data}`];
        default:
          return [];
      }
    });
    expect(problems).toEqual([]);

    const compiled = events.flatMap(event =>
      event.kind === "CompileSuccess" ? [event.fnName] : [],
    );
    // The grid root, a slot, and the root of a nested grid.
    expect(compiled).toEqual(expect.arrayContaining(["Root", "SlotComponent", "NestedRoot"]));
  });
});
