import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseRelayArgs, runCli } from "../src/cli";
import { runCommand } from "../src/shell";
import { readRelayEvents, readRelayState } from "../src/state";
import type {
  CodexExecutionResult,
  CommandExecutor,
  RelayProgressEvent,
  RelayNotification,
  RunCodexExecInput,
} from "../src/types";
import { runRelay } from "../src/runner";
import { makeTempDir, removeTempDir } from "./helpers";

const tempDirs: string[] = [];

function tempDir(prefix?: string): string {
  const dir = makeTempDir(prefix);
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    removeTempDir(dir);
  }
});

describe("relay runner loop", () => {
  test("runs lint-plan before worktree creation and blocks P0 and P1 findings", async () => {
    const repoPath = tempDir("relay-runner-lint-");
    const homeDir = tempDir("relay-runner-home-");
    mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
    writeFileSync(
      path.join(repoPath, "docs", "plans", "relay.md"),
      "# Weak plan\n\n## Phase 1: Weak\n\n- [ ] Implement feature\n",
    );

    const result = await runRelay({
      allowDirtyBase: false,
      allowLintWarnings: false,
      command: "run",
      finalVerifyCommands: [],
      force: false,
      notifyEachSlice: false,
      planPath: "docs/plans/relay.md",
      pr: false,
      repoPath,
      resume: false,
      verifyCommands: [],
    }, {
      homeDir,
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("Plan lint failed");
    expect(pathExists(path.join(homeDir, ".codex", "worktrees"))).toBe(false);

    const missingPlan = await runRelay({
      ...baseRunOptions(repoPath, "docs/plans/missing.md"),
      verifyCommands: [],
    }, {
      homeDir,
    });
    expect(missingPlan).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(missingPlan.message).toContain("Plan file does not exist");
    expect(pathExists(path.join(homeDir, ".codex", "worktrees"))).toBe(false);
  });

  test("continues past P1 lint findings when allowLintWarnings is true", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(weakP1Plan());
    const codexCalls: string[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      allowLintWarnings: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(codexCalls).toEqual(["Implement feature"]);
  });

  test("prints the runner result message from the default CLI handler", async () => {
    const repoPath = tempDir("relay-runner-cli-");
    mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
    writeFileSync(
      path.join(repoPath, "docs", "plans", "relay.md"),
      "# Weak plan\n\n## Phase 1: Weak\n\n- [ ] Implement feature\n",
    );
    const output: string[] = [];

    const exitCode = await runCli([
      "--repo",
      repoPath,
      "--plan",
      "docs/plans/relay.md",
    ], {
      stderr: (message) => output.push(`stderr:${message}`),
      stdout: (message) => output.push(`stdout:${message}`),
    });

    expect(exitCode).toBe(1);
    expect(output.join("\n")).toContain("Plan lint failed");
  });

  test("parses allow-dirty-base for real CLI runs", async () => {
    const options = parseRelayArgs([
      "--repo",
      "/repo",
      "--plan",
      "docs/plans/relay.md",
      "--allow-dirty-base",
    ]);

    expect(options.allowDirtyBase).toBe(true);
  });

  test("copies a dirty source plan into the worktree when dirty base is allowed", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(
      oneTaskPlan("Wire committed source slice"),
    );
    writeFileSync(path.join(repoPath, planPath), oneTaskPlan("Wire dirty source plan"));
    const codexCalls: string[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      allowDirtyBase: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(codexCalls).toEqual(["Wire dirty source plan"]);
    expect(readFileSync(path.join(worktreePath, planPath), "utf8")).toContain(
      "- [x] Wire dirty source plan",
    );
    expect(readFileSync(path.join(repoPath, planPath), "utf8")).toContain(
      "- [ ] Wire dirty source plan",
    );
  });

  test("uses an absolute plan path only for source reads and edits the worktree plan", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const sourcePlanPath = path.join(repoPath, planPath);
    const sourcePlanBefore = readFileSync(sourcePlanPath, "utf8");

    const result = await runRelay(baseRunOptions(repoPath, sourcePlanPath), {
      homeDir,
      runCodex: createCompletingCodex([]),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(readFileSync(sourcePlanPath, "utf8")).toBe(sourcePlanBefore);
    expect(readFileSync(path.join(worktreePath, planPath), "utf8")).toContain(
      "- [x] Wire first runner slice",
    );
  });

  test("passes a default timeout to Codex slice execution", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const timeouts: Array<number | undefined> = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        timeouts.push(input.timeoutMs);
        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(timeouts).toEqual([expect.any(Number)]);
    expect(timeouts[0]).toBeGreaterThan(0);
  });

  test("emits progress milestones for a successful multi-task run", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(twoTaskPlan());
    const progress: RelayProgressEvent[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      finalVerifyCommands: [
        "test -f src/wire-first-runner-slice.txt && test -f src/wire-second-runner-slice.txt",
      ],
      verifyCommands: ["test -f src/runner-output.txt"],
    }), {
      homeDir,
      progress: (event) => {
        progress.push(event);
      },
      runCodex: createCompletingCodex([]),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(progress.map((event) => event.type)).toEqual([
      "lint_started",
      "lint_passed",
      "git_checked",
      "worktree_ready",
      "state_ready",
      "task_started",
      "codex_finished",
      "verification_finished",
      "commit_created",
      "task_started",
      "codex_finished",
      "verification_finished",
      "commit_created",
      "final_verification_started",
      "final_verification_finished",
      "completed",
    ]);
    expect(progress.find((event) => event.type === "task_started")).toMatchObject({
      taskOrdinal: 1,
      taskTotal: 2,
      taskText: "Wire first runner slice",
    });
    expect(progress.filter((event) => event.type === "commit_created").at(-1)).toMatchObject({
      completedTaskCount: 2,
      taskTotal: 2,
    });
    expect(progress.at(-1)).toMatchObject({
      message: "Relay run completed.",
    });
  });

  test("emits progress when plan lint blocks before relay state exists", async () => {
    const repoPath = tempDir("relay-runner-progress-lint-");
    const homeDir = tempDir("relay-runner-progress-home-");
    mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
    writeFileSync(
      path.join(repoPath, "docs", "plans", "relay.md"),
      "# Weak plan\n\n## Phase 1: Weak\n\n- [ ] Implement feature\n",
    );
    const progress: RelayProgressEvent[] = [];

    const result = await runRelay(baseRunOptions(repoPath, "docs/plans/relay.md", {
      verifyCommands: [],
    }), {
      homeDir,
      progress: (event) => {
        progress.push(event);
      },
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(progress.map((event) => event.type)).toEqual([
      "lint_started",
      "lint_failed",
      "blocked",
    ]);
    expect(progress.at(-1)?.message).toContain("Plan lint failed");
  });

  test("invokes fake Codex slices, verifies, commits, records SHAs, and continues to the next task", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(twoTaskPlan());
    const codexCalls: string[] = [];
    const gitCalls: string[][] = [];
    const executor: CommandExecutor = async (spec) => {
      if (spec.command === "git") {
        gitCalls.push(spec.args ?? []);
      }
      return runCommand(spec);
    };
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      finalVerifyCommands: [
        "test -f src/wire-first-runner-slice.txt && test -f src/wire-second-runner-slice.txt",
      ],
      notifyEachSlice: true,
      verifyCommands: ["test -f src/runner-output.txt"],
    }), {
      executor,
      homeDir,
      notify: async (notification) => {
        notifications.push(notification);
      },
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(result.commits).toHaveLength(2);
    expect(result.commits?.map((commit) => commit.sha)).toEqual([
      expect.stringMatching(/^[a-f0-9]{40}$/),
      expect.stringMatching(/^[a-f0-9]{40}$/),
    ]);
    expect(codexCalls).toEqual([
      "Wire first runner slice",
      "Wire second runner slice",
    ]);

    const state = readRelayState(worktreePath);
    expect(state.completedTaskIds).toHaveLength(2);
    expect(state.commits.map((commit) => commit.sha)).toEqual(result.commits?.map((commit) => commit.sha));
    expect(state.currentTaskId).toBeUndefined();
    expect(state.verificationResults.map((verification) => verification.command)).toEqual([
      "test -f src/runner-output.txt",
      "test -f src/runner-output.txt",
      "test -f src/wire-first-runner-slice.txt && test -f src/wire-second-runner-slice.txt",
    ]);
    expect(gitCalls.some((args) => args.includes("diff") && args.includes("--name-only"))).toBe(true);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toBe("");
    expect(notifications.map((notification) => notification.kind)).toEqual([
      "committed",
      "committed",
      "completed",
    ]);

    const events = readRelayEvents(worktreePath);
    expect(events.map((event) => event.type)).toContain("task_started");
    expect(events.map((event) => event.type)).toContain("codex_finished");
    expect(events.map((event) => event.type)).toContain("verification_finished");
    expect(events.map((event) => event.type)).toContain("commit_created");
    expect(events.at(-1)?.type).toBe("completed");

    const committedFiles = await gitStdout(worktreePath, [
      "show",
      "--name-only",
      "--format=",
      "HEAD",
    ]);
    expect(committedFiles).toContain("docs/plans/relay.md");
    expect(committedFiles).toContain("src/wire-second-runner-slice.txt");
  });

  test("stops with a blocker when Codex exits zero but the task remains unchecked", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      notify: async (notification) => {
        notifications.push(notification);
      },
      runCodex: async (input) => {
        writeRunnerOutput(input, "unchecked");
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("remained unchecked");
    const state = readRelayState(worktreePath);
    expect(state.failedTaskIds).toEqual([state.tasks[0].id]);
    expect(readRelayEvents(worktreePath).at(-1)).toMatchObject({
      type: "blocked",
    });
    expect(notifications.map((notification) => notification.kind)).toEqual(["blocked"]);
  });

  test("inspects the slice diff before verification can create additional files", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["printf verify > src/verify-output.txt"],
    }), {
      homeDir,
      runCodex: createCompletingCodex([]),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("changed during slice verification");
    const committedFiles = await gitStdout(worktreePath, [
      "show",
      "--name-only",
      "--format=",
      "HEAD",
    ]);
    expect(committedFiles).not.toContain("src/verify-output.txt");
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/verify-output.txt");
  });

  test("blocks before the next task when slice verification dirties the worktree", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(twoTaskPlan());
    const codexCalls: string[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["printf verify > src/verify-output.txt"],
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("changed during slice verification");
    expect(codexCalls).toEqual(["Wire first runner slice"]);
    expect(readRelayState(worktreePath).commits).toHaveLength(0);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/verify-output.txt");
  });

  test("runs one repair session after failed slice verification and commits the repaired slice", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const codexCalls: Array<{ failureLogPath?: string; repair?: boolean; task: string }> = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["test -f src/repaired-output.txt"],
    }), {
      homeDir,
      runCodex: async (input) => {
        codexCalls.push({
          failureLogPath: input.failureLogPath,
          repair: input.repair,
          task: input.task.text,
        });
        if (input.repair) {
          expect(input.failureLogPath).toContain(`verify-${input.task.id}-1.log`);
          writeRunnerOutput(input, "repaired", "repaired-output.txt");
          return fakeCodexResult(input, { ok: true });
        }

        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(codexCalls).toEqual([
      {
        failureLogPath: undefined,
        repair: undefined,
        task: "Wire first runner slice",
      },
      {
        failureLogPath: path.join(
          worktreePath,
          ".relay",
          "logs",
          `verify-${readRelayState(worktreePath).tasks[0].id}-1.log`,
        ),
        repair: true,
        task: "Wire first runner slice",
      },
    ]);

    const state = readRelayState(worktreePath);
    expect(state.repairAttempts).toEqual({
      [state.tasks[0].id]: 1,
    });
    expect(state.commits).toHaveLength(1);
    expect(state.verificationResults.map((verification) => verification.passed)).toEqual([
      false,
      true,
    ]);
    expect(readRelayEvents(worktreePath).map((event) => event.type)).toContain("repair_started");
    expect(await gitStdout(worktreePath, ["status", "--short"])).toBe("");
  });

  test("hard-stops after one failed repair verification without a second repair", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const codexCalls: Array<{ repair?: boolean; task: string }> = [];
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["test -f src/never-created.txt"],
    }), {
      homeDir,
      notify: async (notification) => {
        notifications.push(notification);
      },
      runCodex: async (input) => {
        codexCalls.push({
          repair: input.repair,
          task: input.task.text,
        });
        if (input.repair) {
          writeRunnerOutput(input, "repair-still-fails", "repair-output.txt");
          return fakeCodexResult(input, { ok: true });
        }

        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    const state = readRelayState(worktreePath);
    expect(result).toMatchObject({
      blockedTaskId: state.tasks[0].id,
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("Wire first runner slice");
    expect(result.message).toContain(`verify-${state.tasks[0].id}-1-2.log`);
    expect(codexCalls).toEqual([
      {
        repair: undefined,
        task: "Wire first runner slice",
      },
      {
        repair: true,
        task: "Wire first runner slice",
      },
    ]);
    expect(state.repairAttempts).toEqual({
      [state.tasks[0].id]: 1,
    });
    expect(state.failedTaskIds).toEqual([state.tasks[0].id]);
    expect(state.commits).toHaveLength(0);
    expect(readRelayEvents(worktreePath).filter((event) => event.type === "repair_started")).toHaveLength(1);
    expect(notifications.at(-1)).toMatchObject({
      kind: "blocked",
      message: expect.stringContaining(`verify-${state.tasks[0].id}-1-2.log`),
    });
  });

  test("repairs an unsuccessful Codex slice only when a safe diff keeps task context intact", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const codexCalls: Array<{ failureLogPath?: string; repair?: boolean; task: string }> = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        codexCalls.push({
          failureLogPath: input.failureLogPath,
          repair: input.repair,
          task: input.task.text,
        });
        if (input.repair) {
          completeTask(input);
          return fakeCodexResult(input, { ok: true });
        }

        writeRunnerOutput(input, "partial", "partial-output.txt");
        return fakeCodexResult(input, { ok: false });
      },
    });

    const state = readRelayState(worktreePath);
    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(codexCalls).toEqual([
      {
        failureLogPath: undefined,
        repair: undefined,
        task: "Wire first runner slice",
      },
      {
        failureLogPath: path.join(worktreePath, ".relay", "logs", "wire-first-runner-slice.log"),
        repair: true,
        task: "Wire first runner slice",
      },
    ]);
    expect(state.repairAttempts).toEqual({
      [state.tasks[0].id]: 1,
    });
    expect(state.commits).toHaveLength(1);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toBe("");
  });

  test("reports timed out Codex slices explicitly", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const progress: RelayProgressEvent[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      progress: (event) => {
        progress.push(event);
      },
      runCodex: async (input) => fakeCodexResult(input, {
        ok: false,
        timedOut: true,
      }),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("timed out");
    expect(progress.map((event) => event.type)).toContain("codex_finished");
    expect(progress.at(-1)).toMatchObject({
      type: "blocked",
    });
  });

  test("emits progress for repair attempts and failed verification", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const progress: RelayProgressEvent[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["test -f src/never-created.txt"],
    }), {
      homeDir,
      progress: (event) => {
        progress.push(event);
      },
      runCodex: async (input) => {
        if (input.repair) {
          writeRunnerOutput(input, "repair-still-fails", "repair-output.txt");
          return fakeCodexResult(input, { ok: true });
        }

        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(progress.map((event) => event.type)).toContain("repair_started");
    expect(progress.filter((event) => event.type === "verification_finished")).toHaveLength(2);
    expect(progress.filter((event) => event.type === "verification_finished").at(-1)).toMatchObject({
      passed: false,
    });
    expect(progress.at(-1)).toMatchObject({
      type: "blocked",
    });
  });

  test("resume blocks before starting the next task when stale dirty files remain", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(twoTaskPlan());
    const firstRun = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["printf verify > src/verify-output.txt"],
    }), {
      homeDir,
      runCodex: createCompletingCodex([]),
    });
    expect(firstRun).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });

    const codexCalls: string[] = [];
    const resumed = await runRelay(baseRunOptions(repoPath, planPath, {
      resume: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(resumed).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(resumed.message).toContain("pre-existing non-plan changes");
    expect(codexCalls).toEqual([]);
    expect(readRelayState(worktreePath).commits).toHaveLength(0);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/verify-output.txt");
  });

  test("blocks when slice verification mutates an already-touched file", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["printf verify > src/runner-output.txt"],
    }), {
      homeDir,
      runCodex: createCompletingCodex([]),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("changed during slice verification");
    expect(readRelayState(worktreePath).commits).toHaveLength(0);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/runner-output.txt");
  });

  test("blocks force restarts when the existing worktree has stale non-plan changes", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const blocked = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        writeRunnerOutput(input, "stale", "stale-output.txt");
        return fakeCodexResult(input, { ok: false });
      },
    });
    expect(blocked.status).toBe("blocked");
    const stateBeforeForce = readRelayState(worktreePath);
    const eventsBeforeForce = readRelayEvents(worktreePath);

    const codexCalls: string[] = [];
    const forced = await runRelay(baseRunOptions(repoPath, planPath, {
      force: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(forced).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(forced.message).toContain("stale non-plan changes");
    expect(codexCalls).toEqual([]);
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/stale-output.txt");
    expect(readRelayState(worktreePath)).toEqual(stateBeforeForce);
    expect(readRelayEvents(worktreePath)).toEqual(eventsBeforeForce);
  });

  test("plain rerun rejects existing state before overwriting the worktree plan", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const firstRun = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        const plan = readFileSync(input.planPath, "utf8");
        writeFileSync(
          input.planPath,
          plan.replace(
            `- [ ] ${input.task.text}`,
            `- [ ] ${input.task.text}\n  - BLOCKED: keep this note`,
          ),
        );
        return fakeCodexResult(input, { ok: true });
      },
    });
    expect(firstRun).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    const worktreePlanBefore = readFileSync(path.join(worktreePath, planPath), "utf8");
    expect(worktreePlanBefore).toContain("BLOCKED: keep this note");

    const codexCalls: string[] = [];
    const rerun = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(rerun).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(rerun.message).toContain("--resume or --force");
    expect(codexCalls).toEqual([]);
    expect(readFileSync(path.join(worktreePath, planPath), "utf8")).toBe(worktreePlanBefore);
  });

  test("commits files staged by Codex instead of leaving them behind", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        completeTask(input);
        writeRunnerOutput(input, "staged", "staged-output.txt");
        await git(input.worktreePath, ["add", "src/staged-output.txt"]);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    const committedFiles = await gitStdout(worktreePath, [
      "show",
      "--name-only",
      "--format=",
      "HEAD",
    ]);
    expect(committedFiles).toContain("src/staged-output.txt");
    expect(await gitStdout(worktreePath, ["status", "--short"])).toBe("");
  });

  test("blocks when final verification leaves a dirty worktree", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      finalVerifyCommands: ["printf dirty > src/final-dirty.txt"],
    }), {
      homeDir,
      runCodex: createCompletingCodex([]),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("dirty after final verification");
    expect(await gitStdout(worktreePath, ["status", "--short"])).toContain("src/final-dirty.txt");
  });

  test("stops with a blocker when the task records a blocker note", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        const plan = readFileSync(input.planPath, "utf8");
        writeFileSync(
          input.planPath,
          plan.replace(
            `- [ ] ${input.task.text}`,
            `- [ ] ${input.task.text}\n  - BLOCKED: needs unavailable credential`,
          ),
        );
        writeRunnerOutput(input, "blocked");
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("BLOCKED: needs unavailable credential");
    expect(readRelayState(worktreePath).failedTaskIds).toHaveLength(1);
  });

  test("accepts a split task only when the first replacement is complete and continues remaining replacements", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan("Wire runner loop slice"));
    const codexCalls: string[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      finalVerifyCommands: [
        "test -f src/wire-runner-loop-slice-part-one.txt && test -f src/wire-runner-loop-slice-part-two.txt",
      ],
    }), {
      homeDir,
      runCodex: async (input) => {
        codexCalls.push(input.task.text);
        if (input.task.text === "Wire runner loop slice") {
          const plan = readFileSync(input.planPath, "utf8");
          writeFileSync(
            input.planPath,
            plan.replace(
              "- [ ] Wire runner loop slice",
              [
                "- [x] Wire runner loop slice part one",
                "  - Verification note:",
                "    - Fake Codex completed the first split slice.",
                "- [ ] Wire runner loop slice part two",
                "  - Files:",
                "    - Modify: `src/runner-output.txt`",
                "  - Acceptance criteria:",
                "    - Runner output exists.",
                "  - Verification commands:",
                "    - `test -f src/runner-output.txt`",
                "  - Commit boundary:",
                "    - `git add src/runner-output.txt`",
              ].join("\n"),
            ),
          );
          writeRunnerOutput(input, "split-one", "wire-runner-loop-slice-part-one.txt");
          return fakeCodexResult(input, { ok: true });
        }

        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(codexCalls).toEqual([
      "Wire runner loop slice",
      "Wire runner loop slice part two",
    ]);
    const state = readRelayState(worktreePath);
    expect(state.tasks.map((task) => task.text)).toEqual([
      "Wire runner loop slice part one",
      "Wire runner loop slice part two",
    ]);
    expect(state.completedTaskIds).toHaveLength(2);
    expect(state.commits).toHaveLength(2);
  });

  test("resumes from existing .relay state and continues the first unchecked task", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(twoTaskPlan());
    const firstRunCalls: string[] = [];

    const firstRun = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      runCodex: async (input) => {
        firstRunCalls.push(input.task.text);
        if (input.task.text === "Wire second runner slice") {
          return fakeCodexResult(input, { ok: false });
        }
        completeTask(input);
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(firstRun).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(firstRunCalls).toEqual([
      "Wire first runner slice",
      "Wire second runner slice",
    ]);
    expect(readRelayState(worktreePath).completedTaskIds).toHaveLength(1);

    const resumeCalls: string[] = [];
    const resumed = await runRelay(baseRunOptions(repoPath, planPath, {
      resume: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(resumeCalls),
    });

    expect(resumed).toMatchObject({
      exitCode: 0,
      status: "completed",
    });
    expect(resumeCalls).toEqual(["Wire second runner slice"]);
    expect(readRelayState(worktreePath).completedTaskIds).toHaveLength(2);
  });

  test("resume blocks without recreating a missing worktree", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo(oneTaskPlan());
    const codexCalls: string[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      resume: true,
    }), {
      homeDir,
      runCodex: createCompletingCodex(codexCalls),
    });

    expect(result).toMatchObject({
      exitCode: 1,
      status: "blocked",
    });
    expect(result.message).toContain("No existing relay worktree");
    expect(codexCalls).toEqual([]);
    expect(pathExists(worktreePath)).toBe(false);
  });
});

function baseRunOptions(
  repoPath: string,
  planPath: string,
  overrides: Partial<Parameters<typeof runRelay>[0]> = {},
): Parameters<typeof runRelay>[0] {
  return {
    allowDirtyBase: false,
    allowLintWarnings: false,
    command: "run",
    finalVerifyCommands: [],
    force: false,
    notifyEachSlice: false,
    planPath,
    pr: false,
    repoPath,
    resume: false,
    verifyCommands: ["test -f src/runner-output.txt"],
    ...overrides,
  };
}

async function createRunnerRepo(planText: string) {
  const root = tempDir("relay-runner-");
  const homeDir = path.join(root, "home");
  const repoPath = path.join(root, "source");
  const planPath = "docs/plans/relay.md";
  const worktreePath = path.join(homeDir, ".codex", "worktrees", "source", "relay");

  mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
  mkdirSync(path.join(repoPath, "src"), { recursive: true });
  await git(repoPath, ["init", "--initial-branch=main"]);
  await git(repoPath, ["config", "user.name", "Relay Test"]);
  await git(repoPath, ["config", "user.email", "relay@example.invalid"]);
  writeFileSync(path.join(repoPath, planPath), planText);
  writeFileSync(path.join(repoPath, "src", "runner-output.txt"), "initial\n");
  await git(repoPath, ["add", "."]);
  await git(repoPath, ["commit", "-m", "initial commit"]);

  return {
    homeDir,
    planPath,
    repoPath,
    worktreePath,
  };
}

function twoTaskPlan(): string {
  return `# Relay Test Plan

## Phase 1: Runner

- [ ] Wire first runner slice
  - Files:
    - Modify: \`src/runner-output.txt\`
  - Acceptance criteria:
    - Runner output exists.
  - Verification commands:
    - \`test -f src/runner-output.txt\`
  - Commit boundary:
    - \`git add src/runner-output.txt\`

- [ ] Wire second runner slice
  - Files:
    - Modify: \`src/runner-output.txt\`
  - Acceptance criteria:
    - Runner output exists.
  - Verification commands:
    - \`test -f src/runner-output.txt\`
  - Commit boundary:
    - \`git add src/runner-output.txt\`

## Final PR Checklist

- Verification passes.
`;
}

function oneTaskPlan(taskText = "Wire first runner slice"): string {
  return `# Relay Test Plan

## Phase 1: Runner

- [ ] ${taskText}
  - Files:
    - Modify: \`src/runner-output.txt\`
  - Acceptance criteria:
    - Runner output exists.
  - Verification commands:
    - \`test -f src/runner-output.txt\`
  - Commit boundary:
    - \`git add src/runner-output.txt\`

## Final PR Checklist

- Verification passes.
`;
}

function weakP1Plan(): string {
  return `# Relay Test Plan

## Phase 1: Runner

- [ ] Implement feature

## Final PR Checklist

- Verification passes.
`;
}

function createCompletingCodex(calls: string[]) {
  return async (input: RunCodexExecInput): Promise<CodexExecutionResult> => {
    calls.push(input.task.text);
    completeTask(input);
    return fakeCodexResult(input, { ok: true });
  };
}

function completeTask(input: RunCodexExecInput): void {
  const plan = readFileSync(input.planPath, "utf8");
  writeFileSync(
    input.planPath,
    plan.replace(`- [ ] ${input.task.text}`, `- [x] ${input.task.text}`),
  );
  writeRunnerOutput(input, input.task.text, `${slugify(input.task.text)}.txt`);
}

function writeRunnerOutput(
  input: RunCodexExecInput,
  contents: string,
  fileName = "runner-output.txt",
): void {
  const outputDir = path.join(input.worktreePath, "src");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, fileName), `${contents}\n`);
}

function fakeCodexResult(
  input: RunCodexExecInput,
  options: { ok: boolean; timedOut?: boolean },
): CodexExecutionResult {
  return {
    args: ["exec", "--cd", input.worktreePath, "prompt"],
    command: "codex",
    durationMs: 1,
    exitCode: options.ok ? 0 : 1,
    logPath: path.join(input.worktreePath, ".relay", "logs", `${slugify(input.task.text)}.log`),
    ok: options.ok,
    stderr: options.ok ? "" : "failed\n",
    stdout: options.ok ? "ok\n" : "",
    taskId: input.task.id,
    timedOut: options.timedOut ?? false,
  };
}

async function git(repoPath: string, args: string[]): Promise<void> {
  const result = await runCommand("git", ["-C", repoPath, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

async function gitStdout(repoPath: string, args: string[]): Promise<string> {
  const result = await runCommand("git", ["-C", repoPath, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function pathExists(candidate: string): boolean {
  return existsSync(candidate);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task";
}
