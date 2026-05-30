# Relay

Relay is a Bun + TypeScript CLI for running implementation plans one bounded slice at a time with `codex exec`.

It takes a Markdown plan, finds the first unchecked top-level checkbox task, runs Codex against that one task in an isolated git worktree, verifies the result, commits the slice, and repeats until the plan is complete or blocked.

## Commands

```bash
relay lint-plan --repo ~/Projects/dotfiles --plan docs/plans/feature.md
relay --repo ~/Projects/dotfiles --plan docs/plans/feature.md --verify "bun test tools/relay/test"
relay --repo ~/Projects/dotfiles --plan docs/plans/feature.md --final-verify "bun test tools/relay/test" --pr
relay --repo ~/Projects/dotfiles --plan docs/plans/feature.md --resume
relay install
```

For local development, run the entry point directly:

```bash
bun tools/relay/bin/relay.ts --help
bun test tools/relay/test
```

## Plan Shape

Relay plans are Markdown files with phase headings and one executable slice per top-level checkbox.

```markdown
# Feature name

## Phase 1: Foundation

- [ ] Add the first bounded change.
  - Files:
    - Create: `path/to/file.ts`
    - Modify: `path/to/other.ts`
  - Acceptance criteria:
    - The behavior is implemented and covered.
  - Verification commands:
    - `bun test path/to/test.ts`
  - Blockers:
    - Stop if required credentials or production access are needed.
  - Commit boundary:
    - `git add path/to/file.ts path/to/other.ts docs/plans/feature.md`
    - `git commit -m "feat: add first bounded change"`
```

`relay lint-plan` enforces the important parts of that structure:

- `P0` findings fail the plan.
- `P1` findings fail unless `--allow-lint-warnings` is passed.
- `P2` findings are advisory.

The installed `relay-plan` skill is the source of truth for authoring conventions. `relay install` restows it to `~/.agents/skills/relay-plan/SKILL.md`.

## Run Behavior

1. Relay lints the plan before doing any work.
2. It validates the source checkout and blocks on dirty state unless `--allow-dirty-base` is passed.
3. It derives a branch named `codex/<plan-slug>` and a worktree at `~/.codex/worktrees/<repo>/<plan-slug>`.
4. It copies the plan into the worktree and initializes `.relay/state.json`, `.relay/events.jsonl`, and `.relay/logs/`.
5. It runs Codex with a prompt scoped to the first unchecked task.
6. Codex must check off the completed task. If no `--verify` command is configured, the task must include a verification note.
7. Relay runs each `--verify` command in the worktree.
8. If Codex or slice verification fails, Relay allows one repair attempt for that task.
9. Relay commits the plan update and touched task files, then moves to the next unchecked task.
10. After all tasks are checked, Relay runs each `--final-verify` command.
11. With `--pr`, Relay pushes the branch and creates or reuses a GitHub pull request with `gh`.

The default Codex timeout is 45 minutes per task. Use `--codex-timeout 1h` to change it or `--codex-timeout 0` to disable it.

## State And Resume

Relay state lives in the worktree under `.relay/`; the runner adds `.relay/` to the worktree git exclude file so state and logs are not committed.

Use `--resume` to continue an existing run from its `.relay` state. Use `--force` to restart state for an existing run, but only when the worktree has no stale non-plan changes. `--resume` and `--force` cannot be combined.

Useful paths:

- Worktree: `~/.codex/worktrees/<repo>/<plan-slug>`
- Branch: `codex/<plan-slug>`
- State: `.relay/state.json`
- Event log: `.relay/events.jsonl`
- Codex and verification logs: `.relay/logs/`

## Installation

The stowed executable lives at `stow/relay/.local/bin/relay` and imports `tools/relay/bin/relay.ts`.

```bash
relay install
```

`relay install` runs GNU Stow for the `relay` package and manages:

- `~/.local/bin/relay`
- `~/.agents/skills/relay-plan`

## Requirements

- Bun for running the TypeScript entry point and tests.
- Git for worktrees, branches, status checks, and commits.
- Codex CLI for slice execution.
- GNU Stow for `relay install`.
- GitHub CLI authenticated with `gh auth status` when using `--pr`.

## Source Layout

| Path | Purpose |
| --- | --- |
| `bin/relay.ts` | Bun executable entry point. |
| `src/cli.ts` | Argument parsing, help text, and command dispatch. |
| `src/runner.ts` | Main slice loop, state transitions, verification, repair, and completion flow. |
| `src/codex.ts` | `codex exec` prompts, arguments, timeout handling, and task logs. |
| `src/git.ts` | Source checkout validation, worktree setup, commits, and pushes. |
| `src/lint.ts` | Relay plan linting rules and lint output formatting. |
| `src/plan.ts` | Markdown plan parsing and task identity logic. |
| `src/state.ts` | `.relay` state, events, logs, repair attempts, and PR records. |
| `src/verify.ts` | Slice and final verification command execution. |
| `src/pr.ts` | GitHub pull request body generation and `gh` integration. |
| `src/install.ts` | Stow-based installation for the CLI and `relay-plan` skill. |
| `test/` | Bun tests for CLI, runner, git, lint, state, verification, PR, install, and skill behavior. |
