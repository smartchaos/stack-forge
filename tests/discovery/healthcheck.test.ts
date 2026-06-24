import { describe, it, expect } from "vitest";
import { runHealthCheck } from "../../src/discovery/healthcheck.js";
import type { ScanResult } from "../../src/discovery/scanner.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("runHealthCheck", () => {
  const testDir = join(tmpdir(), "cforge-healthcheck-test");

  it("checks skill_file_exists correctly", async () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "SKILL.md"), "# Test Skill");

    const scan: ScanResult = {
      skill_dirs: ["test-skill"],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const rules = {
      test: {
        checks: [{ type: "skill_file_exists", path: join(testDir, "SKILL.md") }],
        critical: false,
      },
    };

    const results = await runHealthCheck(scan, rules);
    expect(results[0].status).toBe("healthy");

    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns missing for non-existent skill file", async () => {
    const scan: ScanResult = {
      skill_dirs: [],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const rules = {
      test: {
        checks: [{ type: "skill_file_exists", path: "/nonexistent/path/SKILL.md" }],
        critical: false,
      },
    };

    const results = await runHealthCheck(scan, rules);
    expect(results[0].status).toBe("missing");
  });
});
