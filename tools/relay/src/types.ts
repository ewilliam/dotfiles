export type RelayCommand = "run" | "lint-plan" | "install";

export interface RelayOptions {
  command: RelayCommand;
  repoPath: string;
  planPath?: string;
  pr: boolean;
  verifyCommands: string[];
  finalVerifyCommands: string[];
  resume: boolean;
  force: boolean;
  allowDirtyBase: boolean;
  allowLintWarnings: boolean;
  notifyEachSlice: boolean;
}

export interface PlanPhase {
  id: string;
  title: string;
  ordinal: number;
  line: number;
  tasks: PlanTask[];
}

export interface PlanDocument {
  title?: string;
  phases: PlanPhase[];
  tasks: PlanTask[];
  raw: string;
}

export interface PlanTask {
  id: string;
  text: string;
  ordinal: number;
  line: number;
  checked: boolean;
  phaseId?: string;
  phaseTitle?: string;
  phaseOrdinal?: number;
  detailLines: string[];
  blockerNote?: string;
}

export interface TaskSplitDetection {
  previousTaskId: string;
  previousText: string;
  replacementTaskIds: string[];
  replacementTexts: string[];
  phaseId?: string;
  phaseTitle?: string;
}

export type LintSeverity = "P0" | "P1" | "P2";

export interface LintFinding {
  severity: LintSeverity;
  message: string;
  remediation: string;
  line?: number;
  phaseTitle?: string;
  taskId?: string;
}

export interface CommandSpec {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export interface CommandResult {
  command: string;
  args: string[];
  cwd?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export type CommandExecutor = (spec: CommandSpec) => Promise<CommandResult>;

export interface VerificationResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  taskId?: string;
}

export type RelayEventType =
  | "task_started"
  | "codex_finished"
  | "verification_finished"
  | "repair_started"
  | "commit_created"
  | "blocked"
  | "completed";

export interface RelayEvent {
  type: RelayEventType;
  timestamp: string;
  taskId?: string;
  message?: string;
  data?: Record<string, unknown>;
}

export interface RelayCommit {
  taskId: string;
  sha: string;
  message: string;
  createdAt: string;
}

export interface RelayState {
  version: 1;
  sourceRepoPath: string;
  worktreePath: string;
  baseBranch: string;
  baseHead: string;
  runnerBranch: string;
  planPath: string;
  tasks: PlanTask[];
  completedTaskIds: string[];
  failedTaskIds: string[];
  repairAttempts: Record<string, number>;
  commits: RelayCommit[];
  verificationResults: VerificationResult[];
  createdAt: string;
  updatedAt: string;
  currentTaskId?: string;
  prUrl?: string;
}

export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  ok: true;
  value: T;
}

export interface Err<E = Error> {
  ok: false;
  error: E;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = Error>(error: E): Err<E> {
  return { ok: false, error };
}
