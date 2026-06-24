# Stack Forge

> Claude Code workflow orchestration engine. Composes existing plugins into a unified development workflow.

## What it does

Stack Forge discovers your installed Claude Code plugins (Superpowers, feature-dev, code-review, etc.) and generates an orchestration workflow that chains them together automatically. It includes health checks to ensure providers are working correctly before starting a workflow.

## Quick Start

```bash
# Install
npm install -g cforge

# Initialize (zero-config)
cforge init

# Start a workflow
cforge                    # default: feature
cforge feature "add auth" # explicit
cforge bugfix "fix login" # explicit
```

## How it works

1. `cforge init` scans your system for installed plugins
2. Auto-installs missing required providers
3. Runs health checks to verify providers are working
4. Generates an orchestration skill + stage skills
5. `cforge` triggers the orchestration skill
6. The skill forks subagents for each stage automatically
7. Stages: Brainstorm → Spec → Plan → Build → Review → Release

## Commands

| Command | Description |
|---------|-------------|
| `cforge init` | Initialize Stack Forge (zero-config) |
| `cforge [workflow] [desc]` | Start or continue a workflow |
| `cforge status` | Show current workflow status |
| `cforge healthcheck` | Check health of installed providers |
| `cforge update` | Re-scan providers and update configuration |
| `cforge generate` | Regenerate all config files |
| `cforge validate` | Validate implementation against spec requirements |

## Debug Mode

Set environment variable for verbose logging:

```bash
CFORGE_LOG_LEVEL=debug cforge <command>
```

## Supported Providers

| Capability | Default Provider |
|------------|-----------------|
| Brainstorm | Superpowers |
| Specification | feature-dev |
| Planning | Superpowers |
| Implementation | Built-in |
| Review | code-review |
| Release | gstack |
| Memory | claude-mem |

## Architecture

```
cforge CLI
  ├── Provider Discovery (scan plugins)
  ├── Health Check (verify providers)
  ├── Config Generator (skills, commands, CLAUDE.md)
  ├── Schema Validation (Zod)
  └── State Management (state.json with backup)

Claude Code Runtime
  ├── Orchestration Skill (state machine + fork)
  │   └── Stage Skills (context: fork isolation)
  └── Provider Delegation
      ├── Superpowers (brainstorm, planning)
      ├── feature-dev (specification)
      ├── code-review (review)
      └── gstack (release)
```

## License

MIT
