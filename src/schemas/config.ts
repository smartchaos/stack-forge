import { z } from "zod";

export const StageNameSchema = z.enum([
  "diagnosis",
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
]);

export const StageStatusSchema = z.enum(["pending", "in_progress", "completed", "failed", "paused"]);
export const WorkflowStatusSchema = z.enum(["in_progress", "paused", "done", "error"]);

export const StageStateSchema = z.object({
  status: StageStatusSchema,
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  provider: z.string(),
  artifact: z.string().nullable().optional(),
});

export const WorkflowContextSchema = z.object({
  type: z.string(),
  project_name: z.string(),
  description: z.string(),
  branch: z.string().optional(),
});

export const WorkflowStateSchema = z.object({
  version: z.string(),
  workflow: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_stage: StageNameSchema.nullable(),
  status: WorkflowStatusSchema,
  context: WorkflowContextSchema,
  stages: z.record(z.string(), StageStateSchema),
});

export const ForgeConfigSchema = z.object({
  workflow: z.string(),
  providers: z.record(z.string(), z.string()),
  overrides: z.record(z.string(), z.union([z.string(), z.literal("builtin"), z.literal("none")])),
  stages: z.object({
    auto_advance: z.boolean(),
    pause_on_review: z.boolean(),
  }),
  artifacts: z.object({
    output_dir: z.string(),
  }),
});
