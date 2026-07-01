import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateClaudeMd, generateProvidersMd } from "../../src/generator/claude-md.js";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("claude-md generator", () => {
  const testDir = join(tmpdir(), "cforge-test-claudemd");

  const baseOptions = {
    workflowName: "feature",
    detected: {},
    manifest: [],
    capabilities: {
      brainstorm: { name: "Brainstorm", description: "Brainstorm", input: "", output: "", default_provider: "superpowers" },
      specification: { name: "Specification", description: "Spec", input: "", output: "", default_provider: "openspec" },
      planning: { name: "Planning", description: "Plan", input: "", output: "", default_provider: "superpowers" },
      implementation: { name: "Implementation", description: "Impl", input: "", output: "", default_provider: "builtin" },
      review: { name: "Review", description: "Review", input: "", output: "", default_provider: "gstack" },
      release: { name: "Release", description: "Release", input: "", output: "", default_provider: "gstack" },
      memory: { name: "Memory", description: "Memory", input: "", output: "", default_provider: "claude-mem" },
    },
  };

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, ".cforge"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates CLAUDE.md with Stack Forge section", async () => {
    await generateClaudeMd(testDir, baseOptions);
    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Stack Forge");
    expect(content).toContain("cforge feature");
    expect(content).toContain("providers.md");
    expect(content).toContain("feature");
    expect(content).toContain("bugfix");
  });

  it("does not duplicate Stack Forge section", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "## Stack Forge\nExisting");
    await generateClaudeMd(testDir, baseOptions);
    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    const matches = content.match(/## Stack Forge/g);
    expect(matches?.length).toBe(1);
  });

  it("preserves trailing whitespace in user's original CLAUDE.md", async () => {
    const original = "# Intro\n\nSome text.   \n\n\n";
    await writeFile(join(testDir, "CLAUDE.md"), original);
    await generateClaudeMd(testDir, baseOptions);
    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(content.startsWith("# Intro\n\nSome text.   \n\n\n")).toBe(true);
    expect(content).toContain("## Stack Forge");
  });

  it("creates providers.md with detected providers", async () => {
    const opts = {
      ...baseOptions,
      detected: {
        superpowers: { name: "superpowers", capabilities: ["brainstorm", "planning"], source: "test", detected_at: "2026-01-01" },
      },
    };
    await generateProvidersMd(testDir, opts);
    const content = await readFile(join(testDir, ".cforge/providers.md"), "utf-8");
    expect(content).toContain("# Providers");
    expect(content).toContain("superpowers");
    expect(content).toContain("Ready");
  });

  it("creates providers.md with missing providers and install commands", async () => {
    const opts = {
      ...baseOptions,
      manifest: [
        { name: "openspec", description: "Spec framework", capabilities: ["specification"], priority: "required" as const, install: { type: "npm" as const, command: "npm install -g openspec" } },
      ],
    };
    await generateProvidersMd(testDir, opts);
    const content = await readFile(join(testDir, ".cforge/providers.md"), "utf-8");
    expect(content).toContain("## Missing");
    expect(content).toContain("npm install -g openspec");
  });

  it("treats builtin implementation as ready instead of missing", async () => {
    await generateProvidersMd(testDir, baseOptions);
    const content = await readFile(join(testDir, ".cforge/providers.md"), "utf-8");
    expect(content).toContain("| Implementation | builtin | Built-in |");
    expect(content).not.toContain("**Implementation** → builtin");
  });
});
