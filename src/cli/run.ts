import { join } from "path";
import { StateManager, WORKFLOW_STAGES } from "../state/manager.js";
import { runLightweightHealthcheck } from "./healthcheck.js";

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
    // Only reset progress when workflow type actually changes
    if (state.workflow !== options.workflow) {
      const stages = WORKFLOW_STAGES[options.workflow] || WORKFLOW_STAGES["feature"];
      state.workflow = options.workflow;
      state.context.type = options.workflow;
      state.status = "in_progress";
      state.current_stage = stages[0];
      // Reset stages to match the new workflow
      state.stages = Object.fromEntries(
        stages.map((name) => [name, { status: "pending", provider: "", artifact: null }])
      ) as typeof state.stages;
    }
  }

  if (options.description) {
    state.context.description = options.description;
  }

  // Pre-flight healthcheck
  const health = await runLightweightHealthcheck(projectDir);
  if (!health.healthy) {
    console.warn(`\nWarning: missing critical providers: ${health.missingCritical.join(", ")}`);
    console.warn("Pipeline may not work correctly. Run `cforge init` to reinstall.\n");
  }

  await stateManager.write(state);

  const desc = state.context.description || "your project";
  console.log(`\nWorkflow: ${state.workflow}`);
  console.log(`Description: ${desc}`);
  console.log(`\nRun in Claude Code:\n  /cforge`);
}
