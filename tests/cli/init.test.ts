import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runInit } from "../../src/cli/init.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge init", () => {
  const testDir = join(tmpdir(), "cforge-test-init");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates all config files", async () => {
    await runInit(testDir, {
      mode: "existing",
      workflow: "feature",
      description: "test project",
    });

    const files = [
      ".cforge/config.yaml",
      ".cforge/providers.yaml",
      ".cforge/state.json",
      ".claude/skills/workflow-orchestrator/SKILL.md",
      ".claude/commands/workflow.md",
    ];

    for (const file of files) {
      const content = await readFile(join(testDir, file), "utf-8");
      expect(content).toBeDefined();
    }
  });
});
