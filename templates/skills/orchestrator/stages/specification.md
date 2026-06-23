---
name: specification-{{workflow_name}}
description: "Write specification from proposal"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Specification Stage

## Input

- **Proposal:** `.cforge/artifacts/proposal.md`

## Task

Read the proposal and write a formal specification.

1. Read `.cforge/artifacts/proposal.md`
2. Break down the proposal into discrete capabilities
3. For each capability, write a spec with requirements using normative language (SHALL, MUST)
4. Write specs to `.cforge/artifacts/specs/<capability>/spec.md`

## Output

- `.cforge/artifacts/specs/*/spec.md` — one per capability

## Completion

After writing all specs, confirm: "Specification complete. Specs written to .cforge/artifacts/specs/"
