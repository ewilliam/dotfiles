import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { runCodexExec } from "./codex";
import {
  commitRelaySlice,
  ensureRelayWorktree,
  validateSourceGitState,
} from "./git";
import { formatLintReport, getLintExitCode, lintPlanFile } from "./lint";
import {
  deriveRunnerBranch,
  deriveWorktreePath,
  getRelayPaths,
  resolvePlanPath,
  resolveRepoPath,
} from "./paths";
import { normalizeTaskTextForId, parsePlan } from "./plan";
import { runCommand } from "./shell";
import {
  appendRelayEvent,
  initializeRelayState,
  readRelayState,
  writeRelayState,
} from "./state";
import { runFinalVerification, runSliceVerification } from "./verify";
import type {
  CodexExecutionResult,
  CommandExecutor,
  CommandResult,
  PlanDocument,
  PlanTask,
  RelayNotification,
  RelayOptions,
  RelayRunResult,
  RelayState,
  RunCodexExecInput,
} from "./types";

export interface RunRelayDependencies {
  executor?: CommandExecutor;
  homeDir?: string;
  notify?: (notification: RelayNotification) => Promise<void> | void;
  now?: () => Date;
  runCodex?: (input: RunCodexExecInput) => Promise<CodexExecutionResult>;
}

interface RunnerContext {
  executor: CommandExecutor;
  now: () => Date;
  options: RelayOptions;
  planPath: string;
  repoPath: string;
  runnerBranch: string;
  notify?: (notification: RelayNotification) => Promise<void> | void;
  runCodex: (input: RunCodexExecInput) => Promise<CodexExecutionResult>;
  worktreePath: string;
  worktreePlanPath: string;
}

interface CompletionResult {
  ok: boolean;
  completedTask?: PlanTask;
  blockedTask?: PlanTask;
  message?: string;
}

interface WorktreeDiffSnapshot {
  fingerprint: string;
  touchedPaths: string[];
}

export async function runRelay(
  options: RelayOptions,
  dependencies: RunRelayDependencies = {},
): Promise<RelayRunResult> {
  if (!options.planPath) {
    return blockedBeforeState("run requires --plan <path>");
  }

  const executor = dependencies.executor ?? runCommand;
  const now = dependencies.now ?? (() => new Date());
  const repoPath = resolveRepoPath(options.repoPath);
  const planPath = options.planPath;
  const sourcePlanPath = resolvePlanPath(repoPath, planPath);
  const worktreePlanRelativePath = path.relative(repoPath, sourcePlanPath);
  const lintReport = lintPlanFile({
    planPath,
    repoPath,
  });
  const lintExitCode = getLintExitCode(lintReport.findings, {
    allowLintWarnings: options.allowLintWarnings,
  });

  if (lintExitCode !== 0) {
    return blockedBeforeState(formatLintReport(lintReport));
  }

  const runnerBranch = deriveRunnerBranch(planPath);
  const worktreePath = deriveWorktreePath({
    homeDir: dependencies.homeDir,
    planPath,
    repoPath,
  });
  const worktreePlanPath = resolvePlanPath(worktreePath, worktreePlanRelativePath);

  try {
    const sourceGitState = await validateSourceGitState({
      allowDirtyBase: options.allowDirtyBase,
      executor,
      repoPath,
    });

    const worktreeResult = await ensureRelayWorktree({
      baseHead: sourceGitState.head,
      executor,
      planPath,
      runnerBranch,
      sourceRepoPath: repoPath,
      worktreePath,
    });

    if (!worktreeResult.created && !options.resume && !options.force) {
      return blockedBeforeState(
        `Existing relay state found at ${getRelayPaths(worktreePath).stateFile}; use --resume or --force.`,
        {
          runnerBranch,
          worktreePath,
        },
      );
    }

    if (options.force && !worktreeResult.created) {
      const stalePaths = await listTouchedPaths(
        worktreePath,
        worktreePlanPath,
        executor,
      );
      if (stalePaths.length > 0) {
        return blockedBeforeState(
          `Existing relay worktree has stale non-plan changes:\n${stalePaths.join("\n")}`,
          {
            runnerBranch,
            worktreePath,
          },
        );
      }
    }

    await ensureRelayStateIgnored(worktreePath, executor);

    if (!options.resume) {
      syncSourcePlanToWorktree(sourcePlanPath, worktreePlanPath);
    }

    const initialDocument = readPlanDocument(worktreePlanPath);
    initializeRelayState({
      baseBranch: sourceGitState.branch,
      baseHead: sourceGitState.head,
      force: options.force,
      now,
      planPath,
      resume: options.resume,
      runnerBranch,
      sourceRepoPath: repoPath,
      tasks: initialDocument.tasks,
      worktreePath,
    });

    const context: RunnerContext = {
      executor,
      now,
      options,
      planPath,
      repoPath,
      runnerBranch,
      notify: dependencies.notify,
      runCodex: dependencies.runCodex ?? runCodexExec,
      worktreePath,
      worktreePlanPath,
    };

    try {
      return await runTaskLoop(context);
    } catch (error) {
      return blockRun(
        context,
        undefined,
        errorMessage(error),
        readPlanDocument(context.worktreePlanPath),
      );
    }
  } catch (error) {
    return blockedBeforeState(errorMessage(error), {
      runnerBranch,
      worktreePath,
    });
  }
}

async function runTaskLoop(context: RunnerContext): Promise<RelayRunResult> {
  let document = readPlanDocument(context.worktreePlanPath);

  while (true) {
    const preExistingDirtyPaths = await listTouchedPaths(
      context.worktreePath,
      context.worktreePlanPath,
      context.executor,
    );
    if (preExistingDirtyPaths.length > 0) {
      return blockRun(
        context,
        selectFirstIncompleteTask(document),
        `Worktree has pre-existing non-plan changes:\n${preExistingDirtyPaths.join("\n")}`,
        document,
      );
    }

    const task = selectFirstIncompleteTask(document);
    if (!task) {
      return completeRun(context);
    }

    if (task.blockerNote) {
      return blockRun(context, task, task.blockerNote, document);
    }

    let state = updateState(context.worktreePath, context.now, (current) => ({
      ...current,
      currentTaskId: task.id,
      tasks: document.tasks,
    }));
    appendRelayEvent(context.worktreePath, {
      message: `Started relay task: ${task.text}`,
      taskId: task.id,
      timestamp: state.updatedAt,
      type: "task_started",
    });

    const codexResult = await context.runCodex({
      executor: context.executor,
      planPath: context.worktreePlanPath,
      task,
      worktreePath: context.worktreePath,
    });
    appendRelayEvent(context.worktreePath, {
      data: {
        durationMs: codexResult.durationMs,
        exitCode: codexResult.exitCode,
        logPath: codexResult.logPath,
        timedOut: codexResult.timedOut,
      },
      message: codexResult.ok
        ? `Codex completed relay task: ${task.text}`
        : `Codex failed relay task: ${task.text}`,
      taskId: task.id,
      timestamp: context.now().toISOString(),
      type: "codex_finished",
    });

    if (!codexResult.ok) {
      return blockRun(
        context,
        task,
        `Codex exited ${codexResult.exitCode}; see ${codexResult.logPath}.`,
        readPlanDocument(context.worktreePlanPath),
      );
    }

    const updatedDocument = readPlanDocument(context.worktreePlanPath);
    const completion = resolveCompletedTask(document, task, updatedDocument);
    if (!completion.ok || !completion.completedTask) {
      return blockRun(
        context,
        completion.blockedTask ?? task,
        completion.message ?? `Task remained unchecked after Codex exited 0: ${task.text}`,
        updatedDocument,
      );
    }

    const preVerificationDiff = await readWorktreeDiffSnapshot(
      context.worktreePath,
      context.worktreePlanPath,
      context.executor,
    );
    const verification = await runSliceVerification({
      commands: context.options.verifyCommands,
      executor: context.executor,
      now: context.now,
      task: completion.completedTask,
      worktreePath: context.worktreePath,
    });

    if (!verification.ok) {
      return blockRun(
        context,
        completion.completedTask,
        verification.failureLogPath
          ? `Slice verification failed; see ${verification.failureLogPath}.`
          : verification.message ?? "Slice verification failed.",
        updatedDocument,
      );
    }
    const postVerificationDiff = await readWorktreeDiffSnapshot(
      context.worktreePath,
      context.worktreePlanPath,
      context.executor,
    );
    if (postVerificationDiff.fingerprint !== preVerificationDiff.fingerprint) {
      return blockRun(
        context,
        completion.completedTask,
        [
          "Worktree changed during slice verification.",
          ...diffChangedPaths(preVerificationDiff.touchedPaths, postVerificationDiff.touchedPaths),
        ].join("\n"),
        updatedDocument,
      );
    }

    const commit = await commitRelaySlice({
      executor: context.executor,
      now: context.now,
      planPath: context.worktreePlanPath,
      task: completion.completedTask,
      touchedPaths: preVerificationDiff.touchedPaths,
      worktreePath: context.worktreePath,
    });

    state = updateState(context.worktreePath, context.now, (current) => ({
      ...current,
      commits: [...current.commits, commit],
      completedTaskIds: unique([
        ...current.completedTaskIds,
        completion.completedTask.id,
      ]),
      currentTaskId: selectFirstIncompleteTask(updatedDocument)?.id,
      failedTaskIds: current.failedTaskIds.filter(
        (taskId) => taskId !== completion.completedTask?.id,
      ),
      tasks: updatedDocument.tasks,
      updatedAt: commit.createdAt,
    }));
    appendRelayEvent(context.worktreePath, {
      data: {
        message: commit.message,
        sha: commit.sha,
      },
      message: `Committed relay task: ${commit.message}`,
      taskId: completion.completedTask.id,
      timestamp: state.updatedAt,
      type: "commit_created",
    });
    if (context.options.notifyEachSlice) {
      await emitNotification(context, {
        commit,
        kind: "committed",
        message: `Committed relay task: ${commit.message}`,
        taskId: completion.completedTask.id,
      });
    }

    document = updatedDocument;
  }
}

async function completeRun(context: RunnerContext): Promise<RelayRunResult> {
  const finalVerification = await runFinalVerification({
    commands: context.options.finalVerifyCommands,
    executor: context.executor,
    now: context.now,
    worktreePath: context.worktreePath,
  });

  if (!finalVerification.ok) {
    const state = readRelayState(context.worktreePath);
    return blockRun(
      context,
      undefined,
      finalVerification.failureLogPath
        ? `Final verification failed; see ${finalVerification.failureLogPath}.`
        : "Final verification failed.",
      {
        phases: [],
        raw: "",
        tasks: state.tasks,
      },
    );
  }

  const dirtyPaths = await listDirtyStatusLines(context.worktreePath, context.executor);
  if (dirtyPaths.length > 0) {
    const state = readRelayState(context.worktreePath);
    return blockRun(
      context,
      undefined,
      `Worktree is dirty after final verification:\n${dirtyPaths.join("\n")}`,
      {
        phases: [],
        raw: "",
        tasks: state.tasks,
      },
    );
  }

  const state = updateState(context.worktreePath, context.now, (current) => ({
    ...current,
    currentTaskId: undefined,
  }));
  appendRelayEvent(context.worktreePath, {
    message: "Relay run completed.",
    timestamp: state.updatedAt,
    type: "completed",
  });
  await emitNotification(context, {
    kind: "completed",
    message: "Relay run completed.",
  });

  return {
    commits: state.commits,
    exitCode: 0,
    message: "Relay run completed.",
    runnerBranch: context.runnerBranch,
    status: "completed",
    worktreePath: context.worktreePath,
  };
}

function resolveCompletedTask(
  previousDocument: PlanDocument,
  previousTask: PlanTask,
  currentDocument: PlanDocument,
): CompletionResult {
  const sameTask = currentDocument.tasks.find((task) => task.id === previousTask.id);
  if (sameTask) {
    if (sameTask.blockerNote) {
      return {
        blockedTask: sameTask,
        message: sameTask.blockerNote,
        ok: false,
      };
    }

    if (!sameTask.checked) {
      return {
        blockedTask: sameTask,
        message: `Task remained unchecked after Codex exited 0: ${sameTask.text}`,
        ok: false,
      };
    }

    return {
      completedTask: sameTask,
      ok: true,
    };
  }

  const replacements = findReplacementTasks(
    previousDocument,
    previousTask,
    currentDocument,
  );
  if (replacements.length === 0) {
    return {
      message: `Task disappeared without a valid split: ${previousTask.text}`,
      ok: false,
    };
  }

  const blocker = replacements.find((task) => task.blockerNote);
  if (blocker?.blockerNote) {
    return {
      blockedTask: blocker,
      message: blocker.blockerNote,
      ok: false,
    };
  }

  const [firstReplacement, ...remainingReplacements] = replacements;
  if (firstReplacement.checked && remainingReplacements.every((task) => !task.checked)) {
    return {
      completedTask: firstReplacement,
      ok: true,
    };
  }

  return {
    blockedTask: firstReplacement,
    message: `Task split must complete only the first replacement and leave the rest unchecked: ${previousTask.text}`,
    ok: false,
  };
}

function findReplacementTasks(
  previousDocument: PlanDocument,
  previousTask: PlanTask,
  currentDocument: PlanDocument,
): PlanTask[] {
  const previousPhaseTasks = previousDocument.tasks.filter(
    (task) => phaseKey(task) === phaseKey(previousTask),
  );
  const currentPhaseTasks = currentDocument.tasks.filter(
    (task) => phaseKey(task) === phaseKey(previousTask),
  );
  const previousIndex = previousPhaseTasks.findIndex(
    (task) => task.id === previousTask.id,
  );

  if (previousIndex < 0) {
    return [];
  }

  const startIndex = findBoundary(
    previousPhaseTasks.slice(0, previousIndex).reverse(),
    currentPhaseTasks,
    "after",
  );
  const endIndex = findBoundary(
    previousPhaseTasks.slice(previousIndex + 1),
    currentPhaseTasks,
    "before",
  );
  const replacements = currentPhaseTasks.slice(startIndex, endIndex);

  return replacements.length >= 2 ? replacements : [];
}

function findBoundary(
  previousCandidates: PlanTask[],
  currentTasks: PlanTask[],
  position: "after" | "before",
): number {
  for (const previousTask of previousCandidates) {
    const index = currentTasks.findIndex(
      (currentTask) =>
        normalizeTaskTextForId(currentTask.text) ===
        normalizeTaskTextForId(previousTask.text),
    );
    if (index >= 0) {
      return position === "after" ? index + 1 : index;
    }
  }

  return position === "after" ? 0 : currentTasks.length;
}

async function blockRun(
  context: RunnerContext,
  task: PlanTask | undefined,
  message: string,
  document: PlanDocument,
): Promise<RelayRunResult> {
  const state = updateState(context.worktreePath, context.now, (current) => ({
    ...current,
    currentTaskId: task?.id,
    failedTaskIds: task ? unique([...current.failedTaskIds, task.id]) : current.failedTaskIds,
    tasks: document.tasks,
  }));
  appendRelayEvent(context.worktreePath, {
    message,
    taskId: task?.id,
    timestamp: state.updatedAt,
    type: "blocked",
  });
  await emitNotification(context, {
    kind: "blocked",
    message,
    taskId: task?.id,
  });

  return {
    blockedTaskId: task?.id,
    commits: state.commits,
    exitCode: 1,
    message,
    runnerBranch: context.runnerBranch,
    status: "blocked",
    worktreePath: context.worktreePath,
  };
}

async function listTouchedPaths(
  worktreePath: string,
  planPath: string,
  executor: CommandExecutor,
): Promise<string[]> {
  return (await readWorktreeDiffSnapshot(worktreePath, planPath, executor)).touchedPaths;
}

async function readWorktreeDiffSnapshot(
  worktreePath: string,
  planPath: string,
  executor: CommandExecutor,
): Promise<WorktreeDiffSnapshot> {
  const [diffResult, cachedDiffResult, untrackedResult] = await Promise.all([
    runGitPathCommand(worktreePath, ["diff", "--name-only"], executor),
    runGitPathCommand(worktreePath, ["diff", "--cached", "--name-only"], executor),
    runGitPathCommand(worktreePath, ["ls-files", "--others", "--exclude-standard"], executor),
  ]);
  const planRelativePath = toGitPath(worktreePath, planPath);
  const allPaths = unique([
    ...diffResult.stdout.split(/\r?\n/),
    ...cachedDiffResult.stdout.split(/\r?\n/),
    ...untrackedResult.stdout.split(/\r?\n/),
  ]
    .map((line) => line.trim())
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter((candidate) => !isRelayStatePath(candidate)))
    .sort();
  const touchedPaths = allPaths.filter((candidate) => candidate !== planRelativePath);

  return {
    fingerprint: hashSnapshot(worktreePath, allPaths, [
      diffResult.stdout,
      cachedDiffResult.stdout,
    ]),
    touchedPaths,
  };
}

async function runGitPathCommand(
  worktreePath: string,
  args: string[],
  executor: CommandExecutor,
): Promise<CommandResult> {
  const result = await executor({
    args: ["-C", worktreePath, ...args],
    command: "git",
  });

  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed with exit ${result.exitCode}: ${result.stderr.trim()}`);
  }

  return result;
}

async function listDirtyStatusLines(
  worktreePath: string,
  executor: CommandExecutor,
): Promise<string[]> {
  const result = await runGitPathCommand(
    worktreePath,
    ["status", "--short", "--untracked-files=all"],
    executor,
  );

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .filter((line) => !isRelayStatePath(parseStatusPath(line)));
}

function parseStatusPath(line: string): string {
  const rawPath = line.slice(3).trim();
  const renameSeparator = " -> ";
  if (rawPath.includes(renameSeparator)) {
    return rawPath.slice(rawPath.indexOf(renameSeparator) + renameSeparator.length);
  }
  return rawPath;
}

function hashSnapshot(
  worktreePath: string,
  paths: string[],
  diffOutputs: string[],
): string {
  const hash = createHash("sha256");
  for (const output of diffOutputs) {
    hash.update(output);
    hash.update("\0");
  }
  for (const candidate of paths) {
    hash.update(candidate);
    hash.update("\0");
    const absolutePath = path.join(worktreePath, candidate);
    if (existsSync(absolutePath)) {
      hash.update(readFileSync(absolutePath));
    } else {
      hash.update("<missing>");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

function diffChangedPaths(before: string[], after: string[]): string[] {
  const changed = unique([...before, ...after]).sort();
  return changed.length > 0 ? changed : ["No dirty paths remain."];
}

function selectFirstIncompleteTask(document: PlanDocument): PlanTask | undefined {
  return document.tasks.find((task) => !task.checked);
}

async function ensureRelayStateIgnored(
  worktreePath: string,
  executor: CommandExecutor,
): Promise<void> {
  const result = await runGitPathCommand(
    worktreePath,
    ["rev-parse", "--git-path", "info/exclude"],
    executor,
  );
  const rawExcludePath = result.stdout.trim();
  const excludePath = path.isAbsolute(rawExcludePath)
    ? rawExcludePath
    : path.resolve(worktreePath, rawExcludePath);
  mkdirSync(path.dirname(excludePath), { recursive: true });
  const contents = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : "";

  if (!contents.split(/\r?\n/).some((line) => line.trim() === ".relay/")) {
    appendFileSync(
      excludePath,
      `${contents.endsWith("\n") || contents.length === 0 ? "" : "\n"}.relay/\n`,
      "utf8",
    );
  }
}

function readPlanDocument(planPath: string): PlanDocument {
  return parsePlan(readFileSync(planPath, "utf8"));
}

function syncSourcePlanToWorktree(sourcePlanPath: string, worktreePlanPath: string): void {
  mkdirSync(path.dirname(worktreePlanPath), { recursive: true });
  writeFileSync(worktreePlanPath, readFileSync(sourcePlanPath, "utf8"), "utf8");
}

function updateState(
  worktreePath: string,
  now: () => Date,
  updater: (state: RelayState) => RelayState,
): RelayState {
  const current = readRelayState(worktreePath);
  const updated = updater({
    ...current,
    updatedAt: now().toISOString(),
  });
  writeRelayState(worktreePath, updated);
  return updated;
}

function blockedBeforeState(
  message: string,
  details: Pick<RelayRunResult, "runnerBranch" | "worktreePath"> = {},
): RelayRunResult {
  return {
    ...details,
    exitCode: 1,
    message,
    status: "blocked",
  };
}

async function emitNotification(
  context: Pick<RunnerContext, "notify">,
  notification: RelayNotification,
): Promise<void> {
  try {
    await context.notify?.(notification);
  } catch {
    // Notification hooks are noncritical and must not mask runner results.
  }
}

function toGitPath(worktreePath: string, candidate: string): string {
  if (!path.isAbsolute(candidate)) {
    return candidate;
  }

  return path.relative(worktreePath, candidate);
}

function isRelayStatePath(candidate: string): boolean {
  return candidate === ".relay" || candidate.startsWith(".relay/");
}

function phaseKey(task: PlanTask): string {
  return task.phaseId ?? "__root__";
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
