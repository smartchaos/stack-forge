export type DetectionType =
  | "skill_exists"
  | "slash_command"
  | "plugin_installed"
  | "command_exists"
  | "cli_installed"
  | "mcp_server_configured";

export interface DetectionRule {
  type: DetectionType;
  path?: string;
  match_name?: string;
  match_prefix?: string;
  command?: string;
  name?: string;
  command_name?: string;
}

export interface ProviderDefinition {
  name: string;
  capabilities: string[];
  detect: DetectionRule[];
}

export interface DetectedProvider {
  name: string;
  version?: string;
  source: string;
  capabilities: string[];
  detected_at: string;
}

export interface CapabilityDefinition {
  name: string;
  description: string;
  input: string;
  output: string;
  default_provider: string;
}
