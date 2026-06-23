import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("inquirer", () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ selected: [] }),
  },
}));

const { runInit } = await import("../../src/cli/init.js");

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
      "CLAUDE.md",
    ];

    for (const file of files) {
      const content = await readFile(join(testDir, file), "utf-8");
      expect(content).toBeDefined();
    }
  });

  it("generates CLAUDE.md with provider info", async () => {
    await runInit(testDir, {
      mode: "existing",
      workflow: "feature",
      description: "test",
    });

    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("Stack Forge");
    expect(content).toContain("/workflow");
  });
});
