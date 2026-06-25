---
name: diagnosis-{{workflow_name}}
description: "Diagnose the bug: reproduce, root cause, propose fix"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - codegraph_search
  - codegraph_context
  - codegraph_trace
  - codegraph_callees
  - codegraph_callers
context: fork
---

# Diagnosis Stage

## Input

- **Bug Report:** {{description}}

## Task

Diagnose the bug systematically. Follow this methodology:

1. **Reproduce** — Identify steps to reproduce the bug. Check logs, error messages, stack traces.
2. **Trace** — Use codegraph to trace the call path from entry point to failure. Find the exact location.
3. **Root Cause** — Determine why the bug occurs. Check edge cases, race conditions, null handling, type mismatches.
4. **Scope** — Assess impact: which users/features are affected? Is there data loss risk?
5. **Fix Proposal** — Propose 1-2 fix approaches with trade-offs. Prefer minimal, targeted fixes.

## Output

Write the completed diagnosis to: `.cforge/artifacts/diagnosis.md`

## Diagnosis Format

```markdown
# Diagnosis: {{description}}

## Summary
[One paragraph: what is the bug, what causes it, how to fix it]

## Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Observe: expected vs actual]

## Root Cause
[Technical explanation of why the bug occurs]

## Affected Scope
- Files: [list of files involved]
- Features: [which features are affected]
- Risk: [low/medium/high — data loss? security?]

## Fix Approach
[Description of chosen fix]

## Alternatives Considered
[Other approaches with trade-offs]
```

## Completion

After writing the diagnosis, confirm: "Diagnosis complete. Written to .cforge/artifacts/diagnosis.md"
