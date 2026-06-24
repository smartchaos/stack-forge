import { join } from "path";
import { StateManager } from "../state/manager.js";

export interface RunOptions {
  workflow?: string;
  description?: string;
}

export async function runWorkflow(
  projectDir: string,
  options: RunOptions = {}
): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");
  const stateManager = new StateManager(cforgeDir);
  const state = await stateManager.read();

  if (!state) {
    console.error("No workflow initialized. Run `cforge init` first.");
    return;
  }

  if (options.workflow) {
    state.workflow = options.workflow;
    state.context.type = options.workflow;
    // Only reset progress when workflow type changes
    state.status = "in_progress";
    state.current_stage = "brainstorm";
  }

  if (options.description) {
    state.context.description = options.description;
  }

  await stateManager.write(state);

  const desc = state.context.description || "your project";
  console.log(`\nWorkflow: ${state.workflow}`);
  console.log(`Description: ${desc}`);
  console.log(`\nRun in Claude Code:\n  /cforge`);
}
