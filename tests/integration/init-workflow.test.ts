import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const projectRoot = join(__dirname, "..", "..");

describe("init workflow integration", () => {
  const testDir = join(tmpdir(), "cforge-integration-test");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates complete project structure", async () => {
    const { stdout } = await execFileAsync("node", [
      join(projectRoot, "dist/index.js"),
      "init",
      "--workflow=feature",
    ], { cwd: testDir });

    expect(stdout).toContain("Stack Forge initialized");

    const files = [
      ".cforge/config.yaml",
      ".cforge/providers.yaml",
      ".cforge/state.json",
      ".cforge/health.json",
      ".claude/skills/workflow-orchestrator/SKILL.md",
      ".claude/commands/cforge.md",
    ];

    for (const file of files) {
      const s = await stat(join(testDir, file));
      expect(s.isFile()).toBe(true);
    }
  });

  it("state.json has valid structure", async () => {
    await execFileAsync("node", [join(projectRoot, "dist/index.js"), "init"], { cwd: testDir });

    const stateContent = await readFile(join(testDir, ".cforge/state.json"), "utf-8");
    const state = JSON.parse(stateContent);

    expect(state).toHaveProperty("version");
    expect(state).toHaveProperty("workflow");
    expect(state).toHaveProperty("stages");
    expect(state.stages).toHaveProperty("brainstorm");
    expect(state.stages).toHaveProperty("release");
  });
});