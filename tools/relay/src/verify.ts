import { runCommand } from "./shell";
import {
  appendRelayEvent,
  readRelayState,
  recordVerificationResult,
  writeVerificationLog,
} from "./state";
import type {
  CommandExecutor,
  CommandResult,
  PlanTask,
  RunFinalVerificationInput,
  RunSliceVerificationInput,
  RelayState,
  VerificationResult,
  VerificationRunSummary,
  VerificationScope,
} from "./types";

const SHELL_COMMAND = "sh";
const SHELL_ARGS_PREFIX = ["-lc"] as const;

export async function runSliceVerification(
  input: RunSliceVerificationInput,
): Promise<VerificationRunSummary> {
  if (input.commands.length === 0) {
    return recordMissingSliceVerification(input.worktreePath, input.task);
  }

  const initialState = readRelayState(input.worktreePath);
  const results = await runVerificationCommands({
    commands: input.commands,
    env: input.env,
    executor: input.executor,
    now: input.now,
    scope: "slice",
    taskId: input.task.id,
    timeoutMs: input.timeoutMs,
    worktreePath: input.worktreePath,
  });
  const failed = results.find((result) => !result.passed);
  const repairAttempts = initialState.repairAttempts[input.task.id] ?? 0;

  return {
    failureLogPath: failed?.logPath,
    ok: failed === undefined,
    repairable: failed !== undefined && repairAttempts < 1,
    results,
    stopBeforePr: false,
  };
}

export async function runFinalVerification(
  input: RunFinalVerificationInput,
): Promise<VerificationRunSummary> {
  if (input.commands.length === 0) {
    return {
      missingCommandsAllowed: true,
      ok: true,
      repairable: false,
      results: [],
      stopBeforePr: false,
    };
  }

  const results = await runVerificationCommands({
    commands: input.commands,
    env: input.env,
    executor: input.executor,
    now: input.now,
    scope: "final",
    timeoutMs: input.timeoutMs,
    worktreePath: input.worktreePath,
  });
  const failed = results.find((result) => !result.passed);

  return {
    failureLogPath: failed?.logPath,
    ok: failed === undefined,
    repairable: false,
    results,
    stopBeforePr: failed !== undefined,
  };
}

export function hasSliceVerificationNote(task: Pick<PlanTask, "detailLines">): boolean {
  for (const [index, line] of task.detailLines.entries()) {
    const match = line.match(/^\s*-\s*Verification note:\s*(.*)$/i);
    if (!match) {
      continue;
    }

    if (match[1].trim().length > 0) {
      return true;
    }

    return task.detailLines.slice(index + 1).some((detailLine) => {
      const trimmed = detailLine.trim();
      return trimmed.length > 0 && !isTaskDetailHeading(trimmed);
    });
  }

  return false;
}

async function runVerificationCommands(input: {
  commands: string[];
  worktreePath: string;
  scope: VerificationScope;
  taskId?: string;
  executor?: CommandExecutor;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  now?: () => Date;
}): Promise<VerificationResult[]> {
  const executor = input.executor ?? runCommand;
  const now = input.now ?? (() => new Date());
  let state = readRelayState(input.worktreePath);
  const results: VerificationResult[] = [];

  for (const [zeroBasedIndex, command] of input.commands.entries()) {
    const index = zeroBasedIndex + 1;
    const startedAt = now().toISOString();
    const commandResult = await runShellVerificationCommand(executor, {
      command,
      env: input.env,
      timeoutMs: input.timeoutMs,
      worktreePath: input.worktreePath,
    });
    const completedAt = now().toISOString();
    const logPath = writeVerificationLog(
      input.worktreePath,
      verificationLogFileName(input.scope, index, input.taskId, state),
      formatVerificationLog(command, commandResult, {
        index,
        scope: input.scope,
        taskId: input.taskId,
      }),
    );
    const result: VerificationResult = {
      command,
      completedAt,
      durationMs: commandResult.durationMs,
      exitCode: commandResult.exitCode,
      index,
      logPath,
      passed: commandResult.exitCode === 0,
      scope: input.scope,
      startedAt,
      stderr: commandResult.stderr,
      stdout: commandResult.stdout,
      taskId: input.taskId,
    };

    state = recordVerificationResult(input.worktreePath, state, result);
    results.push(result);
  }

  return results;
}

async function runShellVerificationCommand(
  executor: CommandExecutor,
  input: {
    command: string;
    worktreePath: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
  },
): Promise<CommandResult> {
  try {
    return await executor({
      args: [...SHELL_ARGS_PREFIX, input.command],
      command: SHELL_COMMAND,
      cwd: input.worktreePath,
      env: input.env,
      timeoutMs: input.timeoutMs,
    });
  } catch (error) {
    return {
      args: [...SHELL_ARGS_PREFIX, input.command],
      command: SHELL_COMMAND,
      cwd: input.worktreePath,
      durationMs: 0,
      exitCode: 1,
      stderr: error instanceof Error ? `${error.message}\n` : `${String(error)}\n`,
      stdout: "",
      timedOut: false,
    };
  }
}

function recordMissingSliceVerification(
  worktreePath: string,
  task: PlanTask,
): VerificationRunSummary {
  const allowed = hasSliceVerificationNote(task);
  const message = allowed
    ? "No slice verification commands were configured; task verification note is present."
    : "No slice verification commands were configured and the task has no verification note.";

  appendRelayEvent(worktreePath, {
    data: {
      missingCommandsAllowed: allowed,
      scope: "slice",
    },
    message,
    taskId: task.id,
    type: "verification_finished",
  });

  return {
    missingCommandsAllowed: allowed,
    message,
    ok: allowed,
    repairable: false,
    results: [],
    stopBeforePr: false,
  };
}

function verificationLogFileName(
  scope: VerificationScope,
  index: number,
  taskId?: string,
  state?: RelayState,
): string {
  const priorCount = state
    ? state.verificationResults.filter((result) =>
        result.scope === scope &&
        result.index === index &&
        (result.taskId ?? undefined) === (taskId ?? undefined)
      ).length
    : 0;
  const suffix = priorCount === 0 ? ".log" : `-${priorCount + 1}.log`;

  if (scope === "final") {
    return `final-verify-${index}${suffix}`;
  }

  if (!taskId) {
    throw new Error("Slice verification requires a task ID.");
  }

  return `verify-${taskId}-${index}${suffix}`;
}

function formatVerificationLog(
  command: string,
  result: CommandResult,
  metadata: { scope: VerificationScope; index: number; taskId?: string },
): string {
  return [
    `$ ${SHELL_COMMAND} -lc ${shellQuote(command)}`,
    `scope: ${metadata.scope}`,
    `index: ${metadata.index}`,
    metadata.taskId ? `taskId: ${metadata.taskId}` : undefined,
    `exitCode: ${result.exitCode}`,
    `timedOut: ${String(result.timedOut)}`,
    `durationMs: ${result.durationMs}`,
    "",
    "[stdout]",
    result.stdout,
    "[stderr]",
    result.stderr,
  ].filter((line) => line !== undefined).join("\n");
}

function isTaskDetailHeading(trimmedLine: string): boolean {
  return /^-\s+[A-Z][A-Za-z /-]+:\s*$/.test(trimmedLine);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}
