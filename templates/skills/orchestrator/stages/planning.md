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
3. Create tasks.md with each task as one action (2-5 minutes), exact file paths, complete code
4. Write to `.cforge/artifacts/tasks.md`

## Output

- `.cforge/artifacts/tasks.md` — implementation task list

## Completion

After writing tasks.md, confirm: "Planning complete. Plan written to .cforge/artifacts/tasks.md"
