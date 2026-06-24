import { readFile } from "fs/promises";
import { join } from "path";
import { basename } from "path";

export interface ProjectInfo {
  name: string;
  description: string;
}

export async function detectProject(projectDir: string): Promise<ProjectInfo> {
  // Try package.json first
  try {
    const content = await readFile(join(projectDir, "package.json"), "utf-8");
    const pkg = JSON.parse(content);
    return {
      name: pkg.name || basename(projectDir),
      description: pkg.description || "",
    };
  } catch {
    // No package.json
  }

  // Fallback to directory name
  return {
    name: basename(projectDir),
    description: "",
  };
}