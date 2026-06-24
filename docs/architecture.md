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
