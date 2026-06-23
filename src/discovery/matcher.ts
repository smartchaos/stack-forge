import type { ScanResult } from "./scanner.js";
import type { ProviderDefinition, DetectedProvider } from "../types/provider.js";

function matchesDetection(
  scan: ScanResult,
  rule: ProviderDefinition["detect"][0]
): boolean {
  switch (rule.type) {
    case "plugin_installed":
      return scan.plugins.includes(rule.name || "");
    case "skill_exists":
      return scan.skill_dirs.some((dir) =>
        rule.match_name ? dir.includes(rule.match_name) : dir === rule.match_name
      );
    case "mcp_server_configured":
      return scan.mcp_servers.includes(rule.name || "");
    case "cli_installed":
      return scan.cli_commands.includes(rule.command || "");
    case "command_exists":
      return scan.cli_commands.some((cmd) =>
        rule.match_prefix ? cmd.startsWith(rule.match_prefix) : cmd === rule.match_prefix
      );
    default:
      return false;
  }
}

export function matchProviders(
  scan: ScanResult,
  providers: Record<string, ProviderDefinition>
): Record<string, DetectedProvider> {
  const detected: Record<string, DetectedProvider> = {};

  for (const [name, provider] of Object.entries(providers)) {
    const matched = provider.detect.some((rule) => matchesDetection(scan, rule));
    if (matched) {
      detected[name] = {
        name,
        capabilities: provider.capabilities,
        source: `detected:${name}`,
        detected_at: new Date().toISOString(),
      };
    }
  }

  return detected;
}
