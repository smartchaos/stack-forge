import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface ScanResult {
  skill_dirs: string[];
  plugins: string[];
  mcp_servers: string[];
  cli_commands: string[];
}

export interface ScanOptions {
  skillsDir?: string;
  claudeJson?: string;
  mcpJson?: string;
}

const DEFAULT_SKILLS_DIR = join(homedir(), ".claude", "skills");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function scanSkillDirs(skillsDir: string): Promise<string[]> {
  if (!(await exists(skillsDir))) return [];
  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function scanPlugins(claudeJson: string): Promise<string[]> {
  if (!(await exists(claudeJson))) return [];
  try {
    const content = await readFile(claudeJson, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.plugins)) {
      return data.plugins.map((p: string) => p.split("@")[0].split("/").pop() || p);
    }
  } catch {}
  return [];
}

async function scanMcpServers(mcpJson: string): Promise<string[]> {
  if (!(await exists(mcpJson))) return [];
  try {
    const content = await readFile(mcpJson, "utf-8");
    const data = JSON.parse(content);
    if (data.mcpServers) {
      return Object.keys(data.mcpServers);
    }
  } catch {}
  return [];
}

export async function scanForPlugins(
  options: ScanOptions = {}
): Promise<ScanResult> {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const claudeJson = options.claudeJson || join(homedir(), ".claude.json");
  const mcpJson = options.mcpJson || join(process.cwd(), ".mcp.json");

  const [skill_dirs, plugins, mcp_servers] = await Promise.all([
    scanSkillDirs(skillsDir),
    scanPlugins(claudeJson),
    scanMcpServers(mcpJson),
  ]);

  return { skill_dirs, plugins, mcp_servers, cli_commands: [] };
}
