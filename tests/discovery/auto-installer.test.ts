import { describe, it, expect } from "vitest";
import { installProviderSilent } from "../../src/discovery/auto-installer.js";
import type { ManifestEntry } from "../../src/types/config.js";

describe("installProviderSilent", () => {
  it("returns success for already-installed check", async () => {
    const entry: ManifestEntry = {
      name: "test-provider",
      description: "test",
      capabilities: ["brainstorm"],
      priority: "required",
      install: {
        type: "cli",
        command: "echo ok"
      }
    };
    const result = await installProviderSilent(entry);
    expect(result.provider).toBe("test-provider");
    expect(result.status).toBe("installed");
  });

  it("returns pending for claude_command type", async () => {
    const entry: ManifestEntry = {
      name: "claude-plugin",
      description: "test",
      capabilities: ["memory"],
      priority: "optional",
      install: {
        type: "claude_command",
        command: "/plugin install test"
      }
    };
    const result = await installProviderSilent(entry);
    expect(result.status).toBe("pending");
    expect(result.instruction).toBe("/plugin install test");
  });
});