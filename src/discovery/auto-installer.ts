import { execFile } from "child_process";
import { promisify } from "util";
import type { ManifestEntry } from "../types/config.js";

const execFileAsync = promisify(execFile);

export interface InstallResult {
  provider: string;
  status: "installed" | "skipped" | "pending" | "failed";
  instruction?: string;
}

function detectOs(): "macos" | "linux" | "windows" {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "linux";
}

export async function installProviderSilent(entry: ManifestEntry): Promise<InstallResult> {
  if (entry.install.type === "claude_command") {
    return {
      provider: entry.name,
      status: "pending",
      instruction: entry.install.command,
    };
  }

  if (entry.install.type === "git_clone" && detectOs() === "windows") {
    return {
      provider: entry.name,
      status: "pending",
      instruction: `Windows not supported. Install manually: ${entry.install.command}`,
    };
  }

  try {
    const parts = entry.install.command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);
    await execFileAsync(cmd, args);

    if (entry.post_install) {
      const postParts = entry.post_install.split(" ");
      const postCmd = postParts[0];
      const postArgs = postParts.slice(1);
      await execFileAsync(postCmd, postArgs);
    }

    return { provider: entry.name, status: "installed" };
  } catch {
    return { provider: entry.name, status: "failed" };
  }
}

export async function installProvidersSilent(
  entries: ManifestEntry[]
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];
  for (const entry of entries) {
    if (entry.priority === "optional") {
      results.push({ provider: entry.name, status: "skipped" });
      continue;
    }
    results.push(await installProviderSilent(entry));
  }
  return results;
}