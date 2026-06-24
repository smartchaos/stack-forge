import { execSync } from "child_process";
import type { ManifestEntry } from "../types/config.js";

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

function getInstallCommand(entry: ManifestEntry): string {
  if (entry.install.type === "git_clone") {
    const os = detectOs();
    if (os === "windows") {
      return `echo "Windows not supported for git_clone"`;
    }
    return entry.install.command;
  }
  return entry.install.command;
}

export async function installProviderSilent(entry: ManifestEntry): Promise<InstallResult> {
  if (entry.install.type === "claude_command") {
    return {
      provider: entry.name,
      status: "pending",
      instruction: entry.install.command,
    };
  }

  const cmd = getInstallCommand(entry);
  try {
    execSync(cmd, { stdio: "pipe" });
    if (entry.post_install) {
      execSync(entry.post_install, { stdio: "pipe" });
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