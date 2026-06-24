import { describe, it, expect } from "vitest";
import { matchProviders } from "../../src/discovery/matcher.js";
import type { ScanResult } from "../../src/discovery/scanner.js";
import type { ProviderDefinition } from "../../src/types/provider.js";

describe("matcher", () => {
  const baseScan: ScanResult = {
    skill_dirs: [],
    plugins: [],
    mcp_servers: [],
    cli_commands: [],
  };

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

  it("matches command_exists with match_prefix", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["gstack", "gstack-deploy"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", match_prefix: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeDefined();
  });

  it("does not match command_exists when prefix missing", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["other-tool"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", match_prefix: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeUndefined();
  });

  it("matches command_exists with exact command", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["gstack"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", command: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeDefined();
  });

  it("does not match command_exists when command missing", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["other-tool"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", command: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeUndefined();
  });
});
