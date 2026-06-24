# Zero-Config cforge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify `cforge init` to zero-config (no flags, no prompts) and add `cforge` as the default workflow entry point replacing `/workflow`.

**Architecture:** Auto-detect project info from package.json/git, silent provider installs, new `cforge` default command that writes state and outputs slash command instruction.

**Tech Stack:** TypeScript, Commander.js, fs-extra, yaml

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/cli/init.ts` | Rewrite: zero-config init with auto-detect, no inquirer |
| `src/index.ts` | Modify: add default command handler for `cforge` |
| `src/cli/run.ts` | Create: workflow runner that writes state + outputs instruction |
| `src/generator/commands.ts` | Modify: generate `/cforge` instead of `/workflow` |
| `templates/commands/workflow.md` | Rename to `cforge.md`, simplify |
| `src/discovery/auto-installer.ts` | Create: silent provider installation logic |
| `src/discovery/project-detector.ts` | Create: auto-detect project name/description |

---

### Task 1: Create project auto-detector

**Files:**
- Create: `src/discovery/project-detector.ts`
- Test: `tests/discovery/project-detector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectProject } from "../../src/discovery/project-detector.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join("/tmp", "cforge-test-" + Date.now());

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("detectProject", () => {
  it("detects name from package.json", async () => {
    await writeFile(join(TEST_DIR, "package.json"), JSON.stringify({
      name: "my-app",
      description: "A test app"
    }));
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe("my-app");
    expect(result.description).toBe("A test app");
  });

  it("falls back to directory name when no package.json", async () => {
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe(TEST_DIR.split("/").pop());
    expect(result.description).toBe("");
  });

  it("prefers package.json name over directory name", async () => {
    await writeFile(join(TEST_DIR, "package.json"), JSON.stringify({
      name: "pkg-name"
    }));
    const result = await detectProject(TEST_DIR);
    expect(result.name).toBe("pkg-name");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/discovery/project-detector.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
import { readFile } from "fs/promises";
import { join } from "path";
import { basename } from "path";

export interface ProjectInfo {
  name: string;
  description: string;
}

export async function detectProject(projectDir: string): Promise<ProjectInfo> {
  // Try package.json first
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

  // Fallback to directory name
  return {
    name: basename(projectDir),
    description: "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/discovery/project-detector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/project-detector.ts tests/discovery/project-detector.test.ts
git commit -m "feat: add project auto-detector from package.json"
```

---

### Task 2: Create silent provider installer

**Files:**
- Create: `src/discovery/auto-installer.ts`
- Test: `tests/discovery/auto-installer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { installProviderSilent, type InstallResult } from "../../src/discovery/auto-installer.js";
import type { ManifestEntry } from "../../src/types/config.js";

describe("installProviderSilent", () => {
  it("returns success for already-installed check", async () => {
    const entry: ManifestEntry = {
      name: "test-provider",
      description: "test",
      capabilities: ["brainstorm"],
      priority: "required",
      install: {
        type: "check",
        command: "echo ok"
      }
    };
    const result = await installProviderSilent(entry);
    expect(result.provider).toBe("test-provider");
    expect(result.status).toBe("skipped");
  });

  it("returns pending for claude_command type", async () => {
    const entry: ManifestEntry = {
      name: "claude-plugin",
      description: "test",
      capabilities: ["memory"],
      priority: "optional",
      install: {
        type: "claude_command",
        command: "/plugin install test"
      }
    };
    const result = await installProviderSilent(entry);
    expect(result.status).toBe("pending");
    expect(result.instruction).toBe("/plugin install test");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/discovery/auto-installer.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
import { execSync } from "child_process";
import type { ManifestEntry } from "../types/config.js";

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

function getInstallCommand(entry: ManifestEntry): string {
  if (entry.install.type === "git_clone") {
    const os = detectOs();
    if (os === "windows") {
      return `echo "Windows not supported for git_clone"`;
    }
    return entry.install.command;
  }
  return entry.install.command;
}

export async function installProviderSilent(entry: ManifestEntry): Promise<InstallResult> {
  // Claude Code commands can't run from shell
  if (entry.install.type === "claude_command") {
    return {
      provider: entry.name,
      status: "pending",
      instruction: entry.install.command,
    };
  }

  const cmd = getInstallCommand(entry);
  try {
    execSync(cmd, { stdio: "pipe" });
    if (entry.post_install) {
      execSync(entry.post_install, { stdio: "pipe" });
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
    // Only auto-install required and recommended
    if (entry.priority === "optional") {
      results.push({ provider: entry.name, status: "skipped" });
      continue;
    }
    results.push(await installProviderSilent(entry));
  }
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/discovery/auto-installer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/auto-installer.ts tests/discovery/auto-installer.test.ts
git commit -m "feat: add silent provider installer"
```

---

### Task 3: Rewrite `cforge init` — zero-config

**Files:**
- Modify: `src/cli/init.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runInit } from "../../src/cli/init.js";
import { readFile, mkdir, rm, access } from "fs/promises";
import { join } from "path";

const TEST_DIR = join("/tmp", "cforge-init-test-" + Date.now());

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
  // Create a minimal package.json for auto-detection
  await writeFile(join(TEST_DIR, "package.json"), JSON.stringify({
    name: "test-project",
    description: "Test project description"
  }));
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

function writeFile(path: string, content: string) {
  return import("fs/promises").then(fs => fs.writeFile(path, content));
}

describe("runInit zero-config", () => {
  it("creates .cforge directory with config.yaml", async () => {
    await runInit(TEST_DIR, {});
    const config = await readFile(join(TEST_DIR, ".cforge/config.yaml"), "utf-8");
    expect(config).toContain("feature");
  });

  it("auto-detects project name from package.json", async () => {
    await runInit(TEST_DIR, {});
    const state = JSON.parse(
      await readFile(join(TEST_DIR, ".cforge/state.json"), "utf-8")
    );
    expect(state.context.project_name).toBe("test-project");
  });

  it("creates no prompts (no inquirer calls)", async () => {
    // This test verifies the function doesn't throw
    // The real assertion is that it completes without interactive input
    await runInit(TEST_DIR, {});
    const configExists = await access(join(TEST_DIR, ".cforge/config.yaml"))
      .then(() => true).catch(() => false);
    expect(configExists).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cli/init.test.ts`
Expected: FAIL (current init requires options.mode etc.)

- [ ] **Step 3: Rewrite init.ts**

Replace `src/cli/init.ts` with:

```typescript
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";
import { stringify as dumpYaml, parse as parseYaml } from "yaml";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd, generateProvidersMd } from "../generator/claude-md.js";
import { StateManager } from "../state/manager.js";
import { detectProject } from "../discovery/project-detector.js";
import { installProvidersSilent } from "../discovery/auto-installer.js";
import type { ForgeConfig, ManifestEntry } from "../types/config.js";
import type { DetectedProvider } from "../types/provider.js";

export interface InitOptions {
  workflow?: string;
}

const FEATURE_STAGES = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

async function loadExistingProviders(cforgeDir: string): Promise<Record<string, DetectedProvider>> {
  const providersPath = join(cforgeDir, "providers.yaml");
  if (!existsSync(providersPath)) return {};
  try {
    const content = await readFile(providersPath, "utf-8");
    const data = parseYaml(content) as { providers?: Record<string, DetectedProvider> };
    return data.providers || {};
  } catch {
    return {};
  }
}

export async function runInit(projectDir: string, options: InitOptions = {}): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");
  await mkdir(cforgeDir, { recursive: true });

  // 1. Auto-detect project info
  const projectInfo = await detectProject(projectDir);
  const workflow = options.workflow || "feature";

  // 2. Load previously installed providers
  const existingProviders = await loadExistingProviders(cforgeDir);

  // 3. Scan for currently installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const scannedProviders = matchProviders(scanResult, providerDefs);

  // 4. Merge existing + scanned
  let detected: Record<string, DetectedProvider> = { ...existingProviders };
  for (const [name, provider] of Object.entries(scannedProviders)) {
    detected[name] = provider;
  }

  // 5. Load manifest and auto-install missing required/recommended
  const manifest = await loadManifest();
  const missing = manifest.filter((m) => !Object.keys(detected).includes(m.name));

  if (missing.length > 0) {
    const results = await installProvidersSilent(missing);
    for (const result of results) {
      if (result.status === "installed") {
        const entry = missing.find((m) => m.name === result.provider)!;
        detected[result.provider] = {
          name: entry.name,
          capabilities: entry.capabilities,
          source: "installed-by-cforge",
          detected_at: new Date().toISOString(),
        };
      }
    }

    // Print summary
    const installed = results.filter((r) => r.status === "installed");
    const pending = results.filter((r) => r.status === "pending");
    const skipped = results.filter((r) => r.status === "skipped" || r.status === "failed");

    if (installed.length > 0) {
      console.log(`Installed: ${installed.map((r) => r.provider).join(", ")}`);
    }
    if (pending.length > 0) {
      console.log("\nRun these in Claude Code:");
      for (const r of pending) {
        console.log(`  ${r.instruction}`);
      }
    }
    if (skipped.length > 0) {
      console.log(`Skipped: ${skipped.map((r) => r.provider).join(", ")}`);
    }
  }

  // 6. Build provider mapping
  const capabilities = await loadCapabilities();
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 7. Write config
  const config: ForgeConfig = {
    workflow,
    providers: providerMap,
    overrides: {},
    stages: { auto_advance: true, pause_on_review: true },
    artifacts: { output_dir: ".cforge/artifacts" },
  };
  await writeFile(join(cforgeDir, "config.yaml"), dumpYaml(config), "utf-8");

  // 8. Write providers
  await writeFile(join(cforgeDir, "providers.yaml"), dumpYaml({ providers: detected }), "utf-8");

  // 9. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(workflow, projectInfo.description);

  // 10. Create directories
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 11. Generate skill files
  await generateOrchestrator(projectDir, {
    workflowName: workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: workflow,
    stages: FEATURE_STAGES,
    description: projectInfo.description,
  });

  // 12. Generate /cforge command
  await generateCommands(projectDir, {
    workflowName: workflow,
    description: projectInfo.description,
  });

  // 13. Generate CLAUDE.md
  await generateClaudeMd(projectDir, {
    workflowName: workflow,
    detected,
    manifest,
    capabilities,
  });

  // 14. Generate providers.md
  await generateProvidersMd(projectDir, {
    workflowName: workflow,
    detected,
    manifest,
    capabilities,
  });

  // 15. Print summary
  const detectedNames = Object.keys(detected);
  console.log(`\nStack Forge initialized.`);
  console.log(`Detected: ${detectedNames.join(", ") || "none"}`);
  console.log(`Ready. Run: cforge`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cli/init.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/init.ts tests/cli/init.test.ts
git commit -m "feat: rewrite cforge init to zero-config"
```

---

### Task 4: Create workflow runner (`cforge` entry point)

**Files:**
- Create: `src/cli/run.ts`
- Test: `tests/cli/run.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runWorkflow } from "../../src/cli/run.js";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = join("/tmp", "cforge-run-test-" + Date.now());

beforeEach(async () => {
  await mkdir(join(TEST_DIR, ".cforge"), { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe("runWorkflow", () => {
  it("outputs instruction when state exists", async () => {
    const state = {
      workflow: "feature",
      status: "in_progress",
      current_stage: "brainstorm",
      context: { description: "add auth" },
      stages: {}
    };
    await writeFile(join(TEST_DIR, ".cforge/state.json"), JSON.stringify(state));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runWorkflow(TEST_DIR, {});
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("cforge")
    );
    consoleSpy.mockRestore();
  });

  it("errors when no state exists", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await runWorkflow(TEST_DIR, {});
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("cforge init")
    );
    consoleSpy.mockRestore();
  });

  it("updates state with new workflow type", async () => {
    const state = {
      workflow: "feature",
      status: "in_progress",
      current_stage: "brainstorm",
      context: { description: "" },
      stages: {}
    };
    await writeFile(join(TEST_DIR, ".cforge/state.json"), JSON.stringify(state));

    await runWorkflow(TEST_DIR, { workflow: "bugfix", description: "fix login" });
    const newState = JSON.parse(
      await import("fs/promises").then(fs =>
        fs.readFile(join(TEST_DIR, ".cforge/state.json"), "utf-8")
      )
    );
    expect(newState.workflow).toBe("bugfix");
    expect(newState.context.description).toBe("fix login");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cli/run.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { StateManager } from "../state/manager.js";

export interface RunOptions {
  workflow?: string;
  description?: string;
}

export async function runWorkflow(projectDir: string, options: RunOptions = {}): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");
  const stateManager = new StateManager(cforgeDir);
  const state = await stateManager.read();

  if (!state) {
    console.error("No workflow initialized. Run `cforge init` first.");
    return;
  }

  // Update workflow type if provided
  if (options.workflow) {
    state.workflow = options.workflow;
  }

  // Update description if provided
  if (options.description) {
    state.context.description = options.description;
  }

  // Reset to first stage if starting a new workflow
  if (options.workflow || options.description) {
    state.status = "in_progress";
    state.current_stage = "brainstorm";
  }

  await stateManager.write(state);

  // Output instruction
  const desc = state.context.description || "your project";
  console.log(`\nWorkflow: ${state.workflow}`);
  console.log(`Description: ${desc}`);
  console.log(`\nRun in Claude Code:\n  /cforge`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cli/run.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/run.ts tests/cli/run.test.ts
git commit -m "feat: add workflow runner for cforge entry point"
```

---

### Task 5: Update CLI entry point — add default command

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const CLI = join(process.cwd(), "dist", "index.js");

describe("cforge CLI", () => {
  it("shows help with --help", () => {
    const output = execSync(`node ${CLI} --help`, { encoding: "utf-8" });
    expect(output).toContain("cforge");
  });

  it("shows version with --version", () => {
    const output = execSync(`node ${CLI} --version`, { encoding: "utf-8" });
    expect(output).toContain("0.1.0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cli/index.test.ts`
Expected: FAIL (test file doesn't exist yet, or build needed)

- [ ] **Step 3: Update index.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./cli/init.js";
import { runStatus } from "./cli/status.js";
import { runUpdate } from "./cli/update.js";
import { runGenerate } from "./cli/generate.js";
import { runWorkflow } from "./cli/run.js";

const program = new Command();

program
  .name("cforge")
  .description("Claude Code workflow orchestration engine")
  .version("0.1.0");

// Default command: cforge [workflow] [description]
program
  .argument("[workflow]", "Workflow type (feature, bugfix, etc.)", "feature")
  .argument("[description]", "Workflow description", "")
  .action(async (workflow, description) => {
    await runWorkflow(process.cwd(), { workflow, description });
  });

program
  .command("init")
  .description("Initialize Stack Forge (zero-config)")
  .option("--workflow <name>", "Default workflow type", "feature")
  .action(async (opts) => {
    await runInit(process.cwd(), {
      workflow: opts.workflow,
    });
    console.log("Stack Forge initialized!");
  });

program
  .command("status")
  .description("Show current workflow status")
  .action(async () => {
    await runStatus(process.cwd());
  });

program
  .command("update")
  .description("Re-scan providers and update configuration")
  .action(async () => {
    await runUpdate(process.cwd());
  });

program
  .command("generate")
  .description("Regenerate all config files")
  .action(async () => {
    await runGenerate(process.cwd());
  });

program.parse();
```

- [ ] **Step 4: Build and run test**

Run: `npm run build && npx vitest run tests/cli/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/cli/index.test.ts
git commit -m "feat: add cforge as default workflow entry point"
```

---

### Task 6: Update command generator — `/cforge` instead of `/workflow`

**Files:**
- Modify: `src/generator/commands.ts`
- Rename: `templates/commands/workflow.md` → `templates/commands/cforge.md`
- Modify: `templates/commands/cforge.md`

- [ ] **Step 1: Rename template**

```bash
mv templates/commands/workflow.md templates/commands/cforge.md
```

- [ ] **Step 2: Update template content**

Replace `templates/commands/cforge.md` with:

```markdown
---
description: "Run the {{workflow_name}} workflow"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Workflow: {{workflow_name}}

Starting workflow: {{description}}

Run the workflow orchestrator skill to begin.
```

- [ ] **Step 3: Update commands.ts**

```typescript
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface CommandsOptions {
  workflowName: string;
  description?: string;
}

export async function generateCommands(
  projectDir: string,
  options: CommandsOptions
): Promise<void> {
  const commandsDir = join(projectDir, ".claude/commands");
  await mkdir(commandsDir, { recursive: true });

  const template = await loadTemplate("commands/cforge.md");
  const rendered = renderTemplate(template, {
    workflow_name: options.workflowName,
    description: options.description || "",
  });

  await writeFile(join(commandsDir, "cforge.md"), rendered, "utf-8");
}
```

- [ ] **Step 4: Update tests if they reference workflow.md**

Search for `workflow.md` in test files and update to `cforge.md`.

- [ ] **Step 5: Commit**

```bash
git add src/generator/commands.ts templates/commands/
git commit -m "feat: generate /cforge command instead of /workflow"
```

---

### Task 7: Update state manager to include project_name

**Files:**
- Modify: `src/state/manager.ts`
- Modify: `src/types/state.ts` (if exists)

- [ ] **Step 1: Check current state type**

Read `src/state/manager.ts` and `src/types/state.ts` to understand current structure.

- [ ] **Step 2: Add project_name to context**

If the state type has a `context` field with `description`, add `project_name`:

```typescript
export interface StateContext {
  project_name: string;
  description: string;
}
```

Update `StateManager.create()` to accept and store `project_name`.

- [ ] **Step 3: Update init.ts to pass project_name**

In `src/cli/init.ts`, update the state creation call:

```typescript
await stateManager.create(workflow, projectInfo.name, projectInfo.description);
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/manager.ts src/types/state.ts src/cli/init.ts
git commit -m "feat: add project_name to workflow state context"
```

---

### Task 8: Update README and docs

**Files:**
- Modify: `README.md`
- Modify: `README-zh.md`

- [ ] **Step 1: Update README.md**

Replace the Quick Start section:

```markdown
## Quick Start

\`\`\`bash
# Install
npm install -g cforge

# Initialize (zero-config)
cforge init

# Start a workflow
cforge                    # default: feature
cforge feature "add auth" # explicit
cforge bugfix "fix login" # explicit
\`\`\`
```

Update the Commands table:

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `cforge init` | Initialize Stack Forge (zero-config) |
| `cforge [workflow] [desc]` | Start or continue a workflow |
| `cforge status` | Show current workflow status |
| `cforge update` | Re-scan providers |
| `cforge generate` | Regenerate config files |
```

- [ ] **Step 2: Update README-zh.md**

Apply equivalent Chinese translations.

- [ ] **Step 3: Commit**

```bash
git add README.md README-zh.md
git commit -m "docs: update README for zero-config cforge"
```

---

### Task 9: Final verification — build and test

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Manual test — init**

Run: `node dist/index.js init` in a test directory with package.json
Expected: Zero prompts, creates .cforge/ with config

- [ ] **Step 4: Manual test — run**

Run: `node dist/index.js` in the same directory
Expected: Outputs "Run: /cforge"

- [ ] **Step 5: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: zero-config cforge complete"
```
