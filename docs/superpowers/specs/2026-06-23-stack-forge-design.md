# Stack Forge Design Spec

> **Project:** Stack Forge (`cforge`)
> **Date:** 2026-06-23
> **Status:** Approved

---

## Overview

Stack Forge is a Claude Code workflow orchestration engine that composes existing mature plugins into a unified development workflow. It does not re-implement plugin capabilities — it orchestrates them.

**Core principle:** Compose, don't rewrite.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
|载体载体 | Independent CLI + config files | Not coupled to any specific plugin runtime |
| Stage progression | Auto-advance | User only intervenes at key decision points |
| Provider discovery | Auto-detect with user override | Zero-config for common setups, flexible for custom ones |
| Tech stack | TypeScript / Node.js | Consistent with gstack, OpenSpec ecosystem |
| Orchestration mechanism | Orchestration Skill + `context: fork` subagents | Leverages Claude Code's native skill system |
| CLI command name | `cforge` | Short, memorable, from "claude stack forge" |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    User Interface                     │
│  /workflow feature "add user auth"                   │
│  cforge status / doctor / update                     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               CLI Tool (cforge)                      │
│  init | status | update | generate                   │
│  - Provider Discovery (scan plugins)                │
│  - Config Generation (skills, commands, CLAUDE.md)  │
│  - State Management (read/write state.json)         │
└──────────────────────┬──────────────────────────────┘
                       │ generates
┌──────────────────────▼──────────────────────────────┐
│            Generated Claude Code Files               │
│  .claude/skills/workflow-orchestrator/SKILL.md      │
│  .claude/skills/workflow-orchestrator/stages/*.md   │
│  .claude/commands/workflow.md                        │
│  CLAUDE.md (routing hints)                          │
│  .cforge/state.json                                 │
│  .cforge/providers.yaml                             │
└──────────────────────┬──────────────────────────────┘
                       │ executed by
┌──────────────────────▼──────────────────────────────┐
│              Claude Code Runtime                     │
│  Orchestration Skill (state machine + fork)          │
│    → Stage Skills (context: fork isolation)          │
│      → Provider delegation (superpowers, openspec…)  │
└──────────────────────┬──────────────────────────────┘
                       │ delegates to
┌──────────────────────▼──────────────────────────────┐
│              Provider Layer                          │
│  Brainstorm: Superpowers                             │
│  Spec: OpenSpec                                      │
│  Planning: Superpowers                               │
│  Review: gstack                                      │
│  Memory: claude-mem                                  │
└─────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Workflow

A named sequence of stages. MVP provides one workflow: **Feature Development**.

```
Brainstorm → Specification → Planning → Implementation → Review → Release
```

### Stage

A discrete unit of work within a workflow. Each stage:
- Has a defined input (artifact from previous stage)
- Has a defined output (artifact for next stage)
- Delegates to a provider
- Produces a standardized artifact

### Provider

An external plugin or built-in capability that fulfills a specific capability. Providers are auto-discovered and mapped to capabilities.

### Artifact

A file produced by a stage, consumed by the next stage. Stored in `.cforge/artifacts/`.

### Capability

A system-level ability that needs a provider implementation:

| Capability | Default Provider | Input | Output |
|------------|-----------------|-------|--------|
| brainstorm | superpowers | user idea | proposal.md |
| specification | openspec | proposal.md | specs/\*/\*.md |
| planning | superpowers | proposal.md + specs | tasks.md |
| implementation | builtin | tasks.md + specs | code + tests |
| review | gstack | diff + specs | review.md |
| release | gstack | review.md | PR/merge |
| memory | claude-mem | context | memory store |

---

## Repository Structure

```
stack-forge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── cli/
│   │   ├── init.ts
│   │   ├── status.ts
│   │   ├── update.ts
│   │   └── generate.ts
│   ├── discovery/
│   │   ├── scanner.ts
│   │   ├── matcher.ts
│   │   └── registry.ts
│   ├── generator/
│   │   ├── orchestrator.ts
│   │   ├── stages.ts
│   │   ├── commands.ts
│   │   ├── claude-md.ts
│   │   └── templates.ts
│   ├── state/
│   │   ├── manager.ts
│   │   └── types.ts
│   └── types/
│       ├── provider.ts
│       ├── workflow.ts
│       └── config.ts
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
├── docs/
└── README.md
```

---

## Provider Discovery

### Detection Rules

Each provider has detection rules in `registry/providers.yaml`:

```yaml
providers:
  superpowers:
    capabilities: [brainstorm, planning]
    detect:
      - type: skill_exists
        match_name: "using-superpowers"
      - type: plugin_installed
        name: "superpowers"

  openspec:
    capabilities: [specification]
    detect:
      - type: command_exists
        match_prefix: "opsx:"
      - type: cli_installed
        command: "openspec --version"

  gstack:
    capabilities: [review, release]
    detect:
      - type: skill_exists
        path: "~/.claude/skills/gstack/"
      - type: plugin_installed
        name: "gstack"

  claude-mem:
    capabilities: [memory]
    detect:
      - type: skill_exists
        path: "~/.claude/skills/claude-mem/"
      - type: mcp_server_configured
        name: "claude-mem"
```

### Discovery Flow

1. Read `registry/capabilities.yaml` → know required capabilities
2. For each capability, read detection rules from `registry/providers.yaml`
3. Execute detection: scan `~/.claude/skills/`, `.claude/commands/`, `.mcp.json`, CLI
4. Match detected plugins → capabilities
5. Write `.cforge/providers.yaml` (user can override)
6. Generate skill files with provider-specific routing

### Provider Override

Users can override via `.cforge/config.yaml`:

```yaml
overrides:
  review: builtin
  memory: none
```

---

## Orchestration Skill

### SKILL.md Structure

The orchestration skill is a Claude Code skill with `context: fork`. It:

1. Reads `.cforge/state.json` → current workflow and stage
2. Reads `.cforge/config.yaml` → provider bindings
3. Loads the current stage's stage skill
4. Forks a subagent with the stage skill
5. Waits for completion
6. Checks artifact exists
7. Updates state.json → advances to next stage
8. Loops until all stages complete

### State Machine

```
INIT → BRAINSTORM → SPECIFICATION → PLANNING → IMPLEMENTATION → REVIEW → RELEASE → DONE
         ↓ failed       ↓ failed        ↓ failed        ↓ failed       ↓ failed      ↓ failed
       PAUSED          PAUSED          PAUSED          PAUSED         PAUSED        PAUSED
```

### Stage Skill Protocol

Each stage skill follows a unified protocol:

**Input:** State from `state.json` + artifacts from previous stage
**Output:** Artifact file in `.cforge/artifacts/`
**Completion signal:** Artifact file exists

---

## State Management

### state.json Schema

```jsonc
{
  "version": "1.0",
  "workflow": "feature",
  "created_at": "2026-06-23T10:00:00Z",
  "updated_at": "2026-06-23T10:15:00Z",
  "current_stage": "specification",
  "status": "in_progress",
  "context": {
    "type": "feature",
    "description": "add user authentication",
    "branch": "feature/user-auth"
  },
  "stages": {
    "brainstorm": {
      "status": "completed",
      "started_at": "2026-06-23T10:00:00Z",
      "completed_at": "2026-06-23T10:05:00Z",
      "provider": "superpowers",
      "artifact": ".cforge/artifacts/proposal.md"
    },
    "specification": {
      "status": "in_progress",
      "started_at": "2026-06-23T10:05:00Z",
      "provider": "openspec",
      "artifact": null
    },
    "planning": { "status": "pending", "provider": "superpowers", "artifact": null },
    "implementation": { "status": "pending", "provider": "builtin", "artifact": null },
    "review": { "status": "pending", "provider": "gstack", "artifact": null },
    "release": { "status": "pending", "provider": "gstack", "artifact": null }
  }
}
```

### Artifact Flow

| Stage | Reads | Produces |
|-------|-------|----------|
| brainstorm | user input (context) | `proposal.md` |
| specification | `proposal.md` | `specs/<capability>/spec.md` |
| planning | `proposal.md` + `specs/` | `tasks.md` |
| implementation | `tasks.md` + `specs/` | code + tests |
| review | diff + `specs/` | `review.md` |
| release | `review.md` | PR/merge |

---

## CLI Commands

### `cforge init`

Two modes:
1. **Fresh install** — detects missing plugins, offers to install them
2. **Existing project** — skips installation, generates config only

### `cforge status`

Shows current workflow state, provider bindings, and stage progress.

### `cforge update`

Re-scans providers, detects changes, smart-regenerates affected configs.

### `cforge generate`

Manually regenerate all config files (useful after editing templates).

---

## Default Plugin Manifest

```yaml
recommended:
  - name: superpowers
    capabilities: [brainstorm, planning]
    priority: required
    install:
      type: claude_plugin
      command: "/plugin install superpowers@claude-plugins-official"

  - name: openspec
    capabilities: [specification]
    priority: required
    install:
      type: npm
      command: "npm install -g @fission-ai/openspec@latest"
    post_install: "openspec init"

  - name: gstack
    capabilities: [review, release]
    priority: recommended
    install:
      type: git_clone
      command: "git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup"

  - name: claude-mem
    capabilities: [memory]
    priority: optional
    install:
      type: claude_plugin
      command: "/plugin install claude-mem@claude-plugins-official"
```

---

## Generated Files

### `.claude/skills/workflow-orchestrator/SKILL.md`

Main orchestration skill. Reads state, forks stage subagents, manages transitions.

### `.claude/skills/workflow-orchestrator/stages/*.md`

6 stage skills, each responsible for one workflow stage.

### `.claude/commands/workflow.md`

The `/workflow` command entry point.

### `CLAUDE.md` additions

Routing hints telling Claude Code about the workflow system.

### `.cforge/` directory

- `config.yaml` — user configuration
- `providers.yaml` — detected providers
- `state.json` — workflow state
- `artifacts/` — stage outputs
- `errors/` — error logs

---

## MVP Scope

### Included

- `cforge init` (fresh install + existing project)
- `cforge status`
- `cforge update`
- Provider discovery for superpowers, openspec, gstack, claude-mem
- Config generation (orchestration skill + 6 stage skills)
- State management (state.json)
- Feature Development Workflow (full chain)
- Auto-advance between stages
- Artifact flow (standardized inputs/outputs)

### Excluded (future)

- `cforge doctor`
- `cforge upgrade`
- Bugfix / Release workflows
- Parallel stages
- Web UI / Dashboard
- Custom workflow definition

---

## Testing Strategy

- Unit tests: provider scanner, matcher, state manager, generator
- Integration tests: full `cforge init` → `/workflow` end-to-end
- Manual testing: verify generated skills work with Claude Code

---

## Success Criteria

1. `cforge init` generates a working workflow configuration
2. `/workflow feature "description"` runs the full Feature Development chain
3. Providers are auto-detected and correctly bound
4. State persists across sessions
5. `cforge update` handles plugin changes gracefully
6. Default experience is better than manually installing plugins separately
