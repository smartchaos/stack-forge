import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { WorkflowState, StageName, StageStatus } from "../types/workflow.js";

const STAGE_ORDER: StageName[] = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

function defaultStages(): WorkflowState["stages"] {
  const stages: Record<string, { status: StageStatus; provider: string; artifact: null }> = {};
  for (const name of STAGE_ORDER) {
    stages[name] = { status: "pending", provider: "", artifact: null };
  }
  return stages as unknown as WorkflowState["stages"];
}

export class StateManager {
  private statePath: string;

  constructor(private dir: string) {
    this.statePath = join(dir, "state.json");
  }

  async create(workflow: string, projectName: string, description: string): Promise<WorkflowState> {
    await mkdir(this.dir, { recursive: true });

    const state: WorkflowState = {
      version: "1.0",
      workflow,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_stage: "brainstorm",
      status: "in_progress",
      context: { type: workflow, project_name: projectName, description },
      stages: defaultStages(),
    };

    await this.write(state);
    return state;
  }

  async read(): Promise<WorkflowState | null> {
    if (!existsSync(this.statePath)) return null;
    const content = await readFile(this.statePath, "utf-8");
    return JSON.parse(content) as WorkflowState;
  }

  async write(state: WorkflowState): Promise<void> {
    state.updated_at = new Date().toISOString();
    await writeFile(this.statePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async completeStage(name: StageName, artifact?: string): Promise<WorkflowState> {
    const state = await this.read();
    if (!state) throw new Error("No workflow state found");

    state.stages[name].status = "completed";
    state.stages[name].completed_at = new Date().toISOString();
    if (artifact) state.stages[name].artifact = artifact;

    const currentIndex = STAGE_ORDER.indexOf(name);
    const nextIndex = currentIndex + 1;

    if (nextIndex < STAGE_ORDER.length) {
      state.current_stage = STAGE_ORDER[nextIndex];
    } else {
      state.current_stage = null;
      state.status = "done";
    }

    await this.write(state);
    return state;
  }

  async failStage(name: StageName, error: string): Promise<WorkflowState> {
    const state = await this.read();
    if (!state) throw new Error("No workflow state found");

    state.stages[name].status = "failed";
    state.status = "error";

    await this.write(state);
    return state;
  }
}
