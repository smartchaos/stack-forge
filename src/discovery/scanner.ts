import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface ScanResult {
  skill_dirs: string[];
  plugins: string[];
  mcp_servers: string[];
  cli_commands: string[];
  errors?: string[];
}

export interface ScanOptions {
  skillsDir?: string;
  installedPluginsJson?: string;
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

async function scanPlugins(installedPluginsJson: string): Promise<{ plugins: string[]; error?: string }> {
  if (!(await exists(installedPluginsJson))) return { plugins: [] };
  try {
    const content = await readFile(installedPluginsJson, "utf-8");
    const data = JSON.parse(content);
    if (data.plugins && typeof data.plugins === "object" && !Array.isArray(data.plugins)) {
      return {
        plugins: Object.keys(data.plugins).map((key) => key.split("@")[0].split("/").pop() || key),
      };
    }
    return { plugins: [] };
  } catch (e) {
    return {
      plugins: [],
      error: `Failed to parse ${installedPluginsJson}: ${e instanceof Error ? e.message : String(e)}`,
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
): Promise<ScanResult> {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const installedPluginsJson = options.installedPluginsJson || join(homedir(), ".claude", "plugins", "installed_plugins.json");
  const mcpJson = options.mcpJson || join(process.cwd(), ".mcp.json");

  const [skill_dirs, pluginsResult, mcpResult] = await Promise.all([
    scanSkillDirs(skillsDir),
    scanPlugins(installedPluginsJson),
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
