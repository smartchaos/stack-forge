# Design: Plugin Curation & Health Check System

**Date:** 2026-06-24
**Status:** Approved
**Scope:** Registry overhaul + CLI healthcheck command

---

## Problem

Stack Forge is hardcoded to 4 providers (superpowers, openspec, gstack, claude-mem) that were chosen at project inception. Two of these are suboptimal for their stages:

- **openspec** for specification: CLI-based, no codebase awareness, lower adoption than alternatives
- **gstack** for review: less sophisticated than Anthropic's multi-agent code-review plugin

Additionally, there is no mechanism to detect when a plugin degrades, is uninstalled, or stops working after a Claude Code update.

## Goals

1. Replace underperforming providers with best-in-class alternatives per stage
2. Add a CLI healthcheck system to continuously monitor plugin health
3. Keep changes minimal — only modify registry YAML files and add one new CLI command

## Non-Goals

- Adding a plugin marketplace or custom provider registration API (future work)
- Runtime provider switching or priority competition (future work)
- External monitoring scripts or CI integration (future work)

---

## Part 1: Plugin Curation

### New Provider Matrix

| Stage | Old Provider | New Provider | Installs | Rationale |
|-------|-------------|-------------|----------|-----------|
| brainstorm | superpowers | superpowers (no change) | 855K | Gold standard. Socratic methodology, 821K+ installs. |
| specification | openspec | **feature-dev** | 233K | Anthropic official. 7-phase workflow with code-explorer agents for codebase-aware spec writing. |
| planning | superpowers | superpowers (no change) | 855K | Already best-in-class with writing-plans + executing-plans + subagent-driven-development. |
| implementation | builtin | builtin (no change) | — | Claude Code itself is the best executor. Superpowers adds TDD on top. |
| review | gstack | **code-review** | 383K | Anthropic official. 5 parallel agents, confidence scoring (0-100), 80-point threshold. Anthropic verified. |
| release | gstack | gstack (no change) | — | Still the best for PR/merge workflow. |

### Why These Replacements

**openspec → feature-dev:**
- feature-dev deploys `code-explorer` agents that trace execution paths and understand existing patterns before writing specs
- feature-dev deploys `code-architect` agents that propose multiple approaches with trade-offs
- openspec is a standalone CLI that operates on files without codebase awareness
- feature-dev has 233K installs (Anthropic verified) vs openspec's smaller community footprint

**gstack (review) → code-review:**
- code-review uses 5 parallel agents: 2x CLAUDE.md compliance, 1x bug detection, 1x git history analysis, 1x code comment verification
- Each finding scored 0-100, only issues ≥80 posted — dramatically reduces false positives
- gstack's review is a single-pass skill without confidence filtering
- code-review is Anthropic verified with 383K installs

**gstack (release) — kept:**
- No clearly better alternative for the release/PR stage
- gstack's shipping skills are still the best option

### Detection

Both new providers use `plugin_installed` detection (same as superpowers):

```yaml
feature-dev:
  detect:
    - type: plugin_installed
      name: "feature-dev"

code-review:
  detect:
    - type: plugin_installed
      name: "code-review"
```

This is already supported by `src/discovery/scanner.ts` which reads `~/.claude.json`.

---

## Part 2: Health Check System

### What to Monitor

| Check | How | Cost |
|-------|-----|------|
| **Installed** | Re-scan `~/.claude.json` + `~/.claude/skills/` + `.mcp.json` | Low |
| **Command exists** | Verify plugin's command is in detected plugins list | Low |
| **Skill directory intact** | Verify skill files exist at expected paths | Low |
| **Last verified** | Timestamp in `.cforge/health.json` | None |

### Registry: `registry/health-rules.yaml`

Defines per-provider health checks:

```yaml
superpowers:
  checks:
    - type: plugin_installed
      name: "superpowers"
    - type: skill_exists
      path: "~/.claude/skills/superpowers/"
  critical: true

feature-dev:
  checks:
    - type: plugin_installed
      name: "feature-dev"
  critical: true

code-review:
  checks:
    - type: plugin_installed
      name: "code-review"
  critical: true

gstack:
  checks:
    - type: skill_exists
      path: "~/.claude/skills/gstack/"
  critical: false

claude-mem:
  checks:
    - type: mcp_server_configured
      name: "claude-mem"
  critical: false
```

- `critical: true` — pipeline fails if this provider is missing
- `critical: false` — pipeline degrades gracefully (uses builtin fallback)

### Runtime Record: `.cforge/health.json`

```json
{
  "last_check": "2026-06-24T10:00:00Z",
  "stale_threshold_hours": 168,
  "providers": {
    "superpowers": {
      "status": "healthy",
      "last_verified": "2026-06-24T10:00:00Z"
    },
    "feature-dev": {
      "status": "healthy",
      "last_verified": "2026-06-24T10:00:00Z"
    },
    "code-review": {
      "status": "missing",
      "last_verified": null
    },
    "gstack": {
      "status": "healthy",
      "last_verified": "2026-06-24T10:00:00Z"
    }
  }
}
```

Status values: `healthy`, `degraded`, `missing`, `stale`

### CLI Command: `cforge healthcheck`

```
$ cforge healthcheck

Provider Health Check
━━━━━━━━━━━━━━━━━━━━
✓ superpowers     healthy    (checked 2h ago)
✓ feature-dev     healthy    (checked 2h ago)
✗ code-review     MISSING    (not installed)
✓ gstack          healthy    (checked 2d ago)
○ claude-mem      optional   (not configured)

1 provider needs attention.
Run: cforge init --fix
```

Staleness warning (if last_verified > stale_threshold_hours):
```
⚠ superpowers     stale      (checked 12 days ago — re-scan recommended)
```

### Integration Points

1. **`cforge init`** — After provider scanning, run healthcheck. Auto-install missing critical providers.
2. **`cforge run`** — Before pipeline starts, run lightweight healthcheck. Warn if critical providers are down, abort if any critical provider is missing.
3. **`cforge healthcheck`** — Standalone deep check with verbose output and staleness detection.

### Source Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `registry/health-rules.yaml` | **Create** | Health check rules per provider |
| `src/discovery/healthcheck.ts` | **Create** | Health check logic |
| `src/cli/healthcheck.ts` | **Create** | CLI command handler |
| `src/index.ts` | **Modify** | Register `healthcheck` command |
| `src/cli/init.ts` | **Modify** | Run healthcheck after scanning |
| `src/cli/run.ts` | **Modify** | Run lightweight healthcheck before pipeline |
| `registry/providers.yaml` | **Modify** | Replace openspec with feature-dev, add code-review |
| `registry/capabilities.yaml` | **Modify** | Update default_provider for specification and review |
| `registry/manifest.yaml` | **Modify** | Replace openspec entry, add code-review, update gstack |

---

## Migration

### Breaking Changes

- Users with existing `.cforge/config.yaml` will have stale provider mappings after upgrade
- The `cforge init` re-run will fix this automatically

### Migration Steps

1. Users run `cforge init` to re-scan and update provider mappings
2. `cforge update` will detect new providers and merge them
3. Existing workflows continue to work — stage templates are unchanged

---

## Success Criteria

1. `cforge init` detects feature-dev and code-review when installed
2. `cforge healthcheck` reports accurate status for all providers
3. `cforge run` warns/aborts when critical providers are missing
4. No regressions in existing brainstorm/planning/implementation/release stages
