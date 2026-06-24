# Stack Forge

> Claude Code workflow orchestration engine. Composes existing plugins into a unified development workflow.

## What it does

Stack Forge discovers your installed Claude Code plugins (Superpowers, OpenSpec, gstack, etc.) and generates an orchestration workflow that chains them together automatically.

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
2. Generates an orchestration skill + stage skills
3. `/workflow` triggers the orchestration skill
4. The skill forks subagents for each stage automatically
5. Stages: Brainstorm → Spec → Plan → Build → Review → Release

## Commands

| Command | Description |
|---------|-------------|
| `cforge init` | Initialize Stack Forge (zero-config) |
| `cforge [workflow] [desc]` | Start or continue a workflow |
| `cforge status` | Show current workflow status |
| `cforge update` | Re-scan providers |
| `cforge generate` | Regenerate config files |

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

## Architecture

```
cforge CLI
  ├── Provider Discovery (scan plugins)
  ├── Config Generator (skills, commands, CLAUDE.md)
  └── State Management (state.json)

Claude Code Runtime
  ├── Orchestration Skill (state machine + fork)
  │   └── Stage Skills (context: fork isolation)
  └── Provider Delegation
      ├── Superpowers (brainstorm, planning)
      ├── OpenSpec (specification)
      └── gstack (review, release)
```

## License

MIT
