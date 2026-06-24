import { describe, it, expect } from "vitest";
import { installProviderSilent, installProvidersSilent } from "../../src/discovery/auto-installer.js";
import type { ManifestEntry } from "../../src/types/config.js";

function makeEntry(overrides: Partial<ManifestEntry> & { name: string }): ManifestEntry {
  return {
    description: "test",
    capabilities: ["brainstorm"],
    priority: "required",
    install: { type: "npm", command: "echo ok" },
    ...overrides,
  };
}

describe("installProviderSilent", () => {
  it("returns installed for successful command", async () => {
    const entry = makeEntry({ name: "test-provider" });
    const result = await installProviderSilent(entry);
    expect(result.provider).toBe("test-provider");
    expect(result.status).toBe("installed");
  });

  it("returns pending for claude_command type", async () => {
    const entry = makeEntry({
      name: "claude-plugin",
      install: { type: "claude_command", command: "/plugin install test" },
    });
    const result = await installProviderSilent(entry);
    expect(result.status).toBe("pending");
    expect(result.instruction).toBe("/plugin install test");
  });

  it("returns failed for failing command", async () => {
    const entry = makeEntry({
      name: "failing-provider",
      install: { type: "npm", command: "exit 1" },
    });
    const result = await installProviderSilent(entry);
    expect(result.status).toBe("failed");
  });

  it("runs post_install hook after install", async () => {
    const entry = makeEntry({
      name: "with-post",
      install: { type: "npm", command: "echo ok" },
      post_install: "echo post",
    });
    const result = await installProviderSilent(entry);
    expect(result.status).toBe("installed");
  });
});

describe("installProvidersSilent", () => {
  it("skips optional providers", async () => {
    const entries = [
      makeEntry({ name: "optional-one", priority: "optional" }),
      makeEntry({ name: "required-one", priority: "required" }),
    ];
    const results = await installProvidersSilent(entries);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("skipped");
    expect(results[0].provider).toBe("optional-one");
    expect(results[1].status).toBe("installed");
    expect(results[1].provider).toBe("required-one");
  });

  it("installs recommended providers", async () => {
    const entries = [
      makeEntry({ name: "rec-one", priority: "recommended" }),
    ];
    const results = await installProvidersSilent(entries);
    expect(results[0].status).toBe("installed");
  });

  it("handles mixed results", async () => {
    const entries = [
      makeEntry({ name: "ok-provider", install: { type: "npm", command: "echo ok" } }),
      makeEntry({ name: "fail-provider", install: { type: "npm", command: "exit 1" } }),
      makeEntry({ name: "skip-provider", priority: "optional" }),
      makeEntry({ name: "pending-provider", install: { type: "claude_command", command: "/plugin install x" } }),
    ];
    const results = await installProvidersSilent(entries);
    expect(results).toHaveLength(4);
    expect(results[0].status).toBe("installed");
    expect(results[1].status).toBe("failed");
    expect(results[2].status).toBe("skipped");
    expect(results[3].status).toBe("pending");
  });
});
