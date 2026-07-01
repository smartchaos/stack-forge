import { BUILTIN_PROVIDER } from "./provider.js";

export type ProviderOverride = string | typeof BUILTIN_PROVIDER | "none";

export interface ForgeConfig {
  workflow: string;
  providers: Record<string, string>;
  overrides: Record<string, ProviderOverride>;
  stages: {
    auto_advance: boolean;
    pause_on_review: boolean;
  };
  artifacts: {
    output_dir: string;
  };
}

export interface ManifestEntry {
  name: string;
  description: string;
  capabilities: string[];
  priority: "required" | "recommended" | "optional";
  install: {
    type: "npm" | "claude_plugin" | "git_clone" | "cli" | "claude_command";
    command: string;
  };
  post_install?: string;
}
