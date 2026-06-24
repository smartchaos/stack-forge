# Stack Forge Team Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Stack Forge from a personal productivity tool into a production-ready team tool with proper error handling, testing, logging, and documentation.

**Architecture:** Maintain the existing modular architecture (discovery, generator, state, validation) while adding cross-cutting concerns (logging, validation, error handling). Each improvement is independent and can be implemented incrementally.

**Tech Stack:** TypeScript, Vitest, Zod (for validation), pino (for structured logging)

---

## Phase 1: Fix Critical Logic Bugs

### Task 1: Fix matcher.ts prefix logic bug

**Files:**
- Modify: `src/discovery/matcher.ts:28-33`
- Test: `tests/discovery/matcher.test.ts`

- [ ] **Step 1: Write failing test for command_exists matching**

```typescript
// tests/discovery/matcher.test.ts
import { describe, it, expect } from "vitest";
import { matchProviders } from "../../src/discovery/matcher.js";
import type { ScanResult } from "../../src/discovery/scanner.js";
import type { ProviderDefinition } from "../../src/types/provider.js";

describe("matchProviders", () => {
  const baseScan: ScanResult = {
    skill_dirs: [],
    plugins: [],
    mcp_servers: [],
    cli_commands: [],
  };

  it("matches command_exists with match_prefix", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["gstack", "gstack-deploy"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", match_prefix: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeDefined();
  });

  it("does not match command_exists when prefix missing", () => {
    const scan: ScanResult = {
      ...baseScan,
      cli_commands: ["other-tool"],
    };
    const providers: Record<string, ProviderDefinition> = {
      test: {
        name: "test",
        capabilities: ["test"],
        detect: [{ type: "command_exists", match_prefix: "gstack" }],
      },
    };

    const result = matchProviders(scan, providers);
    expect(result.test).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/discovery/matcher.test.ts`
Expected: FAIL with logic error in command_exists matching

- [ ] **Step 3: Fix the logic bug in matcher.ts**

```typescript
// src/discovery/matcher.ts:28-33
case "command_exists":
  return scan.cli_commands.some((cmd) =>
    rule.match_prefix ? cmd.startsWith(rule.match_prefix) : cmd === rule.command
  );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/discovery/matcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/matcher.ts tests/discovery/matcher.test.ts
git commit -m "fix: correct command_exists prefix matching logic"
```

### Task 2: Fix healthcheck.ts skill_file_exists check

**Files:**
- Modify: `src/discovery/healthcheck.ts:100-104`
- Test: `tests/discovery/healthcheck.test.ts`

- [ ] **Step 1: Write failing test for skill_file_exists check**

```typescript
// tests/discovery/healthcheck.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/discovery/healthcheck.test.ts`
Expected: FAIL because skill_file_exists always returns false

- [ ] **Step 3: Fix the skill_file_exists implementation**

```typescript
// src/discovery/healthcheck.ts:100-104
case "skill_file_exists":
  passed = c.path ? await checkSkillFileExists(c.path) : false;
  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/discovery/healthcheck.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/healthcheck.ts tests/discovery/healthcheck.test.ts
git commit -m "fix: implement skill_file_exists health check properly"
```

---

## Phase 2: Error Handling & Resilience

### Task 3: Add structured error handling to scanner.ts

**Files:**
- Modify: `src/discovery/scanner.ts`
- Test: `tests/discovery/scanner.test.ts`

- [ ] **Step 1: Write failing test for error handling**

```typescript
// tests/discovery/scanner.test.ts
import { describe, it, expect } from "vitest";
import { scanForPlugins } from "../../src/discovery/scanner.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("scanForPlugins error handling", () => {
  const testDir = join(tmpdir(), "cforge-scanner-test");

  it("handles malformed claude.json gracefully", async () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "malformed.json"), "{ invalid json");

    const result = await scanForPlugins({
      claudeJson: join(testDir, "malformed.json"),
    });

    expect(result.plugins).toEqual([]);
    rmSync(testDir, { recursive: true, force: true });
  });

  it("handles malformed mcp.json gracefully", async () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "malformed.json"), "{ invalid json");

    const result = await scanForPlugins({
      mcpJson: join(testDir, "malformed.json"),
    });

    expect(result.mcp_servers).toEqual([]);
    rmSync(testDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/discovery/scanner.test.ts`
Expected: FAIL (currently swallows errors silently)

- [ ] **Step 3: Add error logging to scanner.ts**

```typescript
// src/discovery/scanner.ts
import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

export interface ScanResult {
  skill_dirs: string[];
  plugins: string[];
  mcp_servers: string[];
  cli_commands: string[];
}

export interface ScanOptions {
  skillsDir?: string;
  claudeJson?: string;
  mcpJson?: string;
}

const DEFAULT_SKILLS_DIR = join(homedir(), ".claude", "skills");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function scanSkillDirs(skillsDir: string): Promise<string[]> {
  if (!(await exists(skillsDir))) return [];
  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function scanPlugins(claudeJson: string): Promise<{ plugins: string[]; error?: string }> {
  if (!(await exists(claudeJson))) return { plugins: [] };
  try {
    const content = await readFile(claudeJson, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.plugins)) {
      return {
        plugins: data.plugins.map((p: string) => p.split("@")[0].split("/").pop() || p),
      };
    }
    return { plugins: [] };
  } catch (e) {
    return {
      plugins: [],
      error: `Failed to parse ${claudeJson}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function scanMcpServers(mcpJson: string): Promise<{ mcp_servers: string[]; error?: string }> {
  if (!(await exists(mcpJson))) return { mcp_servers: [] };
  try {
    const content = await readFile(mcpJson, "utf-8");
    const data = JSON.parse(content);
    if (data.mcpServers) {
      return { mcp_servers: Object.keys(data.mcpServers) };
    }
    return { mcp_servers: [] };
  } catch (e) {
    return {
      mcp_servers: [],
      error: `Failed to parse ${mcpJson}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function scanForPlugins(
  options: ScanOptions = {}
): Promise<ScanResult & { errors?: string[] }> {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const claudeJson = options.claudeJson || join(homedir(), ".claude.json");
  const mcpJson = options.mcpJson || join(process.cwd(), ".mcp.json");

  const [skill_dirs, pluginsResult, mcpResult] = await Promise.all([
    scanSkillDirs(skillsDir),
    scanPlugins(claudeJson),
    scanMcpServers(mcpJson),
  ]);

  const errors: string[] = [];
  if (pluginsResult.error) errors.push(pluginsResult.error);
  if (mcpResult.error) errors.push(mcpResult.error);

  return {
    skill_dirs,
    plugins: pluginsResult.plugins,
    mcp_servers: mcpResult.mcp_servers,
    cli_commands: [],
    errors: errors.length > 0 ? errors : undefined,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/discovery/scanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/scanner.ts tests/discovery/scanner.test.ts
git commit -m "feat: add structured error handling to plugin scanner"
```

### Task 4: Add error recovery to state manager

**Files:**
- Modify: `src/state/manager.ts`
- Test: `tests/state/manager.test.ts`

- [ ] **Step 1: Write failing test for corrupted state recovery**

```typescript
// tests/state/manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "../../src/state/manager.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { existsSync } from "fs";

describe("StateManager error recovery", () => {
  const testDir = join(tmpdir(), "cforge-test-state-recovery");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns null for corrupted state file", async () => {
    await writeFile(join(testDir, "state.json"), "{ corrupted", "utf-8");
    const state = await manager.read();
    expect(state).toBeNull();
  });

  it("creates backup before write", async () => {
    await manager.create("feature", "test", "desc");
    const state = await manager.read();
    if (state) await manager.write(state);

    expect(existsSync(join(testDir, "state.json.bak"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/state/manager.test.ts`
Expected: FAIL (no backup logic exists)

- [ ] **Step 3: Add backup and recovery to state manager**

```typescript
// src/state/manager.ts
import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { WorkflowState, StageName, StageStatus } from "../types/workflow.js";

const STAGE_ORDER: StageName[] = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

function defaultStages(): WorkflowState["stages"] {
  const stages: Record<string, { status: StageStatus; provider: string; artifact: null }> = {};
  for (const name of STAGE_ORDER) {
    stages[name] = { status: "pending", provider: "", artifact: null };
  }
  return stages as unknown as WorkflowState["stages"];
}

export class StateManager {
  private statePath: string;
  private backupPath: string;

  constructor(private dir: string) {
    this.statePath = join(dir, "state.json");
    this.backupPath = join(dir, "state.json.bak");
  }

  async create(workflow: string, projectName: string, description: string): Promise<WorkflowState> {
    await mkdir(this.dir, { recursive: true });

    const state: WorkflowState = {
      version: "1.0",
      workflow,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_stage: "brainstorm",
      status: "in_progress",
      context: { type: workflow, project_name: projectName, description },
      stages: defaultStages(),
    };

    await this.write(state);
    return state;
  }

  async read(): Promise<WorkflowState | null> {
    if (!existsSync(this.statePath)) return null;

    try {
      const content = await readFile(this.statePath, "utf-8");
      return JSON.parse(content) as WorkflowState;
    } catch {
      if (existsSync(this.backupPath)) {
        try {
          const content = await readFile(this.backupPath, "utf-8");
          const state = JSON.parse(content) as WorkflowState;
          await this.write(state);
          return state;
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async write(state: WorkflowState): Promise<void> {
    await mkdir(this.dir, { recursive: true });

    if (existsSync(this.statePath)) {
      await copyFile(this.statePath, this.backupPath);
    }

    state.updated_at = new Date().toISOString();
    await writeFile(this.statePath, JSON.stringify(state, null, 2), "utf-8");
  }

  async completeStage(name: StageName, artifact?: string): Promise<WorkflowState> {
    const state = await this.read();
    if (!state) throw new Error("No workflow state found");

    state.stages[name].status = "completed";
    state.stages[name].completed_at = new Date().toISOString();
    if (artifact) state.stages[name].artifact = artifact;

    const currentIndex = STAGE_ORDER.indexOf(name);
    const nextIndex = currentIndex + 1;

    if (nextIndex < STAGE_ORDER.length) {
      state.current_stage = STAGE_ORDER[nextIndex];
    } else {
      state.current_stage = null;
      state.status = "done";
    }

    await this.write(state);
    return state;
  }

  async failStage(name: StageName, error: string): Promise<WorkflowState> {
    const state = await this.read();
    if (!state) throw new Error("No workflow state found");

    state.stages[name].status = "failed";
    state.status = "error";

    await this.write(state);
    return state;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/state/manager.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/manager.ts tests/state/manager.test.ts
git commit -m "feat: add state backup and recovery for corrupted files"
```

---

## Phase 3: Async Performance Improvements

### Task 5: Replace execSync with async alternatives

**Files:**
- Modify: `src/discovery/project-detector.ts`
- Modify: `src/discovery/auto-installer.ts`
- Test: `tests/discovery/project-detector.test.ts`
- Test: `tests/discovery/auto-installer.test.ts`

- [ ] **Step 1: Write failing test for async project detection**

```typescript
// tests/discovery/project-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectProject } from "../../src/discovery/project-detector.js";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("detectProject async", () => {
  const testDir = join(tmpdir(), "cforge-detector-test");

  it("detects project from package.json", async () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      join(testDir, "package.json"),
      JSON.stringify({ name: "my-app", description: "Test app" })
    );

    const info = await detectProject(testDir);
    expect(info.name).toBe("my-app");
    expect(info.description).toBe("Test app");

    rmSync(testDir, { recursive: true, force: true });
  });

  it("falls back to directory name", async () => {
    mkdirSync(testDir, { recursive: true });

    const info = await detectProject(testDir);
    expect(info.name).toContain("cforge-detector-test");

    rmSync(testDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/discovery/project-detector.test.ts`
Expected: FAIL (execSync blocks)

- [ ] **Step 3: Convert to async exec**

```typescript
// src/discovery/project-detector.ts
import { readFile } from "fs/promises";
import { join, basename } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProjectInfo {
  name: string;
  description: string;
}

async function getGitRemoteName(projectDir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], {
      cwd: projectDir,
    });
    const url = stdout.trim();
    const match = url.match(/\/([^/]+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function detectProject(projectDir: string): Promise<ProjectInfo> {
  try {
    const content = await readFile(join(projectDir, "package.json"), "utf-8");
    const pkg = JSON.parse(content);
    return {
      name: pkg.name || basename(projectDir),
      description: pkg.description || "",
    };
  } catch {
    // No package.json
  }

  const gitName = await getGitRemoteName(projectDir);
  if (gitName) {
    return { name: gitName, description: "" };
  }

  return { name: basename(projectDir), description: "" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/discovery/project-detector.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for async installer**

```typescript
// tests/discovery/auto-installer.test.ts
import { describe, it, expect } from "vitest";
import { installProviderSilent } from "../../src/discovery/auto-installer.js";
import type { ManifestEntry } from "../../src/types/config.js";

describe("installProviderSilent async", () => {
  it("handles installation failure gracefully", async () => {
    const entry: ManifestEntry = {
      name: "test-provider",
      description: "Test",
      capabilities: ["test"],
      priority: "required",
      install: { type: "npm", command: "npm install --save-dev nonexistent-package-xyz" },
    };

    const result = await installProviderSilent(entry);
    expect(result.status).toBe("failed");
    expect(result.provider).toBe("test-provider");
  });

  it("skips claude_command type with instruction", async () => {
    const entry: ManifestEntry = {
      name: "test-provider",
      description: "Test",
      capabilities: ["test"],
      priority: "required",
      install: { type: "claude_command", command: "/plugin install test" },
    };

    const result = await installProviderSilent(entry);
    expect(result.status).toBe("pending");
    expect(result.instruction).toBe("/plugin install test");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/discovery/auto-installer.test.ts`
Expected: FAIL (execSync blocks)

- [ ] **Step 7: Convert auto-installer to async**

```typescript
// src/discovery/auto-installer.ts
import { execFile } from "child_process";
import { promisify } from "util";
import type { ManifestEntry } from "../types/config.js";

const execFileAsync = promisify(execFile);

export interface InstallResult {
  provider: string;
  status: "installed" | "skipped" | "pending" | "failed";
  instruction?: string;
}

function detectOs(): "macos" | "linux" | "windows" {
  const platform = process.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  return "linux";
}

export async function installProviderSilent(entry: ManifestEntry): Promise<InstallResult> {
  if (entry.install.type === "claude_command") {
    return { provider: entry.name, status: "pending", instruction: entry.install.command };
  }

  if (entry.install.type === "git_clone" && detectOs() === "windows") {
    return {
      provider: entry.name,
      status: "pending",
      instruction: `Windows not supported. Install manually: ${entry.install.command}`,
    };
  }

  try {
    const parts = entry.install.command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);
    await execFileAsync(cmd, args);

    if (entry.post_install) {
      const postParts = entry.post_install.split(" ");
      const postCmd = postParts[0];
      const postArgs = postParts.slice(1);
      await execFileAsync(postCmd, postArgs);
    }

    return { provider: entry.name, status: "installed" };
  } catch {
    return { provider: entry.name, status: "failed" };
  }
}

export async function installProvidersSilent(
  entries: ManifestEntry[]
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];
  for (const entry of entries) {
    if (entry.priority === "optional") {
      results.push({ provider: entry.name, status: "skipped" });
      continue;
    }
    results.push(await installProviderSilent(entry));
  }
  return results;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/discovery/auto-installer.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/discovery/project-detector.ts src/discovery/auto-installer.ts tests/discovery/project-detector.test.ts tests/discovery/auto-installer.test.ts
git commit -m "perf: replace execSync with async execFile for non-blocking I/O"
```

---

## Phase 4: Structured Logging

### Task 6: Add pino logger

**Files:**
- Create: `src/logger.ts`
- Modify: `src/index.ts`
- Modify: `src/cli/init.ts`
- Test: `tests/logger.test.ts`

- [ ] **Step 1: Install pino**

Run: `npm install pino && npm install -D @types/pino`
Expected: pino added to dependencies

- [ ] **Step 2: Write failing test for logger**

```typescript
// tests/logger.test.ts
import { describe, it, expect, vi } from "vitest";
import { createLogger, LogLevel } from "../src/logger.js";

describe("createLogger", () => {
  it("creates logger with default level", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("respects log level from environment", () => {
    process.env.CFORGE_LOG_LEVEL = "debug";
    const logger = createLogger();
    expect(logger).toBeDefined();
    delete process.env.CFORGE_LOG_LEVEL;
  });

  it("logs structured messages", () => {
    const logger = createLogger({ level: LogLevel.SILENT });
    const spy = vi.spyOn(logger, "info");
    logger.info({ msg: "test", key: "value" });
    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/logger.test.ts`
Expected: FAIL (logger.ts doesn't exist)

- [ ] **Step 4: Create logger module**

```typescript
// src/logger.ts
import pino from "pino";

export enum LogLevel {
  FATAL = "fatal",
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
  TRACE = "trace",
  SILENT = "silent",
}

export interface LoggerOptions {
  level?: LogLevel;
  name?: string;
}

export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const level = options.level || process.env.CFORGE_LOG_LEVEL || LogLevel.INFO;

  return pino({
    level,
    name: options.name || "cforge",
    transport:
      process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });
}

export const logger = createLogger();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/logger.test.ts`
Expected: PASS

- [ ] **Step 6: Add logging to CLI commands**

```typescript
// src/index.ts
import { logger } from "./logger.js";

// Add to each action:
program
  .action(async (workflow, description) => {
    logger.debug({ workflow, description }, "Starting workflow");
    await runWorkflow(process.cwd(), { workflow, description });
  });
```

- [ ] **Step 7: Add logging to init.ts**

```typescript
// src/cli/init.ts (add at top)
import { logger } from "../logger.js";

// Add throughout:
logger.info("Initializing Stack Forge...");
logger.info({ project: projectInfo.name }, "Detected project");
logger.info({ providers: Object.keys(detected) }, "Detected providers");
logger.info("Stack Forge initialized.");
```

- [ ] **Step 8: Commit**

```bash
git add src/logger.ts src/index.ts src/cli/init.ts tests/logger.test.ts package.json package-lock.json
git commit -m "feat: add structured logging with pino"
```

---

## Phase 5: Configuration Validation

### Task 7: Add Zod schema validation

**Files:**
- Create: `src/schemas/config.ts`
- Modify: `src/state/manager.ts`
- Test: `tests/schemas/config.test.ts`

- [ ] **Step 1: Install Zod**

Run: `npm install zod`
Expected: zod added to dependencies

- [ ] **Step 2: Write failing test for config schema**

```typescript
// tests/schemas/config.test.ts
import { describe, it, expect } from "vitest";
import { WorkflowStateSchema, ForgeConfigSchema } from "../../src/schemas/config.js";

describe("WorkflowStateSchema", () => {
  it("validates correct workflow state", () => {
    const state = {
      version: "1.0",
      workflow: "feature",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      current_stage: "brainstorm",
      status: "in_progress",
      context: { type: "feature", project_name: "test", description: "test" },
      stages: {
        brainstorm: { status: "pending", provider: "", artifact: null },
        specification: { status: "pending", provider: "", artifact: null },
        planning: { status: "pending", provider: "", artifact: null },
        implementation: { status: "pending", provider: "", artifact: null },
        review: { status: "pending", provider: "", artifact: null },
        release: { status: "pending", provider: "", artifact: null },
      },
    };

    const result = WorkflowStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const state = {
      version: "1.0",
      workflow: "feature",
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
      current_stage: "brainstorm",
      status: "invalid_status",
      context: { type: "feature", project_name: "test", description: "test" },
      stages: {},
    };

    const result = WorkflowStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

describe("ForgeConfigSchema", () => {
  it("validates correct config", () => {
    const config = {
      workflow: "feature",
      providers: { brainstorm: "superpowers" },
      overrides: {},
      stages: { auto_advance: true, pause_on_review: true },
      artifacts: { output_dir: ".cforge/artifacts" },
    };

    const result = ForgeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/schemas/config.test.ts`
Expected: FAIL (schemas don't exist)

- [ ] **Step 4: Create Zod schemas**

```typescript
// src/schemas/config.ts
import { z } from "zod";

export const StageNameSchema = z.enum([
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
]);

export const StageStatusSchema = z.enum(["pending", "in_progress", "completed", "failed", "paused"]);
export const WorkflowStatusSchema = z.enum(["in_progress", "paused", "done", "error"]);

export const StageStateSchema = z.object({
  status: StageStatusSchema,
  started_at: z.string().optional(),
  completed_at: z.string().optional(),
  provider: z.string(),
  artifact: z.string().nullable().optional(),
});

export const WorkflowContextSchema = z.object({
  type: z.string(),
  project_name: z.string(),
  description: z.string(),
  branch: z.string().optional(),
});

export const WorkflowStateSchema = z.object({
  version: z.string(),
  workflow: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_stage: StageNameSchema.nullable(),
  status: WorkflowStatusSchema,
  context: WorkflowContextSchema,
  stages: z.record(StageNameSchema, StageStateSchema),
});

export const ForgeConfigSchema = z.object({
  workflow: z.string(),
  providers: z.record(z.string()),
  overrides: z.record(z.union([z.string(), z.literal("builtin"), z.literal("none")])),
  stages: z.object({
    auto_advance: z.boolean(),
    pause_on_review: z.boolean(),
  }),
  artifacts: z.object({
    output_dir: z.string(),
  }),
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/schemas/config.test.ts`
Expected: PASS

- [ ] **Step 6: Add validation to StateManager**

```typescript
// src/state/manager.ts
import { WorkflowStateSchema } from "../schemas/config.js";

async read(): Promise<WorkflowState | null> {
  if (!existsSync(this.statePath)) return null;

  try {
    const content = await readFile(this.statePath, "utf-8");
    const parsed = JSON.parse(content);
    const result = WorkflowStateSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Invalid state file:", result.error.issues);
      return null;
    }
    return result.data;
  } catch {
    // Try backup
    if (existsSync(this.backupPath)) {
      try {
        const content = await readFile(this.backupPath, "utf-8");
        const parsed = JSON.parse(content);
        const result = WorkflowStateSchema.safeParse(parsed);
        if (!result.success) return null;
        await this.write(result.data);
        return result.data;
      } catch {
        return null;
      }
    }
    return null;
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/schemas/config.ts src/state/manager.ts tests/schemas/config.test.ts package.json package-lock.json
git commit -m "feat: add Zod schema validation for config files"
```

---

## Phase 6: Testing Improvements

### Task 8: Add integration tests

**Files:**
- Create: `tests/integration/init-workflow.test.ts`
- Create: `tests/integration/state-transitions.test.ts`

- [ ] **Step 1: Write integration test for init workflow**

```typescript
// tests/integration/init-workflow.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
      "dist/index.js",
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
    await execFileAsync("node", ["dist/index.js", "init"], { cwd: testDir });

    const stateContent = await readFile(join(testDir, ".cforge/state.json"), "utf-8");
    const state = JSON.parse(stateContent);

    expect(state).toHaveProperty("version");
    expect(state).toHaveProperty("workflow");
    expect(state).toHaveProperty("stages");
    expect(state.stages).toHaveProperty("brainstorm");
    expect(state.stages).toHaveProperty("release");
  });
});
```

- [ ] **Step 2: Write integration test for state transitions**

```typescript
// tests/integration/state-transitions.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { StateManager } from "../../src/state/manager.js";

describe("state transitions integration", () => {
  const testDir = join(tmpdir(), "cforge-state-integration");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("completes full workflow lifecycle", async () => {
    await manager.create("feature", "test-project", "add auth");

    const stages = [
      "brainstorm",
      "specification",
      "planning",
      "implementation",
      "review",
      "release",
    ];

    for (const stage of stages) {
      const state = await manager.read();
      expect(state!.current_stage).toBe(stage);

      await manager.completeStage(stage, `${stage}-output.md`);
    }

    const finalState = await manager.read();
    expect(finalState!.current_stage).toBeNull();
    expect(finalState!.status).toBe("done");

    for (const stage of stages) {
      expect(finalState!.stages[stage].status).toBe("completed");
      expect(finalState!.stages[stage].artifact).toBe(`${stage}-output.md`);
    }
  });

  it("handles stage failure and recovery", async () => {
    await manager.create("feature", "test-project", "add auth");

    await manager.completeStage("brainstorm");
    await manager.failStage("specification", "Missing requirements");

    const state = await manager.read();
    expect(state!.status).toBe("error");
    expect(state!.stages.specification.status).toBe("failed");
  });
});
```

- [ ] **Step 3: Run integration tests**

Run: `npm test -- tests/integration/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/integration/
git commit -m "test: add integration tests for init workflow and state transitions"
```

---

## Phase 7: Documentation

### Task 9: Create architecture documentation

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/contributing.md`
- Create: `docs/troubleshooting.md`

- [ ] **Step 1: Create architecture.md**

```markdown
# Stack Forge Architecture

## Overview

Stack Forge is a CLI tool that orchestrates Claude Code workflows by discovering installed plugins and generating orchestration skills.

## Components

### CLI Layer (`src/cli/`)
- `init.ts` - Project initialization
- `run.ts` - Workflow execution
- `status.ts` - Status reporting
- `healthcheck.ts` - Provider health checks
- `update.ts` - Provider re-scanning
- `generate.ts` - Config regeneration
- `validate.ts` - Requirement validation

### Discovery Layer (`src/discovery/`)
- `scanner.ts` - Plugin detection
- `matcher.ts` - Provider matching
- `registry.ts` - YAML config loading
- `healthcheck.ts` - Health check logic
- `auto-installer.ts` - Provider installation
- `project-detector.ts` - Project info detection

### Generator Layer (`src/generator/`)
- `orchestrator.ts` - Main skill generation
- `stages.ts` - Stage skill generation
- `commands.ts` - Command generation
- `claude-md.ts` - CLAUDE.md generation
- `templates.ts` - Template rendering

### State Layer (`src/state/`)
- `manager.ts` - Workflow state management

### Validation Layer (`src/validation/`)
- `validator.ts` - Requirement validation

## Data Flow

```
User runs `cforge init`
    ↓
Scanner detects installed plugins
    ↓
Matcher maps plugins to capabilities
    ↓
Generator creates skill files
    ↓
State manager creates initial state
    ↓
Health checker validates providers
    ↓
Ready for workflow execution
```

## Configuration Files

- `.cforge/config.yaml` - Main configuration
- `.cforge/providers.yaml` - Detected providers
- `.cforge/state.json` - Current workflow state
- `.cforge/health.json` - Provider health records
- `.claude/skills/workflow-orchestrator/` - Generated skills
- `.claude/commands/cforge.md` - Generated command
```

- [ ] **Step 2: Create contributing.md**

```markdown
# Contributing to Stack Forge

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run tests: `npm test`

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Add tests for new features
- Use conventional commits

## Testing

- Unit tests: `npm test`
- Watch mode: `npm run test:watch`
- Integration tests: `npm test -- tests/integration/`

## Pull Request Process

1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. Run full test suite
5. Update documentation if needed
6. Submit PR with clear description
```

- [ ] **Step 3: Create troubleshooting.md**

```markdown
# Troubleshooting

## Common Issues

### "No workflow initialized"
Run `cforge init` first to set up the project.

### "Missing critical providers"
Run `cforge init` to auto-install missing providers, or install manually.

### State file corrupted
Stack Forge creates backups automatically. If state is corrupted:
1. Check for `state.json.bak` in `.cforge/`
2. Rename backup to `state.json`
3. Run `cforge status` to verify

### Health check fails
Run `cforge healthcheck --verbose` for detailed output.

## Debug Mode

Set environment variable for verbose logging:
```bash
CFORGE_LOG_LEVEL=debug cforge <command>
```

## Reset Project

To completely reset Stack Forge:
```bash
rm -rf .cforge .claude/skills/workflow-orchestrator .claude/commands/cforge.md
cforge init
```
```

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: add architecture, contributing, and troubleshooting guides"
```

---

## Summary

| Phase | Tasks | Impact |
|-------|-------|--------|
| 1. Fix Bugs | 2 tasks | Correctness |
| 2. Error Handling | 2 tasks | Resilience |
| 3. Async | 1 task | Performance |
| 4. Logging | 1 task | Debuggability |
| 5. Validation | 1 task | Robustness |
| 6. Testing | 1 task | Reliability |
| 7. Documentation | 1 task | Team Adoption |

**Total:** 9 tasks, ~45 steps

Each task is independent and can be implemented in any order. Start with Phase 1 for immediate correctness improvements.
