import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { getRelayPaths } from "./paths";
import type {
  PlanTask,
  RelayEvent,
  RelayEventInput,
  RelayState,
  RelayStateIdentity,
  RelayStateInitInput,
  VerificationResult,
} from "./types";

export const RELAY_STATE_VERSION = 1;

export class RelayStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayStateError";
  }
}

export function initializeRelayState(input: RelayStateInitInput): RelayState {
  const paths = getRelayPaths(input.worktreePath);
  ensureRelayDirectories(input.worktreePath);

  if (existsSync(paths.stateFile)) {
    if (input.resume) {
      const state = readRelayState(input.worktreePath);
      validateResumeIdentity(state, input);
      return state;
    }

    if (!input.force) {
      throw new RelayStateError(
        `Existing relay state found at ${paths.stateFile}; use --resume or --force.`,
      );
    }
  } else if (input.resume) {
    throw new RelayStateError(
      `No existing relay state found at ${paths.stateFile}; remove --resume or initialize a new run.`,
    );
  }

  const state = buildInitialState(input);
  writeFileSync(paths.eventsFile, "", "utf8");
  writeRelayState(input.worktreePath, state);
  return state;
}

export function readRelayState(worktreePath: string): RelayState {
  const paths = getRelayPaths(worktreePath);

  try {
    const parsed = JSON.parse(readFileSync(paths.stateFile, "utf8")) as RelayState;
    if (parsed.version !== RELAY_STATE_VERSION) {
      throw new RelayStateError(
        `Unsupported relay state version ${String(parsed.version)} at ${paths.stateFile}.`,
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof RelayStateError) {
      throw error;
    }

    const message = `Corrupt relay state JSON at ${paths.stateFile}: ${errorMessage(error)}`;
    appendRelayEvent(worktreePath, {
      message,
      type: "blocked",
    });
    throw new RelayStateError(message);
  }
}

export function writeRelayState(worktreePath: string, state: RelayState): void {
  const paths = getRelayPaths(worktreePath);
  ensureRelayDirectories(worktreePath);
  const tempFile = path.join(
    paths.relayDir,
    `.state.json.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`,
  );

  writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempFile, paths.stateFile);
}

export function appendRelayEvent(
  worktreePath: string,
  input: RelayEventInput,
): RelayEvent {
  const paths = getRelayPaths(worktreePath);
  ensureRelayDirectories(worktreePath);
  const event: RelayEvent = {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  appendFileSync(paths.eventsFile, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readRelayEvents(worktreePath: string): RelayEvent[] {
  const paths = getRelayPaths(worktreePath);
  if (!existsSync(paths.eventsFile)) {
    return [];
  }

  return readFileSync(paths.eventsFile, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as RelayEvent);
}

export function writeTaskLog(
  worktreePath: string,
  task: Pick<PlanTask, "ordinal" | "text">,
  contents: string,
  options: { repair?: boolean } = {},
): string {
  const logPath = getTaskLogPath(worktreePath, task, options);
  ensureRelayDirectories(worktreePath);
  writeFileSync(logPath, contents, "utf8");
  return logPath;
}

export function writeVerificationLog(
  worktreePath: string,
  fileName: string,
  contents: string,
): string {
  const paths = getRelayPaths(worktreePath);
  ensureRelayDirectories(worktreePath);
  const logPath = path.join(paths.logsDir, fileName);
  writeFileSync(logPath, contents, "utf8");
  return logPath;
}

export function recordVerificationResult(
  worktreePath: string,
  state: RelayState,
  result: VerificationResult,
): RelayState {
  const updated: RelayState = {
    ...state,
    updatedAt: result.completedAt,
    verificationResults: [...state.verificationResults, result],
  };

  writeRelayState(worktreePath, updated);
  appendRelayEvent(worktreePath, {
    data: {
      command: result.command,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      index: result.index,
      logPath: result.logPath,
      passed: result.passed,
      scope: result.scope,
    },
    message: `${result.scope ?? "verification"} verification ${result.passed ? "passed" : "failed"}: ${result.command}`,
    taskId: result.taskId,
    timestamp: result.completedAt,
    type: "verification_finished",
  });

  return updated;
}

export function getTaskLogPath(
  worktreePath: string,
  task: Pick<PlanTask, "ordinal" | "text">,
  options: { repair?: boolean } = {},
): string {
  const paths = getRelayPaths(worktreePath);
  const suffix = options.repair ? ".repair.log" : ".log";
  return path.join(paths.logsDir, `${task.ordinal}-${slugify(task.text)}${suffix}`);
}

export function validateResumeIdentity(
  state: RelayState,
  expected: RelayStateIdentity,
): void {
  const normalized = normalizeIdentity(expected);
  const checks: Array<[label: string, actual: string, expected: string]> = [
    ["source repo", state.sourceRepoPath, normalized.sourceRepoPath],
    ["worktree", state.worktreePath, normalized.worktreePath],
    ["runner branch", state.runnerBranch, normalized.runnerBranch],
    ["plan path", state.planPath, normalized.planPath],
  ];

  for (const [label, actual, expectedValue] of checks) {
    if (actual !== expectedValue) {
      throw new RelayStateError(
        `Cannot resume relay state: ${label} mismatch. Expected ${expectedValue}, found ${actual}.`,
      );
    }
  }
}

function buildInitialState(input: RelayStateInitInput): RelayState {
  const now = (input.now ?? (() => new Date()))().toISOString();
  const identity = normalizeIdentity(input);

  return {
    baseBranch: input.baseBranch,
    baseHead: input.baseHead,
    commits: [],
    completedTaskIds: [],
    createdAt: now,
    failedTaskIds: [],
    planPath: identity.planPath,
    repairAttempts: {},
    runnerBranch: identity.runnerBranch,
    sourceRepoPath: identity.sourceRepoPath,
    tasks: input.tasks,
    updatedAt: now,
    verificationResults: [],
    version: RELAY_STATE_VERSION,
    worktreePath: identity.worktreePath,
  };
}

function normalizeIdentity(identity: RelayStateIdentity): RelayStateIdentity {
  const sourceRepoPath = path.resolve(identity.sourceRepoPath);
  return {
    planPath: path.isAbsolute(identity.planPath)
      ? path.resolve(identity.planPath)
      : path.resolve(sourceRepoPath, identity.planPath),
    runnerBranch: identity.runnerBranch,
    sourceRepoPath,
    worktreePath: path.resolve(identity.worktreePath),
  };
}

function ensureRelayDirectories(worktreePath: string): void {
  const paths = getRelayPaths(worktreePath);
  mkdirSync(paths.logsDir, { recursive: true });
  if (!existsSync(paths.eventsFile)) {
    writeFileSync(paths.eventsFile, "", "utf8");
  }
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "task";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
