import { describe, it, expect } from "vitest";
import { WorkflowStateSchema, ForgeConfigSchema } from "../../src/schemas/config.js";

describe("WorkflowStateSchema", () => {
  it("validates correct workflow state", () => {
    const state = {
      version: "1.0",
      workflow: "feature",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      current_stage: "brainstorm",
      status: "in_progress",
      context: { type: "feature", project_name: "test", description: "test" },
      stages: {
        brainstorm: { status: "pending", provider: "", artifact: null },
        specification: { status: "pending", provider: "", artifact: null },
        planning: { status: "pending", provider: "", artifact: null },
        implementation: { status: "pending", provider: "", artifact: null },
        review: { status: "pending", provider: "", artifact: null },
        release: { status: "pending", provider: "", artifact: null },
      },
    };

    const result = WorkflowStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const state = {
      version: "1.0",
      workflow: "feature",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      current_stage: "brainstorm",
      status: "invalid_status",
      context: { type: "feature", project_name: "test", description: "test" },
      stages: {},
    };

    const result = WorkflowStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

describe("ForgeConfigSchema", () => {
  it("validates correct config", () => {
    const config = {
      workflow: "feature",
      providers: { brainstorm: "superpowers" },
      overrides: {},
      stages: { auto_advance: true, pause_on_review: true },
      artifacts: { output_dir: ".cforge/artifacts" },
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
