import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { scanForPlugins } from "../../src/discovery/scanner.js";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("scanner", () => {
  const testDir = join(tmpdir(), "cforge-test-scanner");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("detects skill directories", async () => {
    const skillDir = join(testDir, "skills", "superpowers");
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, "SKILL.md"), "test");

    const results = await scanForPlugins({ skillsDir: join(testDir, "skills") });
    expect(results.skill_dirs).toContain("superpowers");
  });

  it("detects claude plugin references", async () => {
    await writeFile(join(testDir, "installed_plugins.json"), JSON.stringify({
      version: 2,
      plugins: {
        "superpowers@claude-plugins-official": [
          {
            scope: "user",
            installPath: "/Users/test/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.3",
            version: "6.0.3"
          }
        ]
      }
    }));

    const results = await scanForPlugins({ installedPluginsJson: join(testDir, "installed_plugins.json") });
    expect(results.plugins).toContain("superpowers");
  });

  it("returns empty when nothing found", async () => {
    const results = await scanForPlugins({
      skillsDir: join(testDir, "nonexistent"),
      installedPluginsJson: join(testDir, "nonexistent", "installed_plugins.json"),
    });
    expect(results.skill_dirs).toEqual([]);
    expect(results.plugins).toEqual([]);
  });
});

describe("scanForPlugins error handling", () => {
  const testDir = join(tmpdir(), "cforge-test-scanner");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("handles malformed installed_plugins.json gracefully", async () => {
    await writeFile(join(testDir, "malformed.json"), "{ invalid json");

    const result = await scanForPlugins({
      installedPluginsJson: join(testDir, "malformed.json"),
    });

    expect(result.plugins).toEqual([]);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toContain("malformed.json");
  });

  it("handles malformed mcp.json gracefully", async () => {
    await writeFile(join(testDir, "malformed.json"), "{ invalid json");

    const result = await scanForPlugins({
      mcpJson: join(testDir, "malformed.json"),
    });

    expect(result.mcp_servers).toEqual([]);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toContain("malformed.json");
  });
});
