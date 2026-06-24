import { readFile } from "fs/promises";
import { join, basename } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProjectInfo {
  name: string;
  description: string;
}

async function getGitRemoteName(projectDir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], {
      cwd: projectDir,
    });
    const url = stdout.trim();
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function detectProject(projectDir: string): Promise<ProjectInfo> {
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

  const gitName = await getGitRemoteName(projectDir);
  if (gitName) {
    return { name: gitName, description: "" };
  }

  return { name: basename(projectDir), description: "" };
}