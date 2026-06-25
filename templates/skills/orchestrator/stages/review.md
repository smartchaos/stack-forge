---
name: review-{{workflow_name}}
description: "Review implementation against spec"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Review Stage

## Input

- **Specs:** `.cforge/artifacts/specs/` (feature workflow, if available)
- **Diagnosis:** `.cforge/artifacts/diagnosis.md` (bugfix workflow)
- **Git diff** against main branch

## Task

Review the implementation against the specification (feature) or diagnosis (bugfix).

1. Read available specs and/or diagnosis from `.cforge/artifacts/`
2. Get the git diff: `git diff main...HEAD`
3. Check each requirement is implemented (feature) or the fix addresses root cause (bugfix)
4. Look for SQL safety, race conditions, missing error handling, test gaps
5. Write review to `.cforge/artifacts/review.md`

## Output

- `.cforge/artifacts/review.md` — review report

## Completion

After writing review, confirm: "Review complete. Report written to .cforge/artifacts/review.md"
