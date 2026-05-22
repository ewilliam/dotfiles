import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { getRelayPaths } from "./paths";
import { runCommand } from "./shell";
import { readRelayState, validateResumeIdentity } from "./state";
import type {
  CommandExecutor,
  CommandResult,
  CommitRelaySliceInput,
  GitOperationState,
  GitRepositoryInfo,
  PushRelayBranchInput,
  RelayCommit,
  RelayWorktreeInput,
  RelayWorktreeResult,
  SourceGitState,
  ValidateSourceGitStateInput,
} from "./types";

export class RelayGitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayGitError";
  }
}

export async function readGitRepositoryInfo(
  repoPath: string,
  executor: CommandExecutor = runCommand,
): Promise<GitRepositoryInfo> {
  const resolvedRepoPath = path.resolve(repoPath);
  await runGit(resolvedRepoPath, ["rev-parse", "--is-inside-work-tree"], executor);

  const [branchResult, headResult, gitDirResult] = await Promise.all([
    runGit(resolvedRepoPath, ["rev-parse", "--abbrev-ref", "HEAD"], executor),
    runGit(resolvedRepoPath, ["rev-parse", "HEAD"], executor),
    runGit(resolvedRepoPath, ["rev-parse", "--git-dir"], executor),
  ]);

  return {
    branch: branchResult.stdout.trim(),
    gitDir: resolveGitDir(resolvedRepoPath, gitDirResult.stdout.trim()),
    head: headResult.stdout.trim(),
    repoPath: resolvedRepoPath,
  };
}

export async function validateSourceGitState(
  input: ValidateSourceGitStateInput,
): Promise<SourceGitState> {
  const executor = input.executor ?? runCommand;
  const info = await readGitRepositoryInfo(input.repoPath, executor);
  const operationState = await getGitOperationState(info.repoPath, executor);
  if (operationState !== "clean") {
    throw new RelayGitError(`Source checkout is in ${operationState} state.`);
  }

  const dirty = (await runGit(info.repoPath, ["status", "--porcelain"], executor)).stdout
    .trim()
    .length > 0;
  if (dirty && !input.allowDirtyBase) {
    throw new RelayGitError(
      "Source checkout is dirty; pass allowDirtyBase only when the caller has approved it.",
    );
  }

  return {
    ...info,
    dirty,
    operationState,
  };
}

export async function getGitOperationState(
  repoPath: string,
  executor: CommandExecutor = runCommand,
): Promise<GitOperationState> {
  const info = await readGitRepositoryInfo(repoPath, executor);
  const gitDir = info.gitDir;

  if (existsSync(path.join(gitDir, "MERGE_HEAD"))) {
    return "merge";
  }
  if (
    existsSync(path.join(gitDir, "rebase-merge")) ||
    existsSync(path.join(gitDir, "rebase-apply"))
  ) {
    return "rebase";
  }
  if (existsSync(path.join(gitDir, "CHERRY_PICK_HEAD"))) {
    return "cherry-pick";
  }
  if (existsSync(path.join(gitDir, "BISECT_LOG"))) {
    return "bisect";
  }

  return "clean";
}

export async function ensureRelayWorktree(
  input: RelayWorktreeInput,
): Promise<RelayWorktreeResult> {
  const executor = input.executor ?? runCommand;
  const sourceRepoPath = path.resolve(input.sourceRepoPath);
  const worktreePath = path.resolve(input.worktreePath);

  if (existsSync(worktreePath)) {
    const statePath = getRelayPaths(worktreePath).stateFile;
    if (!existsSync(statePath)) {
      throw new RelayGitError(
        `Existing worktree at ${worktreePath} has no matching relay state.`,
      );
    }

    const state = readRelayState(worktreePath);
    validateResumeIdentity(state, {
      planPath: input.planPath,
      runnerBranch: input.runnerBranch,
      sourceRepoPath,
      worktreePath,
    });
    return {
      created: false,
      runnerBranch: input.runnerBranch,
      worktreePath,
    };
  }

  mkdirSync(path.dirname(worktreePath), { recursive: true });
  await runGit(sourceRepoPath, [
    "worktree",
    "add",
    "-B",
    input.runnerBranch,
    worktreePath,
    input.baseHead,
  ], executor);

  return {
    created: true,
    runnerBranch: input.runnerBranch,
    worktreePath,
  };
}

export async function commitRelaySlice(
  input: CommitRelaySliceInput,
): Promise<RelayCommit> {
  const executor = input.executor ?? runCommand;
  const worktreePath = path.resolve(input.worktreePath);
  const paths = uniqueGitPaths(worktreePath, [input.planPath, ...input.touchedPaths]);
  if (paths.length === 0) {
    throw new RelayGitError("Cannot create a relay commit without target paths.");
  }

  await runGit(worktreePath, ["add", "--", ...paths], executor);
  const changedPaths = (await runGit(worktreePath, [
    "diff",
    "--cached",
    "--name-only",
    "--",
    ...paths,
  ], executor)).stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasMeaningfulDiff = changedPaths.length > 0;
  const docOrStateOnly = paths.every(isDocumentationOrStatePath);

  if (!hasMeaningfulDiff && !docOrStateOnly) {
    throw new RelayGitError("No meaningful diff exists for this relay task.");
  }

  const message = buildCommitMessage(input.task.text, changedPaths.length > 0 ? changedPaths : paths);
  const commitArgs = hasMeaningfulDiff
    ? ["commit", "-m", message, "--", ...paths]
    : ["commit", "--allow-empty", "-m", message];
  await runGit(worktreePath, commitArgs, executor);
  const sha = (await runGit(worktreePath, ["rev-parse", "HEAD"], executor)).stdout.trim();

  return {
    createdAt: (input.now ?? (() => new Date()))().toISOString(),
    message,
    sha,
    taskId: input.task.id,
  };
}

export async function pushRelayBranch(input: PushRelayBranchInput): Promise<void> {
  const executor = input.executor ?? runCommand;
  await runGitCommand(executor, {
    command: "git",
    args: ["-C", path.resolve(input.repoPath), "push", "-u", "origin", input.branch],
  });
}

async function runGit(
  repoPath: string,
  args: string[],
  executor: CommandExecutor,
): Promise<CommandResult> {
  return runGitCommand(executor, {
    command: "git",
    args: ["-C", path.resolve(repoPath), ...args],
  });
}

async function runGitCommand(
  executor: CommandExecutor,
  spec: { command: string; args: string[] },
): Promise<CommandResult> {
  const result = await executor(spec);
  if (result.exitCode !== 0) {
    throw new RelayGitError(
      `git ${spec.args.slice(2).join(" ")} failed with exit ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }
  return result;
}

function resolveGitDir(repoPath: string, gitDir: string): string {
  return path.isAbsolute(gitDir) ? path.resolve(gitDir) : path.resolve(repoPath, gitDir);
}

function uniqueGitPaths(worktreePath: string, paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of paths) {
    const gitPath = toGitPath(worktreePath, candidate);
    if (!seen.has(gitPath)) {
      seen.add(gitPath);
      result.push(gitPath);
    }
  }

  return result;
}

function toGitPath(worktreePath: string, candidate: string): string {
  if (!path.isAbsolute(candidate)) {
    return candidate;
  }

  const relative = path.relative(worktreePath, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new RelayGitError(`Path is outside relay worktree: ${candidate}`);
  }

  return relative || ".";
}

function buildCommitMessage(taskText: string, changedPaths: string[]): string {
  return `${commitPrefix(changedPaths)}: ${commitSubject(taskText)}`;
}

function commitPrefix(changedPaths: string[]): string {
  if (changedPaths.every((candidate) => candidate.startsWith("docs/") || candidate.endsWith(".md"))) {
    return "docs";
  }
  if (changedPaths.every(isDocumentationOrStatePath)) {
    return "chore";
  }
  return "feat";
}

function commitSubject(taskText: string): string {
  const subject = taskText
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\s/-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return subject || "update relay task";
}

function isDocumentationOrStatePath(candidate: string): boolean {
  return (
    candidate === ".relay" ||
    candidate.startsWith(".relay/") ||
    candidate.startsWith("docs/") ||
    candidate.endsWith(".md")
  );
}
