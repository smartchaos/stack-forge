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
2. For each unchecked task: write failing test, run it, implement, run test, commit, mark complete
3. Run full test suite at end
4. Run `cforge validate` to verify implementation covers all spec requirements — if any fail, fix before completing

## Output

- Code changes (committed to branch)
- Updated tasks.md (all tasks marked complete)

## Completion

After all tasks complete and validate passes, confirm: "Implementation complete. All tasks executed and tests passing."
