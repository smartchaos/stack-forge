import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runWorkflow } from "../../src/cli/run.js";
import { writeFile, readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const TEST_DIR = join(tmpdir(), "cforge-run-test-" + Date.now());

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    version: "1.0",
    workflow: "feature",
    status: "in_progress",
    current_stage: "brainstorm",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    context: { type: "feature", description: "add auth" },
    stages: {
      brainstorm: { status: "pending", provider: "", artifact: null },
      specification: { status: "pending", provider: "", artifact: null },
      planning: { status: "pending", provider: "", artifact: null },
      implementation: { status: "pending", provider: "", artifact: null },
      review: { status: "pending", provider: "", artifact: null },
      release: { status: "pending", provider: "", artifact: null },
    },
    ...overrides,
  };
}

beforeEach(async () => {
  await mkdir(join(TEST_DIR, ".cforge"), { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("runWorkflow", () => {
  it("outputs instruction when state exists", async () => {
    const state = makeState();
    await writeFile(
      join(TEST_DIR, ".cforge/state.json"),
      JSON.stringify(state)
    );

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runWorkflow(TEST_DIR, {});
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("cforge")
    );
    consoleSpy.mockRestore();
  });

  it("errors when no state exists", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await runWorkflow(TEST_DIR, {});
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("cforge init")
    );
    consoleSpy.mockRestore();
  });

  it("updates state with new workflow type and resets progress", async () => {
    const state = makeState({
      status: "in_progress",
      current_stage: "planning",
    });
    await writeFile(
      join(TEST_DIR, ".cforge/state.json"),
      JSON.stringify(state)
    );

    await runWorkflow(TEST_DIR, {
      workflow: "bugfix",
      description: "fix login",
    });
    const newState = JSON.parse(
      await readFile(join(TEST_DIR, ".cforge/state.json"), "utf-8")
    );
    expect(newState.workflow).toBe("bugfix");
    expect(newState.context.description).toBe("fix login");
    expect(newState.status).toBe("in_progress");
    expect(newState.current_stage).toBe("brainstorm");
  });

  it("does not reset progress when only description changes", async () => {
    const state = makeState({
      current_stage: "planning",
    });
    await writeFile(
      join(TEST_DIR, ".cforge/state.json"),
      JSON.stringify(state)
    );

    await runWorkflow(TEST_DIR, { description: "updated desc" });
    const newState = JSON.parse(
      await readFile(join(TEST_DIR, ".cforge/state.json"), "utf-8")
    );
    expect(newState.context.description).toBe("updated desc");
    expect(newState.current_stage).toBe("planning");
  });
});
