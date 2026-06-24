# Design: Zero-Config cforge

## Problem

The current `cforge` workflow requires too many steps:
1. `cforge init --mode existing --workflow feature --description "add auth"` — multiple flags
2. Interactive provider selection prompts
3. `/workflow feature "add auth"` in Claude Code — different syntax

Users want: `cforge init` then `cforge`. Done.

## Design

### Part 1: `cforge init` — Zero Config

**Auto-detect project info (no flags):**
- Name: `package.json` name → git remote URL → directory name
- Description: `package.json` description → git repo description → empty string
- Workflow: always `feature` (default)

**Auto-handle providers (no prompts):**
- Required providers (superpowers, openspec) → install silently via execSync
- Recommended providers (gstack) → install silently
- Optional providers (claude-mem) → skip entirely
- Claude Code slash-command providers → print one-line instruction, mark as `pending-install`, continue
- No checkbox prompts, no confirmation dialogs

**Init output:**
```
Stack Forge initialized.
Detected: superpowers, openspec
Skipped: gstack (recommended, install manually)
Ready. Run: cforge
```

### Part 2: `cforge` as Workflow Entry Point

Replaces `/workflow feature "description"`.

```bash
cforge                    # default: feature workflow, reads description from state
cforge feature "add auth" # explicit workflow type + description
cforge bugfix "fix login" # explicit
```

The `cforge` command (no subcommand or with workflow args):
1. Reads `.cforge/state.json`
2. If no state → error "run cforge init first"
3. If state exists → writes workflow type + description to state
4. Outputs the slash command to run in Claude Code: `/cforge`
5. Generates/updates `.claude/commands/cforge.md` during init

### Part 3: Generated Slash Command

During `cforge init`, generate `.claude/commands/cforge.md`:
```markdown
---
description: "Run the cforge workflow"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

Read `.cforge/state.json` and execute the current stage.
```

This replaces the old `/workflow` command with a simpler name.

## Files to Change

| File | Change |
|------|--------|
| `src/cli/init.ts` | Remove inquirer, add auto-detect, silent installs |
| `src/index.ts` | Add default command + workflow args handling |
| `src/cli/run.ts` (new) | Workflow runner: read state, write workflow type, output instruction |
| `src/generator/commands.ts` | Generate `/cforge` instead of `/workflow` |
| `templates/commands/workflow.md` | Rename to `cforge.md`, simplify content |

## Verification

1. `cforge init` in a project with `package.json` → auto-fills name + description, no prompts
2. `cforge init` in a bare git repo → uses git remote for name, no prompts
3. `cforge` → outputs "Run: /cforge in Claude Code"
4. `cforge feature "add auth"` → writes state, outputs instruction
5. `cforge bugfix "fix login"` → writes state, outputs instruction
