---
name: brainstorm-{{workflow_name}}
description: "Brainstorm and refine the idea: {{description}}"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Brainstorm Stage

## Input

- **User Idea:** {{description}}

## Task

Refine the user's idea into a structured proposal. Follow the brainstorming methodology:

1. Ask clarifying questions one at a time
2. Understand purpose, constraints, success criteria
3. Propose 2-3 approaches with trade-offs
4. Present design in sections for approval
5. Write the final proposal

## Output

Write the completed proposal to: `.cforge/artifacts/proposal.md`

## Proposal Format

```markdown
# Proposal: {{description}}

## Overview
[One paragraph summary]

## Goals
- [List of goals]

## Non-Goals
- [List of non-goals]

## Approach
[Description of chosen approach]

## Alternatives Considered
[Other approaches with trade-offs]
```

## Completion

After writing the proposal, confirm: "Brainstorm complete. Proposal written to .cforge/artifacts/proposal.md"
