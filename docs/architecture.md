# Stack Forge Architecture

## Overview

Stack Forge is a CLI tool that orchestrates Claude Code workflows by discovering installed plugins and generating orchestration skills.

> **Note:** For a high-level overview and quick start, see [README.md](../README.md#architecture).

## Components

### Entry Point
- `src/index.ts` - CLI command definitions and program setup

### CLI Layer (`src/cli/`)
- `init.ts` - Project initialization
- `run.ts` - Workflow execution
- `status.ts` - Status reporting
- `healthcheck.ts` - Provider health checks
- `update.ts` - Provider re-scanning
- `generate.ts` - Config regeneration
- `validate.ts` - Requirement validation

### Core Modules
- `src/logger.ts` - Structured logging with pino
- `src/schemas/config.ts` - Zod validation schemas

### Type Definitions
- `src/types/config.ts` - Config and manifest types
- `src/types/provider.ts` - Provider detection types
- `src/types/workflow.ts` - Workflow state types

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
1. Project detection (package.json, git remote, directory name)
    ↓
2. Plugin scanning (skill_dirs, plugins, mcp_servers)
    ↓
3. Provider matching (scan results → provider definitions)
    ↓
4. Auto-install missing providers (npm, git clone, claude commands)
    ↓
5. Health check (verify providers are working)
    ↓
6. Generate files:
   - .cforge/config.yaml (provider mapping)
   - .cforge/providers.yaml (detected providers)
   - .cforge/state.json (initial workflow state)
   - .cforge/health.json (health records)
   - .claude/skills/workflow-orchestrator/SKILL.md
   - .claude/skills/workflow-orchestrator/stages/*.md
   - .claude/commands/cforge.md
   - CLAUDE.md (updated with Stack Forge section)
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
