import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { WorkflowState, StageName, StageStatus } from "../types/workflow.js";
import { WorkflowStateSchema } from "../schemas/config.js";
import { logger } from "../logger.js";

const FEATURE_STAGES: StageName[] = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

const BUGFIX_STAGES: StageName[] = [
  "diagnosis",
  "planning",
  "implementation",
  "review",
  "release",
];

export const WORKFLOW_STAGES: Record<string, StageName[]> = {
  feature: FEATURE_STAGES,
  bugfix: BUGFIX_STAGES,
};

function getStageOrder(stages: Record<string, unknown>): StageName[] {
  return Object.keys(stages) as StageName[];
}

function validateState(content: string): WorkflowState | null {
  try {
    const parsed = JSON.parse(content);
    const result = WorkflowStateSchema.safeParse(parsed);
    if (!result.success) {
      logger.error({ errors: result.error.issues }, "Invalid state file");
      return null;
    }
    return result.data;
  } catch (e) {
    logger.error({ error: e }, "Failed to parse state file");
    return null;
  }
}

function defaultStages(stageNames: StageName[]): WorkflowState["stages"] {
  const stages: Record<string, { status: StageStatus; provider: string; artifact: null }> = {};
  for (const name of stageNames) {
    stages[name] = { status: "pending", provider: "", artifact: null };
  }
  return stages as WorkflowState["stages"];
}

export class StateManager {
  private statePath: string;
  private backupPath: string;

  constructor(private dir: string) {
    this.statePath = join(dir, "state.json");
    this.backupPath = join(dir, "state.json.bak");
  }

  async create(workflow: string, projectName: string, description: string, stageNames?: StageName[]): Promise<WorkflowState> {
    await mkdir(this.dir, { recursive: true });

    const stages = stageNames || WORKFLOW_STAGES[workflow] || FEATURE_STAGES;

    const state: WorkflowState = {
      version: "1.0",
      workflow,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_stage: stages[0],
      status: "in_progress",
      context: { type: workflow, project_name: projectName, description },
      stages: defaultStages(stages),
    };

    await this.write(state);
    return state;
  }

  async read(): Promise<WorkflowState | null> {
    if (!existsSync(this.statePath)) return null;

    try {
      const content = await readFile(this.statePath, "utf-8");
      return validateState(content);
    } catch (e) {
      logger.error({ error: e }, "Failed to read state file");
      if (existsSync(this.backupPath)) {
        try {
          const content = await readFile(this.backupPath, "utf-8");
          const state = validateState(content);
          if (state) {
            await this.write(state);
          }
          return state;
        } catch (e2) {
          logger.error({ error: e2 }, "Failed to read backup");
          return null;
        }
      }
      return null;
    }
  }

  async write(state: WorkflowState): Promise<void> {
    await mkdir(this.dir, { recursive: true });

    if (existsSync(this.statePath)) {
      await copyFile(this.statePath, this.backupPath);
    }

    state.updated_at = new Date().toISOString();
    await writeFile(this.statePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async completeStage(name: StageName, artifact?: string): Promise<WorkflowState> {
    const state = await this.read();
    if (!state) throw new Error("No workflow state found");

    state.stages[name].status = "completed";
    state.stages[name].completed_at = new Date().toISOString();
    if (artifact) state.stages[name].artifact = artifact;

    const stageOrder = getStageOrder(state.stages);
    const currentIndex = stageOrder.indexOf(name);
    const nextIndex = currentIndex + 1;

    if (nextIndex < stageOrder.length) {
      state.current_stage = stageOrder[nextIndex];
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
