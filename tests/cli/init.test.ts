import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, rm, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("../../src/discovery/project-detector.js", () => ({
  detectProject: vi.fn().mockResolvedValue({ name: "test-project", description: "test desc" }),
}));

vi.mock("../../src/discovery/auto-installer.js", () => ({
  installProvidersSilent: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../src/discovery/scanner.js", () => ({
  scanForPlugins: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../src/discovery/matcher.js", () => ({
  matchProviders: vi.fn().mockReturnValue({}),
}));

vi.mock("../../src/discovery/registry.js", () => ({
  loadProviders: vi.fn().mockResolvedValue({
    superpowers: {
      name: "superpowers",
      capabilities: ["brainstorm"],
      detect: [],
      routing: { preferred_for: ["brainstorm"], priority: 100 },
    },
    "brainstorm-lite": {
      name: "brainstorm-lite",
      capabilities: ["brainstorm"],
      detect: [],
      routing: { priority: 10 },
    },
  }),
  loadCapabilities: vi.fn().mockResolvedValue({
    brainstorm: {
      name: "Brainstorm",
      description: "Idea refinement",
      input: "idea",
      output: "proposal.md",
      default_provider: "superpowers",
    },
  }),
  loadManifest: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../src/generator/orchestrator.js", () => ({
  generateOrchestrator: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/generator/stages.js", () => ({
  generateStages: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/generator/commands.js", () => ({
  generateCommands: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/generator/claude-md.js", () => ({
  generateClaudeMd: vi.fn().mockResolvedValue(undefined),
  generateProvidersMd: vi.fn().mockResolvedValue(undefined),
}));

const { matchProviders } = await import("../../src/discovery/matcher.js");
const { runInit } = await import("../../src/cli/init.js");

describe("cforge init", () => {
  const testDir = join(tmpdir(), "cforge-test-init");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    vi.mocked(matchProviders).mockReset();
    vi.mocked(matchProviders).mockReturnValue({});
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates all config files and directories", async () => {
    await runInit(testDir, { workflow: "feature" });

    const files = [
      ".cforge/config.yaml",
      ".cforge/providers.yaml",
      ".cforge/state.json",
    ];

    for (const file of files) {
      const content = await readFile(join(testDir, file), "utf-8");
      expect(content).toBeDefined();
    }

    const dirs = [".cforge/artifacts", ".cforge/errors"];
    for (const dir of dirs) {
      const s = await stat(join(testDir, dir));
      expect(s.isDirectory()).toBe(true);
    }
  });

  it("uses default workflow when not specified", async () => {
    await runInit(testDir);

    const configContent = await readFile(join(testDir, ".cforge/config.yaml"), "utf-8");
    expect(configContent).toContain("workflow: feature");
  });

  it("uses custom workflow when specified", async () => {
    await runInit(testDir, { workflow: "hotfix" });

    const configContent = await readFile(join(testDir, ".cforge/config.yaml"), "utf-8");
    expect(configContent).toContain("workflow: hotfix");
  });

  it("creates state.json with auto-detected project name", async () => {
    await runInit(testDir);

    const stateContent = await readFile(join(testDir, ".cforge/state.json"), "utf-8");
    const state = JSON.parse(stateContent);
    expect(state.workflow).toBe("feature");
    expect(state.context.type).toBe("feature");
    expect(state.context.project_name).toBe("test-project");
  });

  it("writes providers.yaml with empty providers", async () => {
    vi.mocked(matchProviders).mockReturnValue({});
    await runInit(testDir);

    const providersContent = await readFile(join(testDir, ".cforge/providers.yaml"), "utf-8");
    expect(providersContent).toContain("providers:");
  });

  it("prefers routed provider when multiple detected providers share a capability", async () => {
    vi.mocked(matchProviders).mockReturnValue({
      superpowers: {
        name: "superpowers",
        capabilities: ["brainstorm"],
        source: "detected:superpowers",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 1,
        routing: { preferred_for: ["brainstorm"], priority: 100 },
      },
      "brainstorm-lite": {
        name: "brainstorm-lite",
        capabilities: ["brainstorm"],
        source: "detected:brainstorm-lite",
        detected_at: "2026-06-30T00:00:00.000Z",
        matched_rule_count: 2,
        routing: { priority: 10 },
      },
    });

    await runInit(testDir);

    const configContent = await readFile(join(testDir, ".cforge/config.yaml"), "utf-8");
    expect(configContent).toContain("brainstorm: superpowers");
  });
});
