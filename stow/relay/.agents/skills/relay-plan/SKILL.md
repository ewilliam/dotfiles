---
name: relay-plan
description: Use when creating, optimizing, or linting Relay implementation plans for slice-by-slice execution with relay.
---

# Relay Plan

Use this skill to write or revise implementation plans that Relay can execute one bounded slice at a time.

## Workflow

1. Read the repo instructions and the full plan before editing.
2. Structure work as phase-based plans.
3. Write one bounded top-level checkbox per runner slice.
4. Keep each slice small enough for one fresh execution session.
5. Run `relay lint-plan` before treating the plan as ready.

## Required Slice Details

Each top-level checkbox must include:

- exact files to create or modify
- acceptance criteria
- verification commands
- blocker conditions
- commit boundaries

## Relay Conventions

- Use the command name `relay`.
- Store runner state under `.relay`.
- Refer to the installed command as `~/.local/bin/relay`.
- Keep this skill installed at `~/.agents/skills/relay-plan/SKILL.md`.
- Preserve unrelated working-tree changes and make the plan say when to stop instead of guessing.
