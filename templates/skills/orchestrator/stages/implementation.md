---
name: implementation-{{workflow_name}}
description: "Execute implementation tasks with parallel optimization"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Implementation Stage (Parallel)

## Input

- **Tasks:** `.cforge/artifacts/tasks.md`
- **Specs:** `.cforge/artifacts/specs/`

## Task

Execute tasks from tasks.md with parallel optimization. Independent tasks execute concurrently; dependent tasks execute serially.

## Phase 1: Task Analysis

1. Read `.cforge/artifacts/tasks.md`
2. Parse each task to extract:
   - Task ID and description
   - File paths mentioned in the task
   - Dependencies (if explicitly stated)
3. Build file dependency graph:
   - Map each file to tasks that modify it
   - Tasks sharing the same file are dependent

## Phase 2: Batch Formation

1. Group independent tasks into batches:
   - No two tasks in the same batch modify the same file
   - Maximum 3 tasks per batch
2. Order batches by dependency:
   - Dependent tasks go to later batches
   - Earlier batches complete first
3. Document batch assignments:
   ```
   Batch 1: [Task 1, Task 2, Task 3] (parallel)
   Batch 2: [Task 4] (serial, depends on Task 1)
   ```

## Phase 3: Parallel Execution

For each batch:

### If batch has 1 task (serial):

1. Execute task following TDD:
   - Write failing test
   - Run test (confirm failure)
   - Implement code
   - Run test (confirm pass)
   - Commit changes
2. Mark task complete in tasks.md

### If batch has 2-3 tasks (parallel):

1. Dispatch one subagent per task:
   - Each subagent receives:
     - Task description and file list
     - Constraint: do not modify files outside scope
     - TDD instructions
   - Subagents work concurrently
2. Wait for all subagents to complete
3. Verify each subagent's work:
   - Run tests for modified files
   - Check for type errors
   - Confirm no file conflicts
4. Mark completed tasks in tasks.md

## Phase 4: Validation

After all batches complete:

1. Run full test suite: `npm test`
2. Run `cforge validate` to verify spec coverage
3. If any failures, fix before completing

## Output

- Code changes (committed to branch)
- Updated tasks.md (all tasks marked complete)
- Batch execution log (which tasks ran in parallel)

## Error Handling

- **Subagent DONE:** Continue to next task
- **Subagent FAILED:** Log error, continue other tasks
- **Subagent BLOCKED:** Stop batch, report blocker
- **File conflicts:** Rebase subsequent batches, report if unresolvable

## Completion

After all tasks complete and validate passes, confirm:
"Implementation complete. {N} tasks executed in {M} batches. All tests passing."
