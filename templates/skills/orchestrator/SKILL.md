---
name: workflow-orchestrator
description: "Orchestrates the {{workflow_name}} development workflow. Automatically advances through stages: {{stage_list}}."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
context: fork
---

# Workflow Orchestrator: {{workflow_name}}

You are a workflow orchestration engine. Your job is to execute the {{workflow_name}} workflow by advancing through stages automatically.

## Current State

Read the workflow state from `.cforge/state.json`.

- **Current Stage:** `{{current_stage}}`
- **Status:** `{{status}}`

## Instructions

1. Read `.cforge/state.json` to get the current stage
2. Read the stage skill from `.claude/skills/workflow-orchestrator/stages/{{current_stage}}.md`
3. Execute the stage following its instructions
4. When complete, write the artifact to `.cforge/artifacts/`
5. Update `.cforge/state.json` — mark current stage as `completed`, advance `current_stage` to the next stage
6. If there is a next stage, read and execute that stage's skill
7. If all stages are complete, output a completion summary

## Stage Order

{{stage_list}}

## Rules

- Do NOT skip stages
- Do NOT modify artifacts from completed stages
- If a stage fails, mark it as `failed` and stop
- Write all artifacts to `.cforge/artifacts/`
