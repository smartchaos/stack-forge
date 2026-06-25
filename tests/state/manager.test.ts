import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager, WORKFLOW_STAGES } from "../../src/state/manager.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

describe("StateManager", () => {
  const testDir = join(tmpdir(), "cforge-test-state");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates initial state", async () => {
    const state = await manager.create("feature", "my-project", "add auth");
    expect(state.workflow).toBe("feature");
    expect(state.status).toBe("in_progress");
    expect(state.current_stage).toBe("brainstorm");
    expect(state.context.project_name).toBe("my-project");
    expect(state.context.description).toBe("add auth");
  });

  it("reads existing state", async () => {
    await manager.create("feature", "my-project", "add auth");
    const loaded = await manager.read();
    expect(loaded).toBeDefined();
    expect(loaded!.workflow).toBe("feature");
  });

  it("transitions stage", async () => {
    await manager.create("feature", "my-project", "add auth");
    await manager.completeStage("brainstorm");
    const state = await manager.read();
    expect(state!.stages.brainstorm.status).toBe("completed");
    expect(state!.current_stage).toBe("specification");
  });

  it("returns null when no state exists", async () => {
    const state = await manager.read();
    expect(state).toBeNull();
  });
});

describe("StateManager error recovery", () => {
  const testDir = join(tmpdir(), "cforge-test-state-recovery");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns null for corrupted state file", async () => {
    await writeFile(join(testDir, "state.json"), "{ corrupted", "utf-8");
    const state = await manager.read();
    expect(state).toBeNull();
  });

  it("creates backup before write", async () => {
    await manager.create("feature", "test", "desc");
    const state = await manager.read();
    if (state) await manager.write(state);

    expect(existsSync(join(testDir, "state.json.bak"))).toBe(true);
  });
});

describe("StateManager bugfix workflow", () => {
  const testDir = join(tmpdir(), "cforge-test-state-bugfix");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates bugfix state with diagnosis as first stage", async () => {
    const state = await manager.create("bugfix", "my-project", "fix login");
    expect(state.workflow).toBe("bugfix");
    expect(state.current_stage).toBe("diagnosis");
    expect(Object.keys(state.stages)).toEqual([
      "diagnosis",
      "planning",
      "implementation",
      "review",
      "release",
    ]);
  });

  it("transitions through bugfix stages", async () => {
    await manager.create("bugfix", "my-project", "fix login");
    await manager.completeStage("diagnosis");
    let state = await manager.read();
    expect(state!.current_stage).toBe("planning");

    await manager.completeStage("planning");
    state = await manager.read();
    expect(state!.current_stage).toBe("implementation");

    await manager.completeStage("implementation");
    state = await manager.read();
    expect(state!.current_stage).toBe("review");

    await manager.completeStage("review");
    state = await manager.read();
    expect(state!.current_stage).toBe("release");

    await manager.completeStage("release");
    state = await manager.read();
    expect(state!.current_stage).toBeNull();
    expect(state!.status).toBe("done");
  });

  it("exports WORKFLOW_STAGES", () => {
    expect(WORKFLOW_STAGES.feature).toBeDefined();
    expect(WORKFLOW_STAGES.bugfix).toBeDefined();
    expect(WORKFLOW_STAGES.bugfix[0]).toBe("diagnosis");
  });
});
