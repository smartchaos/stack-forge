import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export interface ClaudeMdOptions {
  workflowName: string;
}

const STACK_FORGE_SECTION = `
## Stack Forge

This project uses Stack Forge for workflow orchestration.

- Start workflow: \`/workflow <type> "<description>"\`
- Check status: \`cforge status\`
- Update providers: \`cforge update\`

Workflow stages: brainstorm → specification → planning → implementation → review → release
`;

export async function generateClaudeMd(
  projectDir: string,
  options: ClaudeMdOptions
): Promise<void> {
  const claudeMdPath = join(projectDir, "CLAUDE.md");

  let existing = "";
  if (existsSync(claudeMdPath)) {
    existing = await readFile(claudeMdPath, "utf-8");
  }

  if (existing.includes("## Stack Forge")) {
    return; // Already has Stack Forge section
  }

  await writeFile(claudeMdPath, existing + "\n" + STACK_FORGE_SECTION, "utf-8");
}
