import { readFile } from "fs/promises";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";

const FEATURE_STAGES = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

export async function runGenerate(projectDir: string): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");

  const configContent = await readFile(join(cforgeDir, "config.yaml"), "utf-8");
  const config = parseYaml(configContent);

  const stateContent = await readFile(join(cforgeDir, "state.json"), "utf-8");
  const state = JSON.parse(stateContent);

  await generateOrchestrator(projectDir, {
    workflowName: config.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: config.workflow,
    stages: FEATURE_STAGES,
    description: state.context.description,
  });

  await generateCommands(projectDir, {
    workflowName: config.workflow,
    description: state.context.description,
  });

  await generateClaudeMd(projectDir, { workflowName: config.workflow });

  console.log("Configuration regenerated successfully.");
}
