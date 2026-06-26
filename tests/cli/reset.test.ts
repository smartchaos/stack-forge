import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { tmpdir } from "os";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "fs/promises";
import { pathExists } from "fs-extra";

vi.mock("../../src/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("inquirer", () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ confirm: true }),
  },
}));

const { runReset } = await import("../../src/cli/reset.js");

describe("runReset", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "cforge-reset-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should delete .cforge directory", async () => {
    const cforgeDir = join(testDir, ".cforge");
    await mkdir(cforgeDir, { recursive: true });
    await writeFile(join(cforgeDir, "config.yaml"), "test: true");

    await runReset(testDir);

    const exists = await pathExists(cforgeDir);
    expect(exists).toBe(false);
  });

  it("should remove Stack Forge section from CLAUDE.md", async () => {
    const claudeMdPath = join(testDir, "CLAUDE.md");
    const content = `# Claude Code

## Stack Forge

- Start: \`cforge feature "<description>"\`
- Status: \`cforge status\`

## Other Section

Some content here.
`;
    await writeFile(claudeMdPath, content);

    await runReset(testDir);

    const result = await readFile(claudeMdPath, "utf-8");
    expect(result).not.toContain("## Stack Forge");
    expect(result).toContain("## Other Section");
  });

  it("should be a no-op when .cforge does not exist", async () => {
    await runReset(testDir);
    const exists = await pathExists(join(testDir, ".cforge"));
    expect(exists).toBe(false);
  });

  it("should leave CLAUDE.md untouched if no Stack Forge section", async () => {
    const claudeMdPath = join(testDir, "CLAUDE.md");
    const content = `# Claude Code

## Other Section

Some content here.
`;
    await writeFile(claudeMdPath, content);

    await runReset(testDir);

    const result = await readFile(claudeMdPath, "utf-8");
    expect(result).toBe(content);
  });
});
