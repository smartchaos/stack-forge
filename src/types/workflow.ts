export type StageStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";
export type WorkflowStatus = "in_progress" | "paused" | "done" | "error";

export type StageName =
  | "diagnosis"
  | "brainstorm"
  | "specification"
  | "planning"
  | "implementation"
  | "review"
  | "release";

export interface StageState {
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
  provider: string;
  artifact?: string | null;
}

export interface WorkflowContext {
  type: string;
  project_name: string;
  description: string;
  branch?: string;
}

export interface WorkflowState {
  version: string;
  workflow: string;
  created_at: string;
  updated_at: string;
  current_stage: StageName | null;
  status: WorkflowStatus;
  context: WorkflowContext;
  stages: Record<string, StageState>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  stages: StageName[];
}
