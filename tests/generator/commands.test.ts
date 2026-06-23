import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateCommands } from "../../src/generator/commands.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("commands generator", () => {
  const testDir = join(tmpdir(), "cforge-test-commands");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates workflow command", async () => {
    await generateCommands(testDir, {
      workflowName: "feature",
      description: "add auth",
    });

    const content = await readFile(join(testDir, ".claude/commands/workflow.md"), "utf-8");
    expect(content).toContain("feature");
    expect(content).toContain("add auth");
  });
});
