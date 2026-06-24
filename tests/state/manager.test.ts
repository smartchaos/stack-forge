import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "../../src/state/manager.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

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
