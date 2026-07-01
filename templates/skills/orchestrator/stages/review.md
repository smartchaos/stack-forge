---
name: review-{{workflow_name}}
description: "Multi-dimension review against spec with adversarial verification"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Agent
  - Task
context: fork
---

# Review Stage

## Input

- **Spec:** `.cforge/artifacts/spec.md` (feature workflow)
- **Plan:** `.cforge/artifacts/plan.md` (feature workflow)
- **Diagnosis:** `.cforge/artifacts/diagnosis.md` (bugfix workflow)
- **Implementation:** working tree changes

## Task

Execute a structured, multi-dimension review of the implementation against the specification. Do NOT skip dimensions — each catches different defect classes.

## Phase 1: Requirement Traceability

1. Read `.cforge/artifacts/spec.md` and extract every functional requirement
2. For each requirement, find the corresponding code that implements it
3. Record any requirement that has NO corresponding implementation
4. Record any code that exists but implements NO spec requirement (scope creep)

## Phase 2: Multi-Dimension Review

Launch parallel agents, one per dimension. Each agent receives the full diff and spec.

### Dimension A: Correctness
- Does the code do what the spec says?
- Are there logic errors, off-by-one, inverted conditions?
- Are data transformations correct (normalization, filtering, sorting)?
- Verify sort key semantics match spec (available first, coding desc, usage desc, ctx desc)

### Dimension B: Robustness
- Atomic file writes (no direct write without tempfile + rename)?
- TOCTOU race conditions (check-then-act without locking)?
- Thread safety in shared state (cache, usage tracking)?
- Graceful degradation on API failure (retry, fallback to stale cache)?
- Input validation (null checks, type coercion, empty collections)?
- Error propagation (are exceptions swallowed silently? are error messages actionable?)

### Dimension C: Data Integrity
- Cache corruption handling (JSON parse errors, partial writes)?
- State consistency between cache.json and usage.json?
- Cooldown expiry — is expired state persisted back to disk?
- Default values for missing fields (are they sensible? documented?)

### Dimension D: Spec Compliance
- Every MUST/SHALL requirement from spec is implemented
- API endpoints match spec (routes, methods, response shapes)
- CLI commands match spec (subcommands, flags, output format)
- Data model fields match spec
- Sorting algorithm matches spec (4-tier composite key)
- Fallback logic matches spec (try model[0] → 429 → cooldown 1h → try model[1])

## Phase 3: Adversarial Verification

For each finding from Phase 2:
1. Spawn an independent agent instructed to REFUTE the finding
2. The refuter reads the same code and argues against the finding
3. If the refuter successfully refutes, discard the finding
4. Only keep findings that survive adversarial scrutiny

## Phase 4: Severity Classification

Assign severity to each confirmed finding:

| Severity | Criteria |
|----------|----------|
| 🔴 Critical | Data loss, data corruption, security vulnerability, crash on normal use |
| 🟡 Major | Incorrect behavior under specific conditions, missing spec requirement |
| 🟢 Minor | Code quality, unused imports, style inconsistencies |

## Phase 5: Write Report

Write `.cforge/artifacts/review.md` with this structure:

```markdown
# Review Report

## Summary
- {N} requirements checked, {M} implemented, {K} missing
- {X} findings: {critical} critical, {major} major, {minor} minor

## Requirement Traceability

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | ... | ✅ / ❌ / ⚠️ | file:line |

## Findings

### 🔴 Critical
- **{title}** — {description}
  - File: `path:line`
  - Fix: {concrete fix}

### 🟡 Major
- ...

### 🟢 Minor
- ...

## Verification
- {N} findings survived adversarial verification
- {M} findings refuted and discarded
```

## Completion

After writing review, confirm: "Review complete. {N} findings ({critical} critical, {major} major, {minor} minor). Report written to .cforge/artifacts/review.md"
