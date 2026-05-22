import { runCommand } from "./shell";
import { writeTaskLog } from "./state";
import type {
  CodexExecArgsInput,
  CodexExecutionResult,
  CodexPromptInput,
  CodexRepairPromptInput,
  CommandExecutor,
  CommandResult,
  RunCodexExecInput,
} from "./types";

const DEFAULT_CODEX_EXECUTABLE = "codex";
const CODEX_EXEC_OPTIONS = [
  "--sandbox",
  "danger-full-access",
  "--config",
  'approval_policy="never"',
  "--color",
  "never",
] as const;

export function buildSlicePrompt(input: CodexPromptInput): string {
  return [
    "You are executing one relay slice.",
    "",
    `Repository: ${input.worktreePath}`,
    `Plan: ${input.planPath}`,
    `Current phase: ${input.task.phaseTitle ?? "None"}`,
    `Current task: ${input.task.text}`,
    "",
    "Rules:",
    "- Read repo instructions and the full plan first.",
    "- Complete only the current task.",
    "- If the task is too large, split it into smaller unchecked subtasks in the plan, complete the first safe subtask only, and stop.",
    "- Preserve unrelated changes.",
    "- Update the plan checkbox and add a short verification note.",
    "- Run the relevant tests/checks.",
    "- Do not commit, push, or open a PR.",
    "- If blocked, write a concise blocker note in the plan and stop.",
  ].join("\n");
}

export function buildRepairPrompt(input: CodexRepairPromptInput): string {
  return [
    "The previous relay slice failed verification.",
    "",
    `Repository: ${input.worktreePath}`,
    `Plan: ${input.planPath}`,
    `Current phase: ${input.task.phaseTitle ?? "None"}`,
    `Current task: ${input.task.text}`,
    `Failure log: ${input.failureLogPath}`,
    "",
    "Rules:",
    "- You may only repair work for this same task.",
    "- Read the failure log and repo state.",
    "- Make the smallest fix, rerun verification, update the plan note, then stop.",
    "- Preserve unrelated changes.",
    "- Do not commit, push, or open a PR.",
    "- If blocked, write a concise blocker note in the plan and stop.",
  ].join("\n");
}

export function getCodexExecArgs(input: CodexExecArgsInput): string[] {
  return [
    "exec",
    "--cd",
    input.worktreePath,
    ...CODEX_EXEC_OPTIONS,
    input.prompt,
  ];
}

export async function runCodexExec(
  input: RunCodexExecInput,
): Promise<CodexExecutionResult> {
  const executor = input.executor ?? runCommand;
  const prompt = input.repair
    ? buildRepairPrompt({
        failureLogPath: requiredFailureLogPath(input),
        planPath: input.planPath,
        task: input.task,
        worktreePath: input.worktreePath,
      })
    : buildSlicePrompt(input);
  const command = input.codexExecutable ?? DEFAULT_CODEX_EXECUTABLE;
  const args = getCodexExecArgs({
    prompt,
    worktreePath: input.worktreePath,
  });
  const result = await runCodexCommand(executor, {
    args,
    command,
    env: input.env,
    timeoutMs: input.timeoutMs,
    worktreePath: input.worktreePath,
  });
  const logPath = writeTaskLog(
    input.worktreePath,
    input.task,
    formatCodexLog(command, args, result),
    { repair: input.repair },
  );

  return {
    args,
    command,
    durationMs: result.durationMs,
    exitCode: result.exitCode,
    logPath,
    ok: result.exitCode === 0,
    stderr: result.stderr,
    stdout: result.stdout,
    taskId: input.task.id,
    timedOut: result.timedOut,
  };
}

async function runCodexCommand(
  executor: CommandExecutor,
  input: {
    command: string;
    args: string[];
    worktreePath: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
  },
): Promise<CommandResult> {
  try {
    return await executor({
      args: input.args,
      command: input.command,
      cwd: input.worktreePath,
      env: input.env,
      timeoutMs: input.timeoutMs,
    });
  } catch (error) {
    return {
      args: input.args,
      command: input.command,
      cwd: input.worktreePath,
      durationMs: 0,
      exitCode: 1,
      stderr: error instanceof Error ? `${error.message}\n` : `${String(error)}\n`,
      stdout: "",
      timedOut: false,
    };
  }
}

function formatCodexLog(
  command: string,
  args: string[],
  result: CommandResult,
): string {
  return [
    `$ ${command} ${args.map(shellQuote).join(" ")}`,
    `exitCode: ${result.exitCode}`,
    `timedOut: ${String(result.timedOut)}`,
    `durationMs: ${result.durationMs}`,
    "",
    "[stdout]",
    result.stdout,
    "[stderr]",
    result.stderr,
  ].join("\n");
}

function requiredFailureLogPath(input: RunCodexExecInput): string {
  if (!input.failureLogPath) {
    throw new Error("Repair codex execution requires a failure log path.");
  }
  return input.failureLogPath;
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}
