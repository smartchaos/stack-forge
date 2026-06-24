import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runStatus } from "../../src/cli/status.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge status", () => {
  const testDir = join(tmpdir(), "cforge-test-status");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns status info when state exists", async () => {
    await mkdir(join(testDir, ".cforge"), { recursive: true });
    await writeFile(
      join(testDir, ".cforge/state.json"),
      JSON.stringify({
        version: "1.0",
        workflow: "feature",
        created_at: "2026-06-23T10:00:00Z",
        updated_at: "2026-06-23T10:00:00Z",
        current_stage: "brainstorm",
        status: "in_progress",
        context: { type: "feature", project_name: "test-project", description: "add auth" },
        stages: {
          brainstorm: { status: "in_progress", provider: "superpowers" },
          specification: { status: "pending", provider: "openspec" },
          planning: { status: "pending", provider: "superpowers" },
          implementation: { status: "pending", provider: "builtin" },
          review: { status: "pending", provider: "gstack" },
          release: { status: "pending", provider: "gstack" },
        },
      })
    );

    const status = await runStatus(testDir);
    expect(status).toBeDefined();
    expect(status!.workflow).toBe("feature");
    expect(status!.currentStage).toBe("brainstorm");
  });

  it("returns null when no state exists", async () => {
    const status = await runStatus(testDir);
    expect(status).toBeNull();
  });
});
