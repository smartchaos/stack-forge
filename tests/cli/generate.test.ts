import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runGenerate } from "../../src/cli/generate.js";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge generate", () => {
  const testDir = join(tmpdir(), "cforge-test-generate");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, ".cforge"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("regenerates config files from existing state", async () => {
    await writeFile(join(testDir, ".cforge/config.yaml"), "workflow: feature\n");
    await writeFile(
      join(testDir, ".cforge/state.json"),
      JSON.stringify({
        version: "1.0",
        workflow: "feature",
        created_at: "2026-06-23T10:00:00Z",
        updated_at: "2026-06-23T10:00:00Z",
        current_stage: "brainstorm",
        status: "in_progress",
        context: { type: "feature", description: "test" },
        stages: {},
      })
    );

    await runGenerate(testDir);

    const skillContent = await readFile(
      join(testDir, ".claude/skills/workflow-orchestrator/SKILL.md"),
      "utf-8"
    );
    expect(skillContent).toContain("feature");
  });
});
