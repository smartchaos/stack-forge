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

- **Specs:** `.cforge/artifacts/specs/`
- **Git diff** against main branch

## Task

Review the implementation against the specification.

1. Read all specs from `.cforge/artifacts/specs/`
2. Get the git diff: `git diff main...HEAD`
3. Check each spec requirement is implemented
4. Look for SQL safety, race conditions, missing error handling, test gaps, spec deviations
5. Write review to `.cforge/artifacts/review.md`

## Output

- `.cforge/artifacts/review.md` — review report

## Completion

After writing review, confirm: "Review complete. Report written to .cforge/artifacts/review.md"
