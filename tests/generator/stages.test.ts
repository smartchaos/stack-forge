import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateStages } from "../../src/generator/stages.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("stages generator", () => {
  const testDir = join(tmpdir(), "cforge-test-stages");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates all stage skill files", async () => {
    await generateStages(testDir, {
      workflowName: "feature",
      stages: ["brainstorm", "specification", "planning"],
      description: "add auth",
    });

    const stagesDir = join(testDir, ".claude/skills/workflow-orchestrator/stages");
    const content = await readFile(join(stagesDir, "brainstorm.md"), "utf-8");
    expect(content).toContain("Brainstorm");
  });
});
