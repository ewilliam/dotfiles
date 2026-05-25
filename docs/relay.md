# Relay Guide

Relay is a Bun + TypeScript CLI for running implementation plans one bounded slice at a time. It creates an isolated git worktree, asks `codex exec` to complete the next unchecked plan task, runs verification, commits the completed slice, and optionally pushes a pull request when the plan is done.

Use it for plans that are already split into small, verifiable implementation steps. Do not use it for exploratory work that still needs design decisions.

## Install

Relay is managed as a Stow package in this repo.

```bash
cd ~/Projects/dotfiles
relay install
```

`relay install` restows `stow/relay`, which installs:

- `~/.local/bin/relay`
- `~/.agents/skills/relay-plan`

When the installed command is not available yet, run the entrypoint directly:

```bash
bun tools/relay/bin/relay.ts --help
```

Prerequisites:

- Bun, Git, and Stow are installed by the dotfiles bootstrap.
- `codex` must be installed and authenticated before running implementation slices.
- `gh` must be installed and authenticated before using `--pr`.

## Plan Shape

Relay treats every top-level checkbox as one executable slice. Nested checkboxes are not executable tasks and cause a lint error.

Use this structure:

```markdown
# Feature Plan

## Phase 1: Foundation

- [ ] Add the storage module.
  - Files:
    - Create: `/absolute/path/src/storage.ts`
    - Create: `/absolute/path/test/storage.test.ts`
  - Acceptance criteria:
    - Storage reads and writes records through the existing interface.
  - Verification commands:
    - `bun test test/storage.test.ts`
  - Blockers:
    - Stop if the existing interface is incompatible with the plan.
  - Commit boundary:
    - `git add src/storage.ts test/storage.test.ts docs/plans/feature.md`
    - `git commit -m "feat: add storage module"`

## Final PR Checklist

- All planned slices are checked.
- Final verification passes.
- The runner branch is ready for review.
```

Each top-level task should include:

- Exact files to create, modify, or delete.
- Acceptance criteria.
- Verification commands.
- Blocker conditions that tell Relay when to stop.
- A commit boundary.

Keep a slice small enough for one fresh Codex session. If a task proves too large, Relay allows Codex to split the current checkbox into multiple replacement top-level checkboxes, complete only the first replacement, and leave the rest unchecked.

## Lint A Plan

Run the linter before handing a plan to Relay:

```bash
relay lint-plan --repo ~/Projects/dotfiles --plan docs/plans/2026-05-21-relay.md
```

Lint severities:

- `P0`: Always blocks. Examples: missing plan file, no parseable tasks, nested checkbox tasks.
- `P1`: Blocks by default. Examples: missing phase headings, missing files, missing acceptance criteria, missing verification commands, risky operations without stop conditions.
- `P2`: Warning. Examples: long task text, unclear commit boundary, missing final PR checklist.

Use `--allow-lint-warnings` only when the remaining `P1` findings are intentional:

```bash
relay lint-plan --repo ~/Projects/dotfiles --plan docs/plans/feature.md --allow-lint-warnings
```

## Run A Plan

Basic run:

```bash
relay --repo ~/Projects/dotfiles \
  --plan docs/plans/feature.md \
  --verify "bun test tools/relay/test"
```

Full run with final verification and PR creation:

```bash
relay --repo ~/Projects/dotfiles \
  --plan docs/plans/feature.md \
  --verify "bun test tools/relay/test" \
  --final-verify "bun test tools/relay/test" \
  --pr
```

Useful options:

- `--verify <command>` runs after each completed slice and before that slice is committed. It is repeatable.
- `--final-verify <command>` runs after every task is complete and before PR creation. It is repeatable.
- `--codex-timeout <duration>` bounds each Codex slice. The default is `45m`; pass `0` only when you intentionally want no timeout.
- `--pr` pushes the runner branch and opens or reuses a GitHub pull request.
- `--notify-each-slice` sends a macOS notification after every committed slice.
- `--allow-dirty-base` permits a dirty source checkout when you have intentionally approved that state.

The source checkout must not be in a merge, rebase, cherry-pick, or bisect state.

## What Relay Does

For each run, Relay:

1. Lints the plan.
2. Validates the source git checkout.
3. Creates or resumes an isolated worktree at `~/.codex/worktrees/<repo-name>/<plan-slug>`.
4. Copies the source plan into the worktree, unless `--resume` is used.
5. Stores state under `.relay/` inside the isolated worktree.
6. Runs `codex exec` for the first unchecked top-level task.
7. Requires Codex to check the completed task; the prompt also tells Codex to add a verification note.
8. Runs each `--verify` command from the isolated worktree.
9. Attempts one repair session for a failed Codex run or failed slice verification.
10. Commits the slice from the isolated worktree.
11. Repeats until all tasks are checked.
12. Runs final verification and creates or updates the PR when requested.

Relay owns git during the run. The Codex slice prompt explicitly tells Codex not to commit, push, or open a PR.

If no `--verify` command is configured, Relay accepts a completed slice only when that task has a `Verification note:` in its details. Prefer explicit `--verify` commands for unattended runs.

## State And Logs

Relay state lives in the isolated worktree:

```text
.relay/
|-- state.json
|-- events.jsonl
|-- logs/
`-- pr-body.md
```

Important files:

- `.relay/state.json` records source repo, base branch, runner branch, current task, completed task IDs, commits, verification results, and PR URL.
- `.relay/events.jsonl` records task starts, Codex results, verification results, commits, blockers, PR readiness, and completion.
- `.relay/logs/` stores Codex, repair, slice verification, and final verification logs.
- `.relay/pr-body.md` is written before `gh pr create` or PR reuse.

Relay adds `.relay/` to the isolated worktree's git exclude file so runner state is not committed.

## Resume Or Replace A Run

If a matching Relay worktree already exists, a normal run stops before reusing it.

Resume the existing run:

```bash
relay --repo ~/Projects/dotfiles \
  --plan docs/plans/feature.md \
  --verify "bun test tools/relay/test" \
  --resume
```

Start over with the existing Relay state only when the worktree has no stale non-plan changes:

```bash
relay --repo ~/Projects/dotfiles \
  --plan docs/plans/feature.md \
  --verify "bun test tools/relay/test" \
  --force
```

Relay validates that the state matches the same source repo, worktree path, runner branch, and plan path before resuming.

## Blockers

Relay blocks instead of guessing when:

- The plan fails lint policy.
- The source checkout is dirty without `--allow-dirty-base`.
- The source checkout is in an active git operation.
- The isolated worktree has pre-existing non-plan changes.
- A task has a `BLOCKED:` note.
- Codex exits nonzero and repair cannot safely proceed.
- The task remains unchecked after Codex exits 0.
- Slice verification fails after the repair attempt.
- Verification changes files in the worktree.
- Final verification fails.
- `gh` is unavailable or unauthenticated during `--pr`.

When blocked, inspect `.relay/state.json`, `.relay/events.jsonl`, and the relevant file in `.relay/logs/`, fix the issue, then rerun with `--resume`.

## Command Reference

```text
relay [options]
relay lint-plan --plan <path> [options]
relay install
```

Options:

```text
--repo <path>              Source repository. Defaults to the current directory.
--plan <path>              Plan file relative to the repo, or absolute.
--pr                       Push and open or update a pull request.
--codex-timeout <duration>  Codex slice timeout like 45m, 1h, or 0 to disable.
--verify <command>         Per-slice verification command. Repeatable.
--final-verify <command>   Final verification command. Repeatable.
--resume                   Continue from an existing .relay state directory.
--force                    Overwrite existing .relay state for the same run.
--allow-dirty-base         Permit a dirty source checkout.
--allow-lint-warnings      Permit P1 lint findings.
--notify-each-slice        Notify after each committed slice.
--help                     Show help.
```
