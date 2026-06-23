---
name: release-{{workflow_name}}
description: "Prepare and ship the release"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Release Stage

## Input

- **Review:** `.cforge/artifacts/review.md`
- **Git branch** with implementation

## Task

Prepare the release.

1. Read `.cforge/artifacts/review.md` — verify no critical issues
2. Run tests one final time
3. Push branch: `git push origin <branch>`
4. Create PR with description from proposal and review

## Output

- PR created and ready for merge

## Completion

After PR is created, confirm: "Release complete. PR created at <url>"
