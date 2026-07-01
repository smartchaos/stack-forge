import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runHealthcheck } from "../../src/cli/healthcheck.js";
import { mkdir, rm, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("../../src/discovery/scanner.js", () => ({
  scanForPlugins: vi.fn().mockResolvedValue({
    skill_dirs: [],
    plugins: ["superpowers"],
    mcp_servers: [],
    cli_commands: [],
  }),
}));

vi.mock("../../src/discovery/healthcheck.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/discovery/healthcheck.js")>("../../src/discovery/healthcheck.js");
  return {
    ...actual,
    loadHealthRules: vi.fn().mockResolvedValue({
      superpowers: {
        checks: [{ type: "plugin_installed", name: "superpowers" }],
        critical: false,
      },
    }),
  };
});

describe("runHealthcheck", () => {
  const testDir = join(tmpdir(), "cforge-healthcheck-cli-test");

  beforeEach(async () => {
    await mkdir(join(testDir, ".cforge"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("updates last_verified when a provider transitions from missing to healthy", async () => {
    const oldTimestamp = "2026-01-01T00:00:00.000Z";
    await writeFile(
      join(testDir, ".cforge", "health.json"),
      JSON.stringify({
        last_check: oldTimestamp,
        stale_threshold_hours: 168,
        providers: {
          superpowers: { status: "healthy", last_verified: oldTimestamp },
        },
      })
    );

    const before = Date.now();
    await runHealthcheck(testDir);

    const healthContent = await readFile(join(testDir, ".cforge", "health.json"), "utf-8");
    const health = JSON.parse(healthContent);
    expect(health.providers.superpowers.status).toBe("healthy");
    const newTimestamp = health.providers.superpowers.last_verified;
    expect(newTimestamp).not.toBe(oldTimestamp);
    expect(new Date(newTimestamp).getTime()).toBeGreaterThanOrEqual(before);
  });
});
