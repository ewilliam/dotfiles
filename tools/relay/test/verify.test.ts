import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parsePlan } from "../src/plan";
import { initializeRelayState, readRelayEvents, readRelayState, writeRelayState } from "../src/state";
import type {
  CommandExecutor,
  CommandSpec,
  RelayState,
} from "../src/types";
import {
  hasSliceVerificationNote,
  runFinalVerification,
  runSliceVerification,
} from "../src/verify";
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

describe("relay verification handling", () => {
  test("runs slice verification commands in order and persists results, logs, and events", async () => {
    const { state, task, worktreePath } = createInitializedState();
    const calls: CommandSpec[] = [];
    const executor = fakeVerificationExecutor(calls, (command, index) => ({
      durationMs: 10 + index,
      exitCode: 0,
      stderr: `stderr:${command}\n`,
      stdout: `stdout:${command}\n`,
    }));

    const run = await runSliceVerification({
      commands: ["printf first", "printf second"],
      executor,
      now: createClock(),
      task,
      worktreePath,
    });

    expect(run).toMatchObject({
      failureLogPath: undefined,
      ok: true,
      repairable: false,
      results: [
        {
          command: "printf first",
          exitCode: 0,
          index: 1,
          passed: true,
          scope: "slice",
          taskId: task.id,
        },
        {
          command: "printf second",
          exitCode: 0,
          index: 2,
          passed: true,
          scope: "slice",
          taskId: task.id,
        },
      ],
    });
    expect(calls.map((call) => call.command)).toEqual(["sh", "sh"]);
    expect(calls.map((call) => call.args)).toEqual([
      ["-lc", "printf first"],
      ["-lc", "printf second"],
    ]);
    expect(calls.map((call) => call.cwd)).toEqual([worktreePath, worktreePath]);

    const persisted = readRelayState(worktreePath);
    expect(persisted.verificationResults).toHaveLength(2);
    expect(persisted.verificationResults.map((result) => result.command)).toEqual([
      "printf first",
      "printf second",
    ]);
    expect(persisted.verificationResults.map((result) => result.taskId)).toEqual([
      task.id,
      task.id,
    ]);
    expect(persisted.updatedAt).toBe("2026-05-21T00:00:04.000Z");

    const firstLogPath = path.join(
      worktreePath,
      ".relay",
      "logs",
      `verify-${task.id}-1.log`,
    );
    const secondLogPath = path.join(
      worktreePath,
      ".relay",
      "logs",
      `verify-${task.id}-2.log`,
    );
    expect(persisted.verificationResults.map((result) => result.logPath)).toEqual([
      firstLogPath,
      secondLogPath,
    ]);
    expect(readFileSync(firstLogPath, "utf8")).toContain("stdout:printf first\n");
    expect(readFileSync(secondLogPath, "utf8")).toContain("stderr:printf second\n");

    const events = readRelayEvents(worktreePath);
    expect(events.map((event) => event.type)).toEqual([
      "verification_finished",
      "verification_finished",
    ]);
    expect(events.map((event) => event.taskId)).toEqual([task.id, task.id]);
    expect(events.map((event) => event.data?.logPath)).toEqual([firstLogPath, secondLogPath]);
    expect(state.verificationResults).toEqual([]);
  });

  test("runs final verification commands and reports failures as PR-stopping", async () => {
    const { worktreePath } = createInitializedState();
    const calls: CommandSpec[] = [];
    const executor = fakeVerificationExecutor(calls, (command) => ({
      durationMs: 7,
      exitCode: command.includes("fail") ? 2 : 0,
      stderr: command.includes("fail") ? "final failed\n" : "",
      stdout: command.includes("fail") ? "" : "final ok\n",
    }));

    const run = await runFinalVerification({
      commands: ["bun test", "bun fail"],
      executor,
      now: createClock(),
      worktreePath,
    });

    const failureLogPath = path.join(
      worktreePath,
      ".relay",
      "logs",
      "final-verify-2.log",
    );
    expect(run).toMatchObject({
      failureLogPath,
      ok: false,
      repairable: false,
      results: [
        {
          command: "bun test",
          exitCode: 0,
          index: 1,
          passed: true,
          scope: "final",
        },
        {
          command: "bun fail",
          exitCode: 2,
          index: 2,
          passed: false,
          scope: "final",
        },
      ],
      stopBeforePr: true,
    });
    expect(calls.map((call) => call.args)).toEqual([
      ["-lc", "bun test"],
      ["-lc", "bun fail"],
    ]);
    expect(readFileSync(failureLogPath, "utf8")).toContain("final failed\n");
    expect(readRelayState(worktreePath).verificationResults.at(-1)).toMatchObject({
      command: "bun fail",
      logPath: failureLogPath,
      scope: "final",
    });
  });

  test("classifies a failed slice verification as repairable until one repair attempt is consumed", async () => {
    const { task, worktreePath } = createInitializedState();
    const executor = fakeVerificationExecutor([], () => ({
      durationMs: 3,
      exitCode: 1,
      stderr: "slice failed\n",
      stdout: "",
    }));

    const firstRun = await runSliceVerification({
      commands: ["bun test"],
      executor,
      now: createClock(),
      task,
      worktreePath,
    });

    expect(firstRun).toMatchObject({
      ok: false,
      repairable: true,
    });
    expect(firstRun.failureLogPath).toBe(path.join(
      worktreePath,
      ".relay",
      "logs",
      `verify-${task.id}-1.log`,
    ));

    const consumedRepairState: RelayState = {
      ...readRelayState(worktreePath),
      repairAttempts: {
        [task.id]: 1,
      },
    };
    writeRelayState(worktreePath, consumedRepairState);

    const secondRun = await runSliceVerification({
      commands: ["bun test"],
      executor,
      now: createClock(),
      task,
      worktreePath,
    });

    expect(secondRun).toMatchObject({
      ok: false,
      repairable: false,
    });
  });

  test("allows missing slice verification commands only when the task records a verification note", async () => {
    const { worktreePath } = createInitializedState();
    const notedTask = parsePlan(`# Relay

## Phase 1: Verify

- [x] Update docs only.
  - Verification note:
    - No automated checks apply to this documentation-only slice.
`).tasks[0];
    const unnotedTask = parsePlan(`# Relay

## Phase 1: Verify

- [x] Update docs without checks.
`).tasks[0];

    expect(hasSliceVerificationNote(notedTask)).toBe(true);
    expect(hasSliceVerificationNote(unnotedTask)).toBe(false);

    await expect(runSliceVerification({
      commands: [],
      task: unnotedTask,
      worktreePath,
    })).resolves.toMatchObject({
      missingCommandsAllowed: false,
      ok: false,
      repairable: false,
    });
    await expect(runSliceVerification({
      commands: [],
      task: notedTask,
      worktreePath,
    })).resolves.toMatchObject({
      missingCommandsAllowed: true,
      ok: true,
      repairable: false,
      results: [],
    });
  });
});

function createInitializedState() {
  const root = tempDir("relay-verify-");
  const sourceRepoPath = path.join(root, "source");
  const worktreePath = path.join(root, "worktree");
  mkdirSync(sourceRepoPath, { recursive: true });
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(path.join(sourceRepoPath, "plan.md"), "# Relay\n");
  const task = parsePlan(`# Relay

## Phase 4: Verification

- [ ] Implement verification command handling for slice and final checks.
  - Verification commands:
    - \`bun test tools/relay/test/verify.test.ts\`
`).tasks[0];
  const state = initializeRelayState({
    baseBranch: "main",
    baseHead: "abc123",
    now: () => new Date("2026-05-21T00:00:00.000Z"),
    planPath: path.join(sourceRepoPath, "plan.md"),
    runnerBranch: "codex/relay",
    sourceRepoPath,
    tasks: [task],
    worktreePath,
  });

  return {
    state,
    task,
    worktreePath,
  };
}

function fakeVerificationExecutor(
  calls: CommandSpec[],
  handler: (
    command: string,
    index: number,
  ) => Pick<Awaited<ReturnType<CommandExecutor>>, "durationMs" | "exitCode" | "stderr" | "stdout">,
): CommandExecutor {
  return async (spec) => {
    calls.push(spec);
    const command = spec.args?.[1] ?? "";
    const output = handler(command, calls.length);
    return {
      args: spec.args ?? [],
      command: spec.command,
      cwd: spec.cwd,
      timedOut: false,
      ...output,
    };
  };
}

function createClock(): () => Date {
  let tick = 0;
  return () => {
    tick += 1;
    return new Date(`2026-05-21T00:00:0${tick}.000Z`);
  };
}
