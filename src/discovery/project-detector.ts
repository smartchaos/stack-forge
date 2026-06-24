import { readFile } from "fs/promises";
import { join, basename } from "path";
import { execSync } from "child_process";

export interface ProjectInfo {
  name: string;
  description: string;
}

function getGitRemoteName(projectDir: string): string | null {
  try {
    const url = execSync("git remote get-url origin", {
      cwd: projectDir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    // Extract repo name from URL (handles both SSH and HTTPS)
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
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

  // Try git remote
  const gitName = getGitRemoteName(projectDir);
  if (gitName) {
    return {
      name: gitName,
      description: "",
    };
  }

  // Fallback to directory name
  return {
    name: basename(projectDir),
    description: "",
  };
}