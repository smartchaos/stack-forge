import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface StagesOptions {
  workflowName: string;
  stages: string[];
  description: string;
}

export async function generateStages(
  projectDir: string,
  options: StagesOptions
): Promise<void> {
  const stagesDir = join(projectDir, ".claude/skills/workflow-orchestrator/stages");
  await mkdir(stagesDir, { recursive: true });

  for (const stage of options.stages) {
    const template = await loadTemplate(`skills/orchestrator/stages/${stage}.md`);
    const rendered = renderTemplate(template, {
      workflow_name: options.workflowName,
      description: options.description,
    });
    await writeFile(join(stagesDir, `${stage}.md`), rendered, "utf-8");
  }
}
