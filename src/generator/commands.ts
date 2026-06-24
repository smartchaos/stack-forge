import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface CommandsOptions {
  workflowName: string;
  description?: string;
}

export async function generateCommands(
  projectDir: string,
  options: CommandsOptions
): Promise<void> {
  const commandsDir = join(projectDir, ".claude/commands");
  await mkdir(commandsDir, { recursive: true });

  const template = await loadTemplate("commands/cforge.md");
  const rendered = renderTemplate(template, {
    workflow_name: options.workflowName,
    description: options.description || "",
  });

  await writeFile(join(commandsDir, "cforge.md"), rendered, "utf-8");
}
