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

async function scanPlugins(claudeJson: string): Promise<{ plugins: string[]; error?: string }> {
  if (!(await exists(claudeJson))) return { plugins: [] };
  try {
    const content = await readFile(claudeJson, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.plugins)) {
      return {
        plugins: data.plugins.map((p: string) => p.split("@")[0].split("/").pop() || p),
      };
    }
    return { plugins: [] };
  } catch (e) {
    return {
      plugins: [],
      error: `Failed to parse ${claudeJson}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function scanMcpServers(mcpJson: string): Promise<{ mcp_servers: string[]; error?: string }> {
  if (!(await exists(mcpJson))) return { mcp_servers: [] };
  try {
    const content = await readFile(mcpJson, "utf-8");
    const data = JSON.parse(content);
    if (data.mcpServers) {
      return { mcp_servers: Object.keys(data.mcpServers) };
    }
    return { mcp_servers: [] };
  } catch (e) {
    return {
      mcp_servers: [],
      error: `Failed to parse ${mcpJson}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function scanForPlugins(
  options: ScanOptions = {}
): Promise<ScanResult & { errors?: string[] }> {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const claudeJson = options.claudeJson || join(homedir(), ".claude.json");
  const mcpJson = options.mcpJson || join(process.cwd(), ".mcp.json");

  const [skill_dirs, pluginsResult, mcpResult] = await Promise.all([
    scanSkillDirs(skillsDir),
    scanPlugins(claudeJson),
    scanMcpServers(mcpJson),
  ]);

  const errors: string[] = [];
  if (pluginsResult.error) errors.push(pluginsResult.error);
  if (mcpResult.error) errors.push(mcpResult.error);

  return {
    skill_dirs,
    plugins: pluginsResult.plugins,
    mcp_servers: mcpResult.mcp_servers,
    cli_commands: [],
    errors: errors.length > 0 ? errors : undefined,
  };
}
