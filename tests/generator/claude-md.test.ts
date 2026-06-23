import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateClaudeMd } from "../../src/generator/claude-md.js";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("claude-md generator", () => {
  const testDir = join(tmpdir(), "cforge-test-claudemd");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates CLAUDE.md with Stack Forge section", async () => {
    await generateClaudeMd(testDir, { workflowName: "feature" });
    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    expect(content).toContain("## Stack Forge");
    expect(content).toContain("/workflow");
  });

  it("does not duplicate Stack Forge section", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "## Stack Forge\nExisting");
    await generateClaudeMd(testDir, { workflowName: "feature" });
    const content = await readFile(join(testDir, "CLAUDE.md"), "utf-8");
    const matches = content.match(/## Stack Forge/g);
    expect(matches?.length).toBe(1);
  });
});
