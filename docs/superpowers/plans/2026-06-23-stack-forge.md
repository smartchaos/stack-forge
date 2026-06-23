# Stack Forge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `cforge` — a CLI tool that orchestrates Claude Code plugins into a unified Feature Development workflow.

**Architecture:** TypeScript CLI that discovers installed plugins, generates Claude Code skill files for workflow orchestration, and manages state across sessions. The orchestration skill uses `context: fork` to run each workflow stage in isolated subagent contexts.

**Tech Stack:** TypeScript, Node.js, Vitest (testing), Commander.js (CLI), yaml (parser), fs-extra (filesystem)

---

## File Structure

```
stack-forge/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                          # CLI entry point
│   ├── types/
│   │   ├── provider.ts                   # Provider, Capability, DetectionRule types
│   │   ├── workflow.ts                   # Workflow, Stage, StageStatus types
│   │   └── config.ts                     # Config, Manifest types
│   ├── discovery/
│   │   ├── scanner.ts                    # Scan filesystem for installed plugins
│   │   ├── matcher.ts                    # Match detection rules against scan results
│   │   └── registry.ts                   # Load and query capability registry
│   ├── state/
│   │   └── manager.ts                    # Read/write state.json, transition states
│   ├── generator/
│   │   ├── templates.ts                  # Load and render template files
│   │   ├── orchestrator.ts               # Generate orchestration SKILL.md
│   │   ├── stages.ts                     # Generate stage skill files
│   │   ├── commands.ts                   # Generate /workflow command
│   │   └── claude-md.ts                  # Generate CLAUDE.md additions
│   └── cli/
│       ├── init.ts                       # cforge init command
│       ├── status.ts                     # cforge status command
│       ├── update.ts                     # cforge update command
│       └── generate.ts                   # cforge generate command
├── templates/
│   ├── skills/
│   │   ├── orchestrator/SKILL.md
│   │   └── stages/
│   │       ├── brainstorm.md
│   │       ├── specification.md
│   │       ├── planning.md
│   │       ├── implementation.md
│   │       ├── review.md
│   │       └── release.md
│   ├── commands/
│   │   └── workflow.md
│   └── artifacts/
│       ├── proposal.md
│       ├── specs/spec.md
│       ├── tasks.md
│       └── review.md
├── registry/
│   ├── capabilities.yaml
│   ├── providers.yaml
│   └── manifest.yaml
├── tests/
│   ├── discovery/
│   │   ├── scanner.test.ts
│   │   ├── matcher.test.ts
│   │   └── registry.test.ts
│   ├── state/
│   │   └── manager.test.ts
│   ├── generator/
│   │   ├── templates.test.ts
│   │   ├── orchestrator.test.ts
│   │   ├── stages.test.ts
│   │   ├── commands.test.ts
│   │   └── claude-md.test.ts
│   └── cli/
│       ├── init.test.ts
│       └── status.test.ts
└── README.md
```

---

## Task 1: Project Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Initialize npm project**

```bash
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install commander yaml fs-extra
npm install -D typescript vitest @types/node @types/fs-extra
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.js.map
.cforge/
```

- [ ] **Step 6: Add scripts to package.json**

```json
{
  "name": "cforge",
  "version": "0.1.0",
  "description": "Claude Code workflow orchestration engine",
  "type": "module",
  "bin": {
    "cforge": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 7: Create directory structure**

```bash
mkdir -p src/types src/discovery src/state src/generator src/cli
mkdir -p tests/discovery tests/state tests/generator tests/cli
mkdir -p templates/skills/orchestrator/stages templates/commands templates/artifacts/specs
mkdir -p registry
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 9: Verify Vitest runs**

```bash
npx vitest run --passWithNoTests
```
Expected: no tests found, passes

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize project foundation"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/provider.ts`
- Create: `src/types/workflow.ts`
- Create: `src/types/config.ts`

- [ ] **Step 1: Create provider types**

```ts
// src/types/provider.ts

export type DetectionType =
  | "skill_exists"
  | "plugin_installed"
  | "command_exists"
  | "cli_installed"
  | "mcp_server_configured";

export interface DetectionRule {
  type: DetectionType;
  path?: string;
  match_name?: string;
  match_prefix?: string;
  command?: string;
  name?: string;
}

export interface ProviderDefinition {
  name: string;
  capabilities: string[];
  detect: DetectionRule[];
}

export interface DetectedProvider {
  name: string;
  version?: string;
  source: string;
  capabilities: string[];
  detected_at: string;
}

export interface CapabilityDefinition {
  name: string;
  description: string;
  input: string;
  output: string;
  default_provider: string;
}
```

- [ ] **Step 2: Create workflow types**

```ts
// src/types/workflow.ts

export type StageStatus = "pending" | "in_progress" | "completed" | "failed" | "paused";
export type WorkflowStatus = "in_progress" | "paused" | "done" | "error";

export type StageName =
  | "brainstorm"
  | "specification"
  | "planning"
  | "implementation"
  | "review"
  | "release";

export interface StageState {
  status: StageStatus;
  started_at?: string;
  completed_at?: string;
  provider: string;
  artifact?: string;
}

export interface WorkflowContext {
  type: string;
  description: string;
  branch?: string;
}

export interface WorkflowState {
  version: string;
  workflow: string;
  created_at: string;
  updated_at: string;
  current_stage: StageName | null;
  status: WorkflowStatus;
  context: WorkflowContext;
  stages: Record<StageName, StageState>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  stages: StageName[];
}
```

- [ ] **Step 3: Create config types**

```ts
// src/types/config.ts

export type ProviderOverride = string | "builtin" | "none";

export interface ForgeConfig {
  workflow: string;
  providers: Record<string, string>;
  overrides: Record<string, ProviderOverride>;
  stages: {
    auto_advance: boolean;
    pause_on_review: boolean;
  };
  artifacts: {
    output_dir: string;
  };
}

export interface ManifestEntry {
  name: string;
  description: string;
  capabilities: string[];
  priority: "required" | "recommended" | "optional";
  install: {
    type: "npm" | "claude_plugin" | "git_clone" | "cli";
    command: string;
  };
  post_install?: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: add core type definitions"
```

---

## Task 3: Registry Files

**Files:**
- Create: `registry/capabilities.yaml`
- Create: `registry/providers.yaml`
- Create: `registry/manifest.yaml`
- Create: `src/discovery/registry.ts`
- Create: `tests/discovery/registry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/discovery/registry.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { loadCapabilities, loadProviders, loadManifest } from "../../src/discovery/registry.js";

describe("registry", () => {
  it("loads capabilities from yaml", async () => {
    const caps = await loadCapabilities();
    expect(caps).toBeDefined();
    expect(caps.brainstorm).toBeDefined();
    expect(caps.brainstorm.default_provider).toBe("superpowers");
    expect(caps.specification).toBeDefined();
    expect(caps.planning).toBeDefined();
  });

  it("loads providers from yaml", async () => {
    const providers = await loadProviders();
    expect(providers).toBeDefined();
    expect(providers.superpowers).toBeDefined();
    expect(providers.superpowers.capabilities).toContain("brainstorm");
  });

  it("loads manifest from yaml", async () => {
    const manifest = await loadManifest();
    expect(manifest).toBeDefined();
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest[0].name).toBe("superpowers");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/discovery/registry.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create registry YAML files**

```yaml
# registry/capabilities.yaml
brainstorm:
  name: Brainstorm
  description: Idea refinement and design exploration
  input: user idea (text)
  output: proposal.md
  default_provider: superpowers

specification:
  name: Specification
  description: Formal requirement spec from proposal
  input: proposal.md
  output: specs/<capability>/spec.md
  default_provider: openspec

planning:
  name: Planning
  description: Break spec into implementation tasks
  input: proposal.md + specs
  output: tasks.md
  default_provider: superpowers

implementation:
  name: Implementation
  description: Execute tasks with TDD
  input: tasks.md + specs
  output: code changes + tests
  default_provider: builtin

review:
  name: Review
  description: Code review against spec
  input: diff + specs
  output: review.md
  default_provider: gstack

release:
  name: Release
  description: Ship code (PR, merge, deploy)
  input: review.md
  output: PR / merge
  default_provider: gstack

memory:
  name: Memory
  description: Persist context across sessions
  input: session context
  output: memory store
  default_provider: claude-mem
```

```yaml
# registry/providers.yaml
superpowers:
  capabilities: [brainstorm, planning]
  detect:
    - type: plugin_installed
      name: "superpowers"

openspec:
  capabilities: [specification]
  detect:
    - type: cli_installed
      command: "openspec --version"

gstack:
  capabilities: [review, release]
  detect:
    - type: skill_exists
      path: "~/.claude/skills/gstack/"

claude-mem:
  capabilities: [memory]
  detect:
    - type: mcp_server_configured
      name: "claude-mem"
```

```yaml
# registry/manifest.yaml
- name: superpowers
  description: "Workflow methodology (brainstorm, planning, TDD, review)"
  capabilities: [brainstorm, planning]
  priority: required
  install:
    type: claude_plugin
    command: "/plugin install superpowers@claude-plugins-official"

- name: openspec
  description: "Spec-driven development framework"
  capabilities: [specification]
  priority: required
  install:
    type: npm
    command: "npm install -g @fission-ai/openspec@latest"
  post_install: "openspec init"

- name: gstack
  description: "Code review, QA, shipping skills"
  capabilities: [review, release]
  priority: recommended
  install:
    type: git_clone
    command: "git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup"

- name: claude-mem
  description: "Memory persistence across sessions"
  capabilities: [memory]
  priority: optional
  install:
    type: claude_plugin
    command: "/plugin install claude-mem@claude-plugins-official"
```

- [ ] **Step 4: Implement registry loader**

```ts
// src/discovery/registry.ts
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";
import type { CapabilityDefinition, ProviderDefinition } from "../types/provider.js";
import type { ManifestEntry } from "../types/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_DIR = resolve(__dirname, "../../registry");

async function loadYaml<T>(filename: string): Promise<T> {
  const content = await readFile(resolve(REGISTRY_DIR, filename), "utf-8");
  return parseYaml(content) as T;
}

export async function loadCapabilities(): Promise<Record<string, CapabilityDefinition>> {
  return loadYaml<Record<string, CapabilityDefinition>>("capabilities.yaml");
}

export async function loadProviders(): Promise<Record<string, ProviderDefinition>> {
  return loadYaml<Record<string, ProviderDefinition>>("providers.yaml");
}

export async function loadManifest(): Promise<ManifestEntry[]> {
  return loadYaml<ManifestEntry[]>("manifest.yaml");
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/discovery/registry.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add registry/ src/discovery/registry.ts tests/discovery/registry.test.ts
git commit -m "feat: add registry files and loader"
```

---

## Task 4: Provider Scanner

**Files:**
- Create: `src/discovery/scanner.ts`
- Create: `tests/discovery/scanner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/discovery/scanner.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/discovery/scanner.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement scanner**

```ts
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

async function scanPlugins(claudeJson: string): Promise<string[]> {
  if (!(await exists(claudeJson))) return [];
  try {
    const content = await readFile(claudeJson, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.plugins)) {
      return data.plugins.map((p: string) => p.split("@")[0].split("/").pop() || p);
    }
  } catch {}
  return [];
}

async function scanMcpServers(mcpJson: string): Promise<string[]> {
  if (!(await exists(mcpJson))) return [];
  try {
    const content = await readFile(mcpJson, "utf-8");
    const data = JSON.parse(content);
    if (data.mcpServers) {
      return Object.keys(data.mcpServers);
    }
  } catch {}
  return [];
}

export async function scanForPlugins(
  options: ScanOptions = {}
): Promise<ScanResult> {
  const skillsDir = options.skillsDir || DEFAULT_SKILLS_DIR;
  const claudeJson = options.claudeJson || join(homedir(), ".claude.json");
  const mcpJson = options.mcpJson || join(process.cwd(), ".mcp.json");

  const [skill_dirs, plugins, mcp_servers] = await Promise.all([
    scanSkillDirs(skillsDir),
    scanPlugins(claudeJson),
    scanMcpServers(mcpJson),
  ]);

  return { skill_dirs, plugins, mcp_servers, cli_commands: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/discovery/scanner.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/scanner.ts tests/discovery/scanner.test.ts
git commit -m "feat: add provider scanner"
```

---

## Task 5: Provider Matcher

**Files:**
- Create: `src/discovery/matcher.ts`
- Create: `tests/discovery/matcher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/discovery/matcher.test.ts
import { describe, it, expect } from "vitest";
import { matchProviders } from "../../src/discovery/matcher.js";
import type { ScanResult } from "../../src/discovery/scanner.js";
import type { ProviderDefinition } from "../../src/types/provider.js";

describe("matcher", () => {
  const providers: Record<string, ProviderDefinition> = {
    superpowers: {
      name: "superpowers",
      capabilities: ["brainstorm", "planning"],
      detect: [{ type: "plugin_installed", name: "superpowers" }],
    },
    gstack: {
      name: "gstack",
      capabilities: ["review", "release"],
      detect: [{ type: "skill_exists", path: "~/.claude/skills/gstack/" }],
    },
  };

  it("matches plugin_installed detection", () => {
    const scan: ScanResult = {
      skill_dirs: [],
      plugins: ["superpowers"],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(result.superpowers).toBeDefined();
    expect(result.superpowers.capabilities).toContain("brainstorm");
  });

  it("matches skill_exists detection", () => {
    const scan: ScanResult = {
      skill_dirs: ["gstack", "other"],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(result.gstack).toBeDefined();
    expect(result.gstack.capabilities).toContain("review");
  });

  it("returns empty for no matches", () => {
    const scan: ScanResult = {
      skill_dirs: [],
      plugins: [],
      mcp_servers: [],
      cli_commands: [],
    };

    const result = matchProviders(scan, providers);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/discovery/matcher.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement matcher**

```ts
// src/discovery/matcher.ts
import type { ScanResult } from "./scanner.js";
import type { ProviderDefinition, DetectedProvider } from "../types/provider.js";

function matchesDetection(
  scan: ScanResult,
  rule: ProviderDefinition["detect"][0]
): boolean {
  switch (rule.type) {
    case "plugin_installed":
      return scan.plugins.includes(rule.name || "");
    case "skill_exists":
      return scan.skill_dirs.some((dir) =>
        rule.match_name ? dir.includes(rule.match_name) : dir === rule.match_name
      );
    case "mcp_server_configured":
      return scan.mcp_servers.includes(rule.name || "");
    case "cli_installed":
      return scan.cli_commands.includes(rule.command || "");
    case "command_exists":
      return scan.cli_commands.some((cmd) =>
        rule.match_prefix ? cmd.startsWith(rule.match_prefix) : cmd === rule.match_prefix
      );
    default:
      return false;
  }
}

export function matchProviders(
  scan: ScanResult,
  providers: Record<string, ProviderDefinition>
): Record<string, DetectedProvider> {
  const detected: Record<string, DetectedProvider> = {};

  for (const [name, provider] of Object.entries(providers)) {
    const matched = provider.detect.some((rule) => matchesDetection(scan, rule));
    if (matched) {
      detected[name] = {
        name,
        capabilities: provider.capabilities,
        source: `detected:${name}`,
        detected_at: new Date().toISOString(),
      };
    }
  }

  return detected;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/discovery/matcher.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/discovery/matcher.ts tests/discovery/matcher.test.ts
git commit -m "feat: add provider matcher"
```

---

## Task 6: State Manager

**Files:**
- Create: `src/state/manager.ts`
- Create: `tests/state/manager.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/state/manager.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StateManager } from "../../src/state/manager.js";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("StateManager", () => {
  const testDir = join(tmpdir(), "cforge-test-state");
  let manager: StateManager;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("creates initial state", async () => {
    const state = await manager.create("feature", "add auth");
    expect(state.workflow).toBe("feature");
    expect(state.status).toBe("in_progress");
    expect(state.current_stage).toBe("brainstorm");
    expect(state.context.description).toBe("add auth");
  });

  it("reads existing state", async () => {
    await manager.create("feature", "add auth");
    const loaded = await manager.read();
    expect(loaded).toBeDefined();
    expect(loaded!.workflow).toBe("feature");
  });

  it("transitions stage", async () => {
    await manager.create("feature", "add auth");
    await manager.completeStage("brainstorm");
    const state = await manager.read();
    expect(state!.stages.brainstorm.status).toBe("completed");
    expect(state!.current_stage).toBe("specification");
  });

  it("returns null when no state exists", async () => {
    const state = await manager.read();
    expect(state).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/state/manager.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement state manager**

```ts
// src/state/manager.ts
import { readFile, writeFile, mkdir } from "fs/promises";
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
  return stages as WorkflowState["stages"];
}

export class StateManager {
  private statePath: string;

  constructor(private dir: string) {
    this.statePath = join(dir, "state.json");
  }

  async create(workflow: string, description: string): Promise<WorkflowState> {
    await mkdir(this.dir, { recursive: true });

    const state: WorkflowState = {
      version: "1.0",
      workflow,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_stage: "brainstorm",
      status: "in_progress",
      context: { type: workflow, description },
      stages: defaultStages(),
    };

    await this.write(state);
    return state;
  }

  async read(): Promise<WorkflowState | null> {
    if (!existsSync(this.statePath)) return null;
    const content = await readFile(this.statePath, "utf-8");
    return JSON.parse(content) as WorkflowState;
  }

  async write(state: WorkflowState): Promise<void> {
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

```bash
npx vitest run tests/state/manager.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/manager.ts tests/state/manager.test.ts
git commit -m "feat: add state manager"
```

---

## Task 7: Template Generator

**Files:**
- Create: `templates/skills/orchestrator/SKILL.md`
- Create: `templates/skills/stages/brainstorm.md`
- Create: `templates/skills/stages/specification.md`
- Create: `templates/skills/stages/planning.md`
- Create: `templates/skills/stages/implementation.md`
- Create: `templates/skills/stages/review.md`
- Create: `templates/skills/stages/release.md`
- Create: `templates/commands/workflow.md`
- Create: `src/generator/templates.ts`
- Create: `tests/generator/templates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/generator/templates.test.ts
import { describe, it, expect } from "vitest";
import { loadTemplate, renderTemplate } from "../../src/generator/templates.js";

describe("templates", () => {
  it("loads a template file", async () => {
    const tpl = await loadTemplate("skills/orchestrator/SKILL.md");
    expect(tpl).toContain("Workflow Orchestrator");
  });

  it("renders template with variables", async () => {
    const tpl = "Hello {{name}}, workflow is {{workflow}}";
    const result = renderTemplate(tpl, { name: "test", workflow: "feature" });
    expect(result).toBe("Hello test, workflow is feature");
  });

  it("leaves unresolved variables as-is", async () => {
    const tpl = "Hello {{missing}}";
    const result = renderTemplate(tpl, {});
    expect(result).toBe("Hello {{missing}}");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/generator/templates.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create orchestrator SKILL.md template**

```markdown
---
name: workflow-orchestrator
description: "Orchestrates the {{workflow_name}} development workflow. Automatically advances through stages: {{stage_list}}."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Workflow Orchestrator: {{workflow_name}}

You are a workflow orchestration engine. Your job is to execute the {{workflow_name}} workflow by advancing through stages automatically.

## Current State

Read the workflow state from `.cforge/state.json`.

- **Current Stage:** `{{current_stage}}`
- **Status:** `{{status}}`

## Instructions

1. Read `.cforge/state.json` to get the current stage
2. Read the stage skill from `.claude/skills/workflow-orchestrator/stages/{{current_stage}}.md`
3. Execute the stage following its instructions
4. When complete, write the artifact to `.cforge/artifacts/`
5. Update `.cforge/state.json` — mark current stage as `completed`, advance `current_stage` to the next stage
6. If there is a next stage, read and execute that stage's skill
7. If all stages are complete, output a completion summary

## Stage Order

{{stage_list}}

## Rules

- Do NOT skip stages
- Do NOT modify artifacts from completed stages
- If a stage fails, mark it as `failed` and stop
- Write all artifacts to `.cforge/artifacts/`
```

- [ ] **Step 4: Create stage skill templates**

Each stage skill template follows the same pattern. Here's the brainstorm template:

```markdown
---
name: brainstorm-{{workflow_name}}
description: "Brainstorm and refine the idea: {{description}}"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Brainstorm Stage

## Input

- **User Idea:** {{description}}

## Task

Refine the user's idea into a structured proposal. Follow the brainstorming methodology:

1. Ask clarifying questions one at a time
2. Understand purpose, constraints, success criteria
3. Propose 2-3 approaches with trade-offs
4. Present design in sections for approval
5. Write the final proposal

## Output

Write the completed proposal to: `.cforge/artifacts/proposal.md`

## Proposal Format

```markdown
# Proposal: {{description}}

## Overview
[One paragraph summary]

## Goals
- [List of goals]

## Non-Goals
- [List of non-goals]

## Approach
[Description of chosen approach]

## Alternatives Considered
[Other approaches with trade-offs]
```

## Completion

After writing the proposal, confirm: "Brainstorm complete. Proposal written to .cforge/artifacts/proposal.md"
```

Create similar templates for each stage (specification, planning, implementation, review, release), adjusting the input/output/task descriptions accordingly.

- [ ] **Step 5: Create remaining stage templates**

Create the specification stage template:

```markdown
---
name: specification-{{workflow_name}}
description: "Write specification from proposal"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Specification Stage

## Input

- **Proposal:** `.cforge/artifacts/proposal.md`

## Task

Read the proposal and write a formal specification. Use the OpenSpec methodology if available.

1. Read `.cforge/artifacts/proposal.md`
2. Break down the proposal into discrete capabilities
3. For each capability, write a spec with:
   - Requirements using normative language (SHALL, MUST)
   - Scenarios in GIVEN/WHEN/THEN format
   - Delta format for changes (ADDED, MODIFIED, REMOVED)
4. Write specs to `.cforge/artifacts/specs/<capability>/spec.md`

## Output

- `.cforge/artifacts/specs/*/spec.md` — one per capability

## Completion

After writing all specs, confirm: "Specification complete. Specs written to .cforge/artifacts/specs/"
```

Create the planning stage template:

```markdown
---
name: planning-{{workflow_name}}
description: "Create implementation plan from spec"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Planning Stage

## Input

- **Proposal:** `.cforge/artifacts/proposal.md`
- **Specs:** `.cforge/artifacts/specs/`

## Task

Create a detailed implementation plan. Break work into bite-sized tasks.

1. Read proposal and all specs
2. Identify implementation order (dependencies first)
3. Create tasks.md with:
   - Each task is one action (2-5 minutes)
   - Exact file paths for every change
   - Complete code in every step
   - TDD cycle: write test → run → implement → run → commit
4. Write to `.cforge/artifacts/tasks.md`

## Output

- `.cforge/artifacts/tasks.md` — implementation task list

## Completion

After writing tasks.md, confirm: "Planning complete. Plan written to .cforge/artifacts/tasks.md"
```

Create the implementation stage template:

```markdown
---
name: implementation-{{workflow_name}}
description: "Execute implementation tasks"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Implementation Stage

## Input

- **Tasks:** `.cforge/artifacts/tasks.md`
- **Specs:** `.cforge/artifacts/specs/`

## Task

Execute each task from tasks.md following TDD.

1. Read `.cforge/artifacts/tasks.md`
2. For each unchecked task:
   - Write the failing test
   - Run it to verify failure
   - Write minimal implementation
   - Run test to verify pass
   - Commit
   - Mark task as complete in tasks.md
3. Run full test suite at end

## Output

- Code changes (committed to branch)
- Updated tasks.md (all tasks marked complete)

## Completion

After all tasks complete, confirm: "Implementation complete. All tasks executed and tests passing."
```

Create the review stage template:

```markdown
---
name: review-{{workflow_name}}
description: "Review implementation against spec"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Review Stage

## Input

- **Specs:** `.cforge/artifacts/specs/`
- **Git diff** against main branch

## Task

Review the implementation against the specification.

1. Read all specs from `.cforge/artifacts/specs/`
2. Get the git diff: `git diff main...HEAD`
3. Check each spec requirement is implemented
4. Look for:
   - SQL safety, race conditions
   - Missing error handling
   - Test gaps
   - Spec deviations
5. Write review to `.cforge/artifacts/review.md`

## Output

- `.cforge/artifacts/review.md` — review report

## Completion

After writing review, confirm: "Review complete. Report written to .cforge/artifacts/review.md"
```

Create the release stage template:

```markdown
---
name: release-{{workflow_name}}
description: "Prepare and ship the release"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Release Stage

## Input

- **Review:** `.cforge/artifacts/review.md`
- **Git branch** with implementation

## Task

Prepare the release.

1. Read `.cforge/artifacts/review.md` — verify no critical issues
2. Run tests one final time: `npm test` or equivalent
3. Push branch: `git push origin <branch>`
4. Create PR with description from proposal and review
5. Wait for CI to pass

## Output

- PR created and ready for merge

## Completion

After PR is created, confirm: "Release complete. PR created at <url>"
```

- [ ] **Step 6: Create /workflow command template**

```markdown
---
description: "Start or continue the {{workflow_name}} workflow"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Workflow: {{workflow_name}}

{{#if description}}
Starting new workflow with: {{description}}

Run the workflow orchestrator skill to begin.
{{else}}
Continuing existing workflow.

Check `.cforge/state.json` for current progress and resume from the current stage.
{{/if}}
```

- [ ] **Step 6: Implement template loader**

```ts
// src/generator/templates.ts
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "../../templates");

export async function loadTemplate(relativePath: string): Promise<string> {
  return readFile(resolve(TEMPLATES_DIR, relativePath), "utf-8");
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx vitest run tests/generator/templates.test.ts
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add templates/ src/generator/templates.ts tests/generator/templates.test.ts
git commit -m "feat: add templates and template renderer"
```

---

## Task 8: Config Generator

**Files:**
- Create: `src/generator/orchestrator.ts`
- Create: `src/generator/stages.ts`
- Create: `src/generator/commands.ts`
- Create: `src/generator/claude-md.ts`
- Create: `tests/generator/orchestrator.test.ts`
- Create: `tests/generator/stages.test.ts`
- Create: `tests/generator/commands.test.ts`
- Create: `tests/generator/claude-md.test.ts`

- [ ] **Step 1: Write failing tests for orchestrator generator**

```ts
// tests/generator/orchestrator.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateOrchestrator } from "../../src/generator/orchestrator.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("orchestrator generator", () => {
  const testDir = join(tmpdir(), "cforge-test-orchestrator");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates orchestrator SKILL.md", async () => {
    await generateOrchestrator(testDir, {
      workflowName: "feature",
      stages: ["brainstorm", "specification", "planning"],
    });

    const content = await readFile(
      join(testDir, ".claude/skills/workflow-orchestrator/SKILL.md"),
      "utf-8"
    );
    expect(content).toContain("feature");
    expect(content).toContain("brainstorm");
  });
});
```

- [ ] **Step 2: Implement orchestrator generator**

```ts
// src/generator/orchestrator.ts
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface OrchestratorOptions {
  workflowName: string;
  stages: string[];
}

export async function generateOrchestrator(
  projectDir: string,
  options: OrchestratorOptions
): Promise<void> {
  const skillDir = join(projectDir, ".claude/skills/workflow-orchestrator");
  await mkdir(skillDir, { recursive: true });

  const template = await loadTemplate("skills/orchestrator/SKILL.md");
  const rendered = renderTemplate(template, {
    workflow_name: options.workflowName,
    stage_list: options.stages.join(" → "),
    current_stage: options.stages[0],
    status: "in_progress",
  });

  await writeFile(join(skillDir, "SKILL.md"), rendered, "utf-8");
}
```

- [ ] **Step 3: Run test**

```bash
npx vitest run tests/generator/orchestrator.test.ts
```
Expected: PASS

- [ ] **Step 4: Write failing tests for stages generator**

```ts
// tests/generator/stages.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateStages } from "../../src/generator/stages.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("stages generator", () => {
  const testDir = join(tmpdir(), "cforge-test-stages");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates all stage skill files", async () => {
    await generateStages(testDir, {
      workflowName: "feature",
      stages: ["brainstorm", "specification", "planning"],
      description: "add auth",
    });

    const stagesDir = join(testDir, ".claude/skills/workflow-orchestrator/stages");
    const files = await readFile(join(stagesDir, "brainstorm.md"), "utf-8");
    expect(files).toContain("Brainstorm");
  });
});
```

- [ ] **Step 5: Implement stages generator**

```ts
// src/generator/stages.ts
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { loadTemplate, renderTemplate } from "./templates.js";

export interface StagesOptions {
  workflowName: string;
  stages: string[];
  description: string;
}

export async function generateStages(
  projectDir: string,
  options: StagesOptions
): Promise<void> {
  const stagesDir = join(projectDir, ".claude/skills/workflow-orchestrator/stages");
  await mkdir(stagesDir, { recursive: true });

  for (const stage of options.stages) {
    const template = await loadTemplate(`skills/stages/${stage}.md`);
    const rendered = renderTemplate(template, {
      workflow_name: options.workflowName,
      description: options.description,
    });
    await writeFile(join(stagesDir, `${stage}.md`), rendered, "utf-8");
  }
}
```

- [ ] **Step 6: Run test**

```bash
npx vitest run tests/generator/stages.test.ts
```
Expected: PASS

- [ ] **Step 7: Implement commands generator**

```ts
// src/generator/commands.ts
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

  const template = await loadTemplate("commands/workflow.md");
  const rendered = renderTemplate(template, {
    workflow_name: options.workflowName,
    description: options.description || "",
  });

  await writeFile(join(commandsDir, "workflow.md"), rendered, "utf-8");
}
```

- [ ] **Step 8: Implement CLAUDE.md generator**

```ts
// src/generator/claude-md.ts
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export interface ClaudeMdOptions {
  workflowName: string;
}

const STACK_FORGE_SECTION = `
## Stack Forge

This project uses Stack Forge for workflow orchestration.

- Start workflow: \`/workflow <type> "<description>"\`
- Check status: \`cforge status\`
- Update providers: \`cforge update\`

Workflow stages: brainstorm → specification → planning → implementation → review → release
`;

export async function generateClaudeMd(
  projectDir: string,
  options: ClaudeMdOptions
): Promise<void> {
  const claudeMdPath = join(projectDir, "CLAUDE.md");

  let existing = "";
  if (existsSync(claudeMdPath)) {
    existing = await readFile(claudeMdPath, "utf-8");
  }

  if (existing.includes("## Stack Forge")) {
    return; // Already has Stack Forge section
  }

  await writeFile(claudeMdPath, existing + "\n" + STACK_FORGE_SECTION, "utf-8");
}
```

- [ ] **Step 9: Commit**

```bash
git add src/generator/ tests/generator/
git commit -m "feat: add config generators (orchestrator, stages, commands, claude-md)"
```

---

## Task 9: CLI - cforge init

**Files:**
- Create: `src/cli/init.ts`
- Create: `src/index.ts`
- Create: `tests/cli/init.test.ts`

- [ ] **Step 1: Write failing test for init**

```ts
// tests/cli/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runInit } from "../../src/cli/init.js";
import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge init", () => {
  const testDir = join(tmpdir(), "cforge-test-init");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("generates all config files", async () => {
    await runInit(testDir, {
      mode: "existing",
      workflow: "feature",
      description: "test project",
    });

    // Check generated files exist
    const files = [
      ".cforge/config.yaml",
      ".cforge/providers.yaml",
      ".cforge/state.json",
      ".claude/skills/workflow-orchestrator/SKILL.md",
      ".claude/commands/workflow.md",
    ];

    for (const file of files) {
      const content = await readFile(join(testDir, file), "utf-8");
      expect(content).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Implement init command**

```ts
// src/cli/init.ts
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { dump as dumpYaml } from "yaml";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders, loadCapabilities, loadManifest } from "../discovery/registry.js";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";
import { StateManager } from "../state/manager.js";
import type { ForgeConfig } from "../types/config.js";

export interface InitOptions {
  mode: "fresh" | "existing";
  workflow: string;
  description: string;
}

const FEATURE_STAGES = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

export async function runInit(projectDir: string, options: InitOptions): Promise<void> {
  // 1. Scan for installed plugins
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const detected = matchProviders(scanResult, providerDefs);

  // 2. Load capabilities
  const capabilities = await loadCapabilities();

  // 3. Build provider mapping (capability → provider)
  const providerMap: Record<string, string> = {};
  for (const [capName, capDef] of Object.entries(capabilities)) {
    const detectedForCap = Object.values(detected).find((d) =>
      d.capabilities.includes(capName)
    );
    providerMap[capName] = detectedForCap?.name || capDef.default_provider;
  }

  // 4. Write .cforge/config.yaml
  const cforgeDir = join(projectDir, ".cforge");
  await mkdir(cforgeDir, { recursive: true });

  const config: ForgeConfig = {
    workflow: options.workflow,
    providers: providerMap,
    overrides: {},
    stages: { auto_advance: true, pause_on_review: true },
    artifacts: { output_dir: ".cforge/artifacts" },
  };

  await writeFile(join(cforgeDir, "config.yaml"), dumpYaml(config), "utf-8");

  // 5. Write .cforge/providers.yaml
  const providersContent = dumpYaml({ providers: detected });
  await writeFile(join(cforgeDir, "providers.yaml"), providersContent, "utf-8");

  // 6. Create state
  const stateManager = new StateManager(cforgeDir);
  await stateManager.create(options.workflow, options.description);

  // 7. Create artifacts directory
  await mkdir(join(cforgeDir, "artifacts"), { recursive: true });
  await mkdir(join(cforgeDir, "errors"), { recursive: true });

  // 8. Generate skill files
  await generateOrchestrator(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: options.workflow,
    stages: FEATURE_STAGES,
    description: options.description,
  });

  // 9. Generate /workflow command
  await generateCommands(projectDir, {
    workflowName: options.workflow,
    description: options.description,
  });

  // 10. Generate CLAUDE.md additions
  await generateClaudeMd(projectDir, { workflowName: options.workflow });
}
```

- [ ] **Step 3: Create CLI entry point**

```ts
// src/index.ts
#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./cli/init.js";
import { runStatus } from "./cli/status.js";
import { runUpdate } from "./cli/update.js";
import { runGenerate } from "./cli/generate.js";

const program = new Command();

program
  .name("cforge")
  .description("Claude Code workflow orchestration engine")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize Stack Forge in the current project")
  .option("--mode <mode>", "Init mode: fresh or existing", "existing")
  .option("--workflow <name>", "Default workflow type", "feature")
  .option("--description <desc>", "Project description", "")
  .action(async (opts) => {
    await runInit(process.cwd(), {
      mode: opts.mode as "fresh" | "existing",
      workflow: opts.workflow,
      description: opts.description,
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

- [ ] **Step 4: Run test**

```bash
npx vitest run tests/cli/init.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/init.ts src/index.ts tests/cli/init.test.ts
git commit -m "feat: add cforge init command and CLI entry point"
```

---

## Task 10: CLI - cforge status

**Files:**
- Create: `src/cli/status.ts`
- Create: `tests/cli/status.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// tests/cli/status.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { runStatus } from "../../src/cli/status.js";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

describe("cforge status", () => {
  const testDir = join(tmpdir(), "cforge-test-status");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns status info when state exists", async () => {
    await writeFile(
      join(testDir, "state.json"),
      JSON.stringify({
        version: "1.0",
        workflow: "feature",
        created_at: "2026-06-23T10:00:00Z",
        updated_at: "2026-06-23T10:00:00Z",
        current_stage: "brainstorm",
        status: "in_progress",
        context: { type: "feature", description: "add auth" },
        stages: {
          brainstorm: { status: "in_progress", provider: "superpowers" },
          specification: { status: "pending", provider: "openspec" },
          planning: { status: "pending", provider: "superpowers" },
          implementation: { status: "pending", provider: "builtin" },
          review: { status: "pending", provider: "gstack" },
          release: { status: "pending", provider: "gstack" },
        },
      })
    );

    const status = await runStatus(testDir);
    expect(status.workflow).toBe("feature");
    expect(status.currentStage).toBe("brainstorm");
  });

  it("returns null when no state exists", async () => {
    const status = await runStatus(testDir);
    expect(status).toBeNull();
  });
});
```

- [ ] **Step 2: Implement status command**

```ts
// src/cli/status.ts
import { StateManager } from "../state/manager.js";
import { join } from "path";

export interface StatusInfo {
  workflow: string;
  currentStage: string | null;
  status: string;
  description: string;
  stages: Record<string, { status: string; provider: string }>;
}

export async function runStatus(projectDir: string): Promise<StatusInfo | null> {
  const cforgeDir = join(projectDir, ".cforge");
  const manager = new StateManager(cforgeDir);
  const state = await manager.read();

  if (!state) return null;

  return {
    workflow: state.workflow,
    currentStage: state.current_stage,
    status: state.status,
    description: state.context.description,
    stages: Object.fromEntries(
      Object.entries(state.stages).map(([name, s]) => [
        name,
        { status: s.status, provider: s.provider },
      ])
    ),
  };
}
```

- [ ] **Step 3: Run test**

```bash
npx vitest run tests/cli/status.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/cli/status.ts tests/cli/status.test.ts
git commit -m "feat: add cforge status command"
```

---

## Task 11: CLI - cforge update

**Files:**
- Create: `src/cli/update.ts`

- [ ] **Step 1: Implement update command**

```ts
// src/cli/update.ts
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { dump as dumpYaml } from "yaml";
import { scanForPlugins } from "../discovery/scanner.js";
import { matchProviders } from "../discovery/matcher.js";
import { loadProviders } from "../discovery/registry.js";
import type { DetectedProvider } from "../types/provider.js";

export interface UpdateResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

export async function runUpdate(projectDir: string): Promise<UpdateResult> {
  const cforgeDir = join(projectDir, ".cforge");
  const providersPath = join(cforgeDir, "providers.yaml");

  // Load previous providers
  let previousProviders: Record<string, DetectedProvider> = {};
  if (existsSync(providersPath)) {
    const content = await readFile(providersPath, "utf-8");
    const { parse } = await import("yaml");
    const data = parse(content);
    previousProviders = data.providers || {};
  }

  // Re-scan
  const scanResult = await scanForPlugins();
  const providerDefs = await loadProviders();
  const currentProviders = matchProviders(scanResult, providerDefs);

  // Diff
  const previousNames = new Set(Object.keys(previousProviders));
  const currentNames = new Set(Object.keys(currentProviders));

  const added = [...currentNames].filter((n) => !previousNames.has(n));
  const removed = [...previousNames].filter((n) => !currentNames.has(n));
  const unchanged = [...currentNames].filter((n) => previousNames.has(n));

  // Write updated providers
  await writeFile(providersPath, dumpYaml({ providers: currentProviders }), "utf-8");

  return { added, removed, unchanged };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cli/update.ts
git commit -m "feat: add cforge update command"
```

---

## Task 12: CLI - cforge generate

**Files:**
- Create: `src/cli/generate.ts`

## Task 12: CLI - cforge generate

**Files:**
- Create: `src/cli/generate.ts`

- [ ] **Step 1: Implement generate command**
import { readFile } from "fs/promises";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import { generateOrchestrator } from "../generator/orchestrator.js";
import { generateStages } from "../generator/stages.js";
import { generateCommands } from "../generator/commands.js";
import { generateClaudeMd } from "../generator/claude-md.js";

const FEATURE_STAGES = [
  "brainstorm",
  "specification",
  "planning",
  "implementation",
  "review",
  "release",
];

export async function runGenerate(projectDir: string): Promise<void> {
  const cforgeDir = join(projectDir, ".cforge");

  // Read config
  const configContent = await readFile(join(cforgeDir, "config.yaml"), "utf-8");
  const config = parseYaml(configContent);

  // Read state for description
  const stateContent = await readFile(join(cforgeDir, "state.json"), "utf-8");
  const state = JSON.parse(stateContent);

  // Regenerate all files
  await generateOrchestrator(projectDir, {
    workflowName: config.workflow,
    stages: FEATURE_STAGES,
  });

  await generateStages(projectDir, {
    workflowName: config.workflow,
    stages: FEATURE_STAGES,
    description: state.context.description,
  });

  await generateCommands(projectDir, {
    workflowName: config.workflow,
    description: state.context.description,
  });

  await generateClaudeMd(projectDir, { workflowName: config.workflow });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cli/generate.ts
git commit -m "feat: add cforge generate command"
```

---

## Task 13: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: ALL PASS

- [ ] **Step 2: Build TypeScript**

```bash
npx tsc
```
Expected: no errors

- [ ] **Step 3: Verify CLI runs**

```bash
node dist/index.js --help
```
Expected:
```
Usage: cforge [options] [command]

Claude Code workflow orchestration engine

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  init            Initialize Stack Forge in the current project
  status          Show current workflow status
  update          Re-scan providers and update configuration
  generate        Regenerate all config files
  help            display help for command
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: verify all tests pass and build succeeds"
```

---

## Task 14: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# Stack Forge

> Claude Code workflow orchestration engine. Composes existing plugins into a unified development workflow.

## What it does

Stack Forge discovers your installed Claude Code plugins (Superpowers, OpenSpec, gstack, etc.) and generates an orchestration workflow that chains them together automatically.

## Quick Start

```bash
# Install
npm install -g cforge

# Initialize in your project
cforge init

# Start a workflow
# In Claude Code:
/workflow feature "add user authentication"
```

## How it works

1. `cforge init` scans your system for installed plugins
2. Generates an orchestration skill + stage skills
3. `/workflow` triggers the orchestration skill
4. The skill forks subagents for each stage automatically
5. Stages: Brainstorm → Spec → Plan → Build → Review → Release

## Commands

| Command | Description |
|---------|-------------|
| `cforge init` | Initialize Stack Forge in the current project |
| `cforge status` | Show current workflow status |
| `cforge update` | Re-scan providers and update configuration |
| `cforge generate` | Regenerate all config files |

## Supported Providers

| Capability | Default Provider |
|------------|-----------------|
| Brainstorm | Superpowers |
| Specification | OpenSpec |
| Planning | Superpowers |
| Implementation | Built-in |
| Review | gstack |
| Release | gstack |
| Memory | claude-mem |

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```
