import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runUpdate } from "../../src/cli/update.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge update", () => {
  const testDir = join(tmpdir(), "cforge-test-update");
  let emptySkillsDir: string;
  let emptyPluginsJson: string;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, ".cforge"), { recursive: true });
    emptySkillsDir = join(testDir, ".mock-skills");
    await mkdir(emptySkillsDir, { recursive: true });
    emptyPluginsJson = join(testDir, "empty_plugins.json");
    await writeFile(emptyPluginsJson, JSON.stringify({ version: 2, plugins: {} }));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("detects no changes when providers unchanged", async () => {
    await writeFile(join(testDir, ".cforge/providers.yaml"), "providers: {}\n");
    const result = await runUpdate(testDir, {
      skillsDir: emptySkillsDir,
      installedPluginsJson: emptyPluginsJson,
    });
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});
