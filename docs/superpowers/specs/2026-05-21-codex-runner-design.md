# Codex Runner Design

## Goal

Build a Bun-first `codex-runner` CLI in this dotfiles repo that can execute an implementation plan from start to finish without human intervention. The runner should optimize Codex context by splitting a plan into bounded slices, running each slice in a fresh `codex exec` session, committing completed work after each slice, attempting one automatic repair pass on failures, notifying on blockers/completion, and opening or updating a pull request when done.

## Design Summary

`codex-runner` is a headless orchestrator. It owns the worktree, branch, task queue, state, Codex process execution, verification, commits, notifications, push, and pull request creation. Codex owns only one bounded implementation slice at a time.

Plan design happens in Codex App before execution. A personal Codex skill guides agents to write runner-optimized plans, and the CLI provides `lint-plan` to validate that a plan is structured, bounded, and verifiable enough for unattended execution.

The CLI is implemented with Bun and TypeScript so it can run source files directly without a build step. It will live in this repo and be symlinked into `~/.local/bin`.

```text
tools/codex-runner/
  bin/codex-runner.ts
  src/
    cli.ts
    codex.ts
    git.ts
    lint.ts
    notify.ts
    plan.ts
    pr.ts
    runner.ts
    state.ts
  test/
    lint.test.ts
    plan.test.ts
    runner.test.ts
    git.test.ts

~/.local/bin/codex-runner -> /Users/ewilliam/Projects/dotfiles/tools/codex-runner/bin/codex-runner.ts
```

OpenTUI is intentionally deferred. The runner writes durable state and event logs so a future `codex-runner tui` command can watch the same files, but the v1 execution path remains headless and scriptable.

## CLI

Primary command:

```bash
codex-runner --repo /path/to/repo --plan docs/plans/feature.md --pr
```

Core options:

- `--repo <path>`: Source repository to work from. Defaults to the current directory.
- `--plan <path>`: Plan file, relative to the source repo or absolute.
- `--pr`: Push the runner branch and open or update a pull request after all slices pass.
- `--verify <command>`: Verification command to run after every slice. Repeatable.
- `--final-verify <command>`: Verification command to run before PR creation. Repeatable.
- `--resume`: Continue from an existing runner state directory.
- `--force`: Remove or overwrite existing runner state for the same repo and plan.
- `--allow-dirty-base`: Permit starting from a source checkout with uncommitted changes.
- `--allow-lint-warnings`: Permit runner execution when `lint-plan` reports P1 findings. P0 findings always stop execution.
- `--notify-each-slice`: Send a local notification after every committed slice.

Plan quality command:

```bash
codex-runner lint-plan --repo /path/to/repo --plan docs/plans/feature.md
```

`lint-plan` validates that a Codex App-authored plan is safe and well shaped for runner execution before the runner starts an unattended worktree run.

Secondary commands may be added after v1:

```bash
codex-runner status --repo /path/to/repo --plan docs/plans/feature.md
codex-runner tui --repo /path/to/repo --plan docs/plans/feature.md
```

## Codex App Plan Design

Plans should be designed in Codex App through a personal skill named `codex-runner-plan`. The skill is not a replacement for conversation, design review, or judgment. It gives Codex App a strict output contract for plans that the runner can execute reliably.

Plan authoring workflow:

1. The user discusses the goal, constraints, and success criteria in Codex App.
2. Codex App reads the target repo's instruction files, existing docs, tests, and relevant code.
3. Codex App proposes the implementation shape and resolves ambiguity with the user.
4. Codex App writes a runner-optimized plan to `docs/plans/YYYY-MM-DD-<slug>.md`.
5. Codex App runs `codex-runner lint-plan --repo <repo> --plan <plan>`.
6. The user reviews and approves the plan.
7. `codex-runner --repo <repo> --plan <plan> --pr` executes the approved plan.

The plan skill should produce:

- phase-based structure
- one bounded checkbox per future runner slice and commit
- explicit files, modules, or ownership boundaries per slice where discoverable
- acceptance criteria for each slice
- verification commands per phase, task, or final run
- stop conditions for unclear requirements, credentials, destructive operations, production deploys, or risky product decisions
- final verification and pull request checklist

The skill should avoid:

- giant tasks such as "implement the feature"
- vague tasks such as "clean this up" or "handle edge cases"
- hidden dependencies on previous Codex session memory
- tasks that require manual credentials or user decisions without a blocker rule
- non-runner checkbox structures that the parser cannot track

The plan should be executable from a fresh session at every slice. If a task needs context from prior work, that context must be present in the plan, committed files, or repo docs.

## Plan Linting

`lint-plan` is a local quality gate. It does not use an LLM in v1; it statically checks the plan structure and reports actionable findings with severity.

Lint severities:

- `P0`: The runner cannot safely execute the plan.
- `P1`: The runner can parse the plan, but unattended execution quality is likely poor.
- `P2`: The plan is executable but should be clearer.

P0 examples:

- no unchecked tasks
- no parseable checkbox tasks
- malformed nested checkbox structure that changes task identity unpredictably
- plan path is missing or outside the repo without an explicit override
- task text is empty

P1 examples:

- no `## Phase` sections
- task text is too broad, such as "implement auth" or "build the dashboard"
- task lacks acceptance criteria or an expected outcome
- task lacks file/module ownership hints
- plan has no verification commands or verification section
- plan includes manual secrets, production deploys, or destructive database operations without stop conditions

P2 examples:

- phase has too many tasks
- task text is long enough to suggest multiple responsibilities
- final PR checklist is missing
- commit boundaries are unclear

Example output:

```text
Plan lint failed: docs/plans/2026-05-21-billing.md

[P1] Phase 2 task 3 is too broad:
- [ ] Implement billing settings

Suggested split:
- [ ] Add billing settings route and load test
- [ ] Implement billing settings data query
- [ ] Implement billing settings form action
- [ ] Add UI component and focused component tests

[P1] Missing final verification section:
Add commands for final verification before PR.
```

Runner execution should run `lint-plan` automatically before creating the worktree. P0 findings stop execution. P1 findings stop execution unless `--allow-lint-warnings` is set. P2 findings warn but do not stop execution.

## Worktree And Branching

The runner creates an isolated git worktree under the existing Codex worktree root:

```text
~/.codex/worktrees/<repo-name>/<plan-slug>
```

Example:

```text
/Users/ewilliam/.codex/worktrees/atlas/restore-slack-feature-parity
```

The runner branch starts from the source repo's currently checked-out branch:

```text
codex/<plan-slug>
```

The source checkout remains untouched. All Codex sessions, edits, verification, commits, push, and PR creation happen inside the isolated worktree.

Startup behavior:

1. Resolve the source repo and plan path.
2. Read the source repo's current branch and `HEAD`.
3. Refuse unsafe dirty source state unless `--allow-dirty-base` is set.
4. Create or resume the isolated worktree.
5. Create or reuse the `codex/<plan-slug>` branch.
6. Write runner state under the worktree.

## Plan Parsing

The preferred plan shape is phase based:

```markdown
## Phase 1: Foundation

- [ ] Add parser tests
- [ ] Implement parser

## Phase 2: Runner Loop

- [ ] Add runner tests
- [ ] Implement runner loop
```

The runner executes one unchecked task at a time while preserving phase context. If no phase headings are present, it falls back to top-level unchecked checkboxes.

Each task gets a stable id derived from:

- phase order
- task order
- normalized checkbox text hash

After every Codex session, the runner re-parses the plan. This lets it detect checkbox completion, blocker notes, and task splitting. If Codex determines a task is too large, it may split that task into smaller unchecked subtasks in the plan, complete only the first safe subtask, and stop.

## Runner Lifecycle

The runner loop is:

1. Parse the plan.
2. Select the first incomplete task.
3. Start a fresh `codex exec` session scoped to that task.
4. Capture stdout/stderr and final output into a task log.
5. Re-parse the plan and inspect the git diff.
6. Run slice verification if configured.
7. Commit the completed slice when the task is complete and verification passes.
8. If verification fails, start one fresh repair session for the same task.
9. Commit the repaired slice if verification passes.
10. Stop with a blocker notification if the repair pass fails or the task remains blocked.
11. Continue until every parsed task is complete.
12. Run final verification.
13. Push and open or update a pull request when `--pr` is set.
14. Notify completion.

The runner must not rely on Codex session memory. All progress is persisted in the worktree through the plan, commits, state file, event log, and task logs.

## Codex Slice Prompt

Each slice uses a fresh `codex exec` prompt with explicit bounds:

```text
You are executing one codex-runner slice.

Repository: <worktree>
Plan: <plan path>
Current phase: <phase title>
Current task: <task checkbox text>

Rules:
- Read repo instructions and the full plan first.
- Complete only the current task.
- If the task is too large, split it into smaller unchecked subtasks in the plan, complete the first subtask only, and stop.
- Preserve unrelated changes.
- Update the plan checkbox and add a short verification note.
- Run the relevant tests/checks.
- Do not commit, push, or open a PR. The runner owns git.
- If blocked, write a concise blocker note in the plan and stop.
```

The repair prompt is also bounded:

```text
The previous slice failed verification.

You may only repair work for this same task.
Read the failure log and repo state.
Make the smallest fix, rerun verification, update the plan note, then stop.
Do not commit, push, or open a PR.
```

`codex exec` should run with `--cd <worktree>` and noninteractive approval settings appropriate for unattended execution on trusted machines.

## Completion Detection

A task is considered complete when:

- The relevant checkbox is checked after re-parsing the plan.
- `codex exec` exited successfully.
- There is a meaningful git diff or the task was explicitly documentation/state-only.
- Configured verification commands pass, or no runner-level verification is configured and the plan records slice verification.

A task is considered blocked when:

- Codex records a blocker note in the plan.
- `codex exec` exits unsuccessfully and no safe repair is available.
- Verification still fails after one repair pass.
- The runner detects unsafe git state, merge/rebase state, or branch/worktree mismatch.

## State And Logs

Runner state lives inside the isolated worktree:

```text
.codex-runner/
  state.json
  events.jsonl
  logs/
    001-add-parser-tests.log
    001-add-parser-tests.repair.log
```

`state.json` tracks:

- source repo path
- worktree path
- base branch and runner branch
- plan path
- parsed phases and tasks
- current task id
- completed task ids
- failed task ids
- repair attempts
- commits created
- verification commands and results
- PR URL when created

`events.jsonl` is append-only:

```jsonl
{"type":"task_started","taskId":"phase-1.task-2","time":"2026-05-21T17:00:00-07:00"}
{"type":"codex_finished","taskId":"phase-1.task-2","exitCode":0}
{"type":"commit_created","taskId":"phase-1.task-2","sha":"abc123"}
{"type":"repair_started","taskId":"phase-1.task-3"}
{"type":"blocked","taskId":"phase-1.task-3","reason":"verification failed after repair"}
```

Recovery behavior:

- `--resume` reads existing state, validates worktree and branch identity, and continues from the first incomplete task.
- Without `--resume`, the runner refuses to reuse an existing state directory.
- `--force` may remove or overwrite state for the same repo and plan, but should not remove unrelated worktrees.

## Verification

Verification is explicit when supplied:

```bash
codex-runner \
  --repo /path/to/repo \
  --plan docs/plans/feature.md \
  --verify "pnpm test" \
  --verify "pnpm check" \
  --final-verify "pnpm test && pnpm check" \
  --pr
```

Rules:

- Each `--verify` command runs after every slice and after the repair pass.
- Each `--final-verify` command runs after all tasks are complete and before PR creation.
- If no runner-level verification is supplied, each Codex slice is responsible for running relevant checks and recording them in the plan.
- The runner records command, exit code, duration, and log path for every verification run.

## Commits

The runner owns commits. Codex sessions must not commit.

Commit behavior:

- Commit after each completed slice.
- Use a concise message derived from the task text.
- Include the plan file when checkboxes or verification notes changed.
- Refuse to commit if the diff contains changes outside the task scope that Codex did not explain in the plan.
- Record commit SHA in `state.json` and `events.jsonl`.

Example commit messages:

```text
feat: add codex runner plan parser
test: cover codex runner resume state
fix: repair codex runner verification command handling
```

## Pull Request

When `--pr` is set and every task is complete:

1. Run final verification.
2. Push `codex/<plan-slug>`.
3. Check for an existing PR for the branch.
4. Reuse the existing PR if present.
5. Otherwise create a PR with `gh pr create`.

The PR title comes from the plan title. The PR body summarizes:

- completed phases
- commits created
- verification results
- known caveats or blocker history

The runner records the PR URL in state and sends a completion notification.

## Notifications

v1 uses local macOS notifications:

```bash
osascript -e 'display notification "..." with title "codex-runner"'
```

Notify when:

- the runner stops on a blocker
- verification still fails after repair
- the PR is created or updated
- the full plan completes
- each slice commits, only when `--notify-each-slice` is set

Slack, email, and OpenTUI notifications are deferred adapters.

## Error Handling

The runner should stop rather than guess when it encounters:

- source repo is not a git repo
- source branch cannot be determined
- source checkout is dirty and `--allow-dirty-base` is not set
- worktree path exists but does not match runner state
- branch already exists with incompatible state
- merge, rebase, cherry-pick, or bisect state is active
- Codex exits unsuccessfully twice for the same task
- verification fails after one repair pass
- `gh` is unavailable when `--pr` is requested

Errors should be written to `events.jsonl`, summarized in `state.json`, and sent as a local notification when useful.

## Tests

Use `bun test`.

Focused test coverage:

- plan linter reports missing phases, missing verification, broad tasks, and malformed checkboxes
- plan linter exits nonzero on P0 and P1 findings by default
- plan parser extracts phase/task structure
- parser falls back to top-level checkboxes
- task ids are stable across unrelated plan edits
- task splitting is detected after re-parse
- worktree path and branch names are derived safely
- runner refuses existing state without `--resume` or `--force`
- runner permits resume only when source/worktree/branch identity matches
- verification command results are persisted
- one repair pass is attempted and no more
- PR body is generated from state

Integration tests can use temporary git repos and a fake Codex executable that edits fixture plans.

## Bootstrap Integration

The dotfiles bootstrap should ensure Bun is installed and available. The `Brewfile` already includes Bun, but the setup scripts should verify `bun --version` after `brew bundle` and warn clearly if it is unavailable.

The bootstrap or install step should create:

```bash
ln -sf /Users/ewilliam/Projects/dotfiles/tools/codex-runner/bin/codex-runner.ts \
  /Users/ewilliam/.local/bin/codex-runner
```

The install should also create or update the personal planning skill:

```text
/Users/ewilliam/.agents/skills/codex-runner-plan/SKILL.md
```

That skill should trigger when the user asks to create, design, optimize, or lint a plan for `codex-runner`.

## Non-Goals

- No OpenTUI dashboard in v1.
- No Slack/email notification adapter in v1.
- No hosted service.
- No multi-agent parallel execution inside the runner.
- No noninteractive automatic plan generation in v1. Plans are designed conversationally in Codex App, then linted and executed by the runner.

## Implementation Constraint

Build v1 with Bun's standard APIs and no external runtime dependencies. Add a dependency only if a later implementation task demonstrates that the standard-library version would be materially less reliable or harder to test.
