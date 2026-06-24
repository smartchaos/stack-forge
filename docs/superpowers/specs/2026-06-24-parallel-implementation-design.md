# Design Spec: Parallel Implementation Stage

## Overview

Add parallel execution capability to the `implementation` stage in cforge workflow orchestrator. Tasks with no file dependency conflicts can be executed concurrently via subagents, reducing total implementation time.

## Goals

- Automatically detect task independence based on file paths
- Execute independent tasks in parallel (up to 3 concurrent subagents)
- Maintain correctness when tasks have file dependencies
- Preserve existing TDD workflow for each task

## Non-Goals

- Modify other stages (brainstorm, specification, planning, review, release)
- Support explicit user-defined parallel markers (future enhancement)
- Handle cross-file dependencies (e.g., shared imports)

## Architecture

### Current Flow (Serial)

```
tasks.md → Task 1 → Task 2 → Task 3 → Task 4 → validate
```

### New Flow (Parallel)

```
tasks.md → Parse Tasks → Build Dependency Graph → Group into Batches
          ↓
          Batch 1: [Task 1, Task 2, Task 3] → Parallel Execution
          ↓
          Batch 2: [Task 4] → Serial Execution (depends on Task 1)
          ↓
          Validate → Update tasks.md
```

## File Dependency Detection

### Algorithm

1. Parse `tasks.md` to extract each task's description and file paths
2. Build a mapping: `file_path → [task_ids]`
3. Tasks sharing the same file are dependent (must run serially)
4. Independent tasks are grouped into parallel batches

### File Path Extraction

Match patterns in task text:
- Explicit paths: `src/discovery/scanner.ts`, `tests/cli/init.test.ts`
- Glob patterns: `src/**/*.ts` (treat as touching all matching files)

### Example

```markdown
- [ ] Task 1: Modify src/discovery/scanner.ts
- [ ] Task 2: Modify src/generator/templates.ts
- [ ] Task 3: Modify src/cli/generate.ts
- [ ] Task 4: Modify src/discovery/scanner.ts (depends on Task 1)
```

**Dependency Graph:**
- Task 1 → [scanner.ts]
- Task 2 → [templates.ts]
- Task 3 → [generate.ts]
- Task 4 → [scanner.ts] (conflicts with Task 1)

**Batch Assignment:**
- Batch 1: [Task 1, Task 2, Task 3] (max 3, no conflicts)
- Batch 2: [Task 4] (depends on Task 1)

## Parallel Execution Rules

### Batch Formation

1. Group tasks into batches of up to 3
2. Ensure no two tasks in the same batch modify the same file
3. Respect task dependencies (dependencies must complete first)

### Subagent Dispatch

Each subagent receives:
- Task description
- List of files to modify
- TDD instructions
- Constraint: do not modify files outside its scope

### Conflict Handling

- Each subagent commits to the current branch
- If parallel edits conflict, subsequent batches rebase
- Unresolvable conflicts → stop and report

## Error Handling

### Subagent Statuses

| Status | Action |
|--------|--------|
| DONE | Continue to next task/batch |
| FAILED | Log error, continue other batches |
| BLOCKED | Stop batch, report blocker |

### Post-Batch Validation

After each batch:
1. Run tests for modified files
2. Check for type errors
3. Verify no regressions

### Final Validation

After all batches:
1. Run full test suite
2. Run `cforge validate`
3. Update tasks.md with completion status

## tasks.md Format

```markdown
# Tasks

## Batch 1 (Parallel)
- [ ] Task 1: Modify src/discovery/scanner.ts
  - Files: src/discovery/scanner.ts
  - Description: Add new scan strategy

- [ ] Task 2: Modify src/generator/templates.ts
  - Files: src/generator/templates.ts
  - Description: Add new template type

## Batch 2 (Serial)
- [ ] Task 3: Modify src/cli/generate.ts
  - Files: src/cli/generate.ts
  - Dependencies: Task 1, Task 2
  - Description: Integrate new scan strategy
```

## Implementation Plan

### Phase 1: Template Update

1. Modify `templates/skills/orchestrator/stages/implementation.md`
2. Add parallel detection instructions
3. Add batch formation logic
4. Add subagent dispatch format

### Phase 2: Testing

1. Add unit tests for file dependency detection
2. Add integration tests for parallel execution
3. Test edge cases (circular dependencies, missing files)

### Phase 3: Documentation

1. Update README with parallel execution guide
2. Add examples of tasks.md format
3. Document error handling behavior

## Success Criteria

- Independent tasks execute in parallel
- Dependent tasks execute serially
- No file conflicts between parallel subagents
- Full test suite passes after implementation
- User can observe parallel execution in logs

## Trade-offs

### Chosen Approach: File Path Detection

| Pros | Cons |
|------|------|
| Automatic, no user marking needed | May miss implicit dependencies |
| Simple to understand | Requires规范的 tasks.md 格式 |
| Works for most cases | Cannot handle shared imports |

### Alternative: Explicit Marking

Not chosen because:
- Adds cognitive load to task authoring
- Requires learning marker syntax
- Less automated

## Future Enhancements

1. **Explicit parallel markers**: Add `[P]` prefix for user override
2. **Import analysis**: Detect shared imports as dependencies
3. **Dynamic batching**: Adjust batch size based on task complexity
4. **Progress visualization**: Show parallel execution in real-time
