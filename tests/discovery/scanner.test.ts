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
    await writeFile(join(testDir, ".claude.json"), JSON.stringify({
      plugins: ["superpowers@claude-plugins-official"]
    }));

    const results = await scanForPlugins({ claudeJson: join(testDir, ".claude.json") });
    expect(results.plugins).toContain("superpowers");
  });

  it("returns empty when nothing found", async () => {
    const results = await scanForPlugins({ skillsDir: join(testDir, "nonexistent") });
    expect(results.skill_dirs).toEqual([]);
    expect(results.plugins).toEqual([]);
  });
});
