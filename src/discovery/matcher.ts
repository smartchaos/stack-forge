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
      return scan.skill_dirs.some((dir) => {
        if (rule.match_name) return dir.includes(rule.match_name);
        if (rule.path) {
          const pathParts = rule.path.replace(/\/$/, "").split("/");
          const dirParts = dir.replace(/\/$/, "").split("/");
          return dirParts[dirParts.length - 1] === pathParts[pathParts.length - 1];
        }
        return false;
      });
    case "slash_command":
      return scan.skill_dirs.some((dir) => {
        if (!rule.command_name) return false;
        return dir === `_${rule.command_name}-command`;
      });
    case "mcp_server_configured":
      return scan.mcp_servers.includes(rule.name || "");
    case "cli_installed":
      return scan.cli_commands.includes(rule.command || "");
    case "command_exists":
      return scan.cli_commands.some((cmd) =>
        rule.match_prefix ? cmd.startsWith(rule.match_prefix) : cmd === rule.command
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
    const matchedRules = provider.detect.filter((rule) => matchesDetection(scan, rule));
    if (matchedRules.length > 0) {
      detected[name] = {
        name,
        capabilities: provider.capabilities,
        source: `detected:${name}`,
        detected_at: new Date().toISOString(),
        matched_rule_count: matchedRules.length,
        routing: provider.routing,
      };
    }
  }

  return detected;
}
