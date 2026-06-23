import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface OrchestratorOptions {
  workflowName: string;
  stages: string[];
}

export async function generateOrchestrator(
  projectDir: string,
  options: OrchestratorOptions
): Promise<void> {
  const skillDir = join(projectDir, ".claude/skills/workflow-orchestrator");
  await mkdir(skillDir, { recursive: true });

  const template = await loadTemplate("skills/orchestrator/SKILL.md");
  const rendered = renderTemplate(template, {
    workflow_name: options.workflowName,
    stage_list: options.stages.join(" → "),
    current_stage: options.stages[0],
    status: "in_progress",
  });

  await writeFile(join(skillDir, "SKILL.md"), rendered, "utf-8");
}
