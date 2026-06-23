import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateOrchestrator } from "../../src/generator/orchestrator.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("orchestrator generator", () => {
  const testDir = join(tmpdir(), "cforge-test-orchestrator");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates orchestrator SKILL.md", async () => {
    await generateOrchestrator(testDir, {
      workflowName: "feature",
      stages: ["brainstorm", "specification", "planning"],
    });

    const content = await readFile(
      join(testDir, ".claude/skills/workflow-orchestrator/SKILL.md"),
      "utf-8"
    );
    expect(content).toContain("feature");
    expect(content).toContain("brainstorm");
  });
});
