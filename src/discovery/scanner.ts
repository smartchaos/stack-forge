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

interface PluginInfo {
  name: string;
  installPath: string;
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

async function scanPlugins(installedPluginsJson: string): Promise<{ plugins: PluginInfo[]; error?: string }> {
  if (!(await exists(installedPluginsJson))) return { plugins: [] };
  try {
    const content = await readFile(installedPluginsJson, "utf-8");
    const data = JSON.parse(content);
    if (data.plugins && typeof data.plugins === "object" && !Array.isArray(data.plugins)) {
      const plugins: PluginInfo[] = [];
      for (const [key, entries] of Object.entries(data.plugins)) {
        if (!Array.isArray(entries) || entries.length === 0) continue;
        const pluginName = key.split("@")[0].split("/").pop() || key;
        const installPath = (entries[0] as { installPath?: string }).installPath;
        if (installPath) {
          plugins.push({ name: pluginName, installPath });
        }
      }
      return { plugins };
    }
    return { plugins: [] };
  } catch (e) {
    return {
      plugins: [],
      error: `Failed to parse ${installedPluginsJson}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function scanSkillsFromPlugins(plugins: PluginInfo[]): Promise<string[]> {
  const skillDirs: string[] = [];
  
  for (const plugin of plugins) {
    if (!(await exists(plugin.installPath))) continue;
    
    // Check for skills directory at plugin root level
    const skillsPath = join(plugin.installPath, "skills");
    if (await exists(skillsPath)) {
      const entries = await readdir(skillsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !skillDirs.includes(entry.name)) {
          skillDirs.push(entry.name);
        }
      }
    }
  }
  
  return skillDirs;
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

  // Scan skills from plugin installPath (only when using default skills directory)
  let pluginSkillDirs: string[] = [];
  if (!options.skillsDir && pluginsResult.plugins.length > 0) {
    pluginSkillDirs = await scanSkillsFromPlugins(pluginsResult.plugins);
  }

  // Merge skill directories, deduplicate
  const allSkillDirs = [...new Set([...skill_dirs, ...pluginSkillDirs])];

  const errors: string[] = [];
  if (pluginsResult.error) errors.push(pluginsResult.error);
  if (mcpResult.error) errors.push(mcpResult.error);

  return {
    skill_dirs: allSkillDirs,
    plugins: pluginsResult.plugins.map((p) => p.name),
    mcp_servers: mcpResult.mcp_servers,
    cli_commands: [],
    errors: errors.length > 0 ? errors : undefined,
  };
}
