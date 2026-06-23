import { StateManager } from "../state/manager.js";
import { join } from "path";

export interface StatusInfo {
  workflow: string;
  currentStage: string | null;
  status: string;
  description: string;
  stages: Record<string, { status: string; provider: string }>;
}

export async function runStatus(projectDir: string): Promise<StatusInfo | null> {
  const cforgeDir = join(projectDir, ".cforge");
  const manager = new StateManager(cforgeDir);
  const state = await manager.read();

  if (!state) {
    console.log("No workflow initialized. Run `cforge init` first.");
    return null;
  }

  const info: StatusInfo = {
    workflow: state.workflow,
    currentStage: state.current_stage,
    status: state.status,
    description: state.context.description,
    stages: Object.fromEntries(
      Object.entries(state.stages).map(([name, s]) => [
        name,
        { status: s.status, provider: s.provider },
      ])
    ),
  };

  console.log(`Workflow: ${info.workflow}`);
  console.log(`Description: ${info.description}`);
  console.log(`Status: ${info.status}`);
  console.log(`Current Stage: ${info.currentStage || "complete"}`);
  console.log("\nStages:");
  for (const [name, stage] of Object.entries(info.stages)) {
    const marker = name === info.currentStage ? " → " : "   ";
    console.log(`${marker}${name}: ${stage.status} (${stage.provider})`);
  }

  return info;
}
