import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { StateManager } from "../../src/state/manager.js";

describe("state transitions integration", () => {
  const testDir = join(tmpdir(), "cforge-state-integration");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("completes full workflow lifecycle", async () => {
    await manager.create("feature", "test-project", "add auth");

    const stages = [
      "brainstorm",
      "specification",
      "planning",
      "implementation",
      "review",
      "release",
    ];

    for (const stage of stages) {
      const state = await manager.read();
      expect(state!.current_stage).toBe(stage);

      await manager.completeStage(stage, `${stage}-output.md`);
    }

    const finalState = await manager.read();
    expect(finalState!.current_stage).toBeNull();
    expect(finalState!.status).toBe("done");

    for (const stage of stages) {
      expect(finalState!.stages[stage].status).toBe("completed");
      expect(finalState!.stages[stage].artifact).toBe(`${stage}-output.md`);
    }
  });

  it("handles stage failure and recovery", async () => {
    await manager.create("feature", "test-project", "add auth");

    await manager.completeStage("brainstorm");
    await manager.failStage("specification", "Missing requirements");

    const state = await manager.read();
    expect(state!.status).toBe("error");
    expect(state!.stages.specification.status).toBe("failed");
  });
});