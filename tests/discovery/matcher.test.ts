import { describe, it, expect } from "vitest";
import { matchProviders } from "../../src/discovery/matcher.js";
import type { ScanResult } from "../../src/discovery/scanner.js";
import type { ProviderDefinition } from "../../src/types/provider.js";

describe("matcher", () => {
  const providers: Record<string, ProviderDefinition> = {
    superpowers: {
      name: "superpowers",
      capabilities: ["brainstorm", "planning"],
      detect: [{ type: "plugin_installed", name: "superpowers" }],
    },
    gstack: {
      name: "gstack",
      capabilities: ["review", "release"],
      detect: [{ type: "skill_exists", match_name: "gstack" }],
    },
  };

  it("matches plugin_installed detection", () => {
    const scan: ScanResult = {
      skill_dirs: [],
      plugins: ["superpowers"],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(result.superpowers).toBeDefined();
    expect(result.superpowers.capabilities).toContain("brainstorm");
  });

  it("matches skill_exists detection", () => {
    const scan: ScanResult = {
      skill_dirs: ["gstack", "other"],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(result.gstack).toBeDefined();
    expect(result.gstack.capabilities).toContain("review");
  });

  it("returns empty for no matches", () => {
    const scan: ScanResult = {
      skill_dirs: [],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
