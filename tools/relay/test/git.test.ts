import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  commitRelaySlice,
  ensureRelayWorktree,
  getGitOperationState,
  readGitRepositoryInfo,
  RelayGitError,
  pushRelayBranch,
  validateSourceGitState,
} from "../src/git";
import { deriveRunnerBranch, deriveWorktreePath } from "../src/paths";
import { parsePlan } from "../src/plan";
import { runCommand } from "../src/shell";
import { initializeRelayState } from "../src/state";
import type { CommandExecutor, CommandSpec } from "../src/types";
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

describe("relay git helpers", () => {
  test("detects a non-git source repo", async () => {
    const repoPath = tempDir("relay-not-git-");

    await expect(readGitRepositoryInfo(repoPath)).rejects.toThrow(RelayGitError);
  });

  test("reads current branch and HEAD from a git repo", async () => {
    const repoPath = await createGitRepo();

    const info = await readGitRepositoryInfo(repoPath);

    expect(info.repoPath).toBe(repoPath);
    expect(info.branch).toBe("main");
    expect(info.head).toMatch(/^[a-f0-9]{40}$/);
    expect(info.gitDir).toBe(path.join(repoPath, ".git"));
  });

  test("refuses dirty source state unless allowed", async () => {
    const repoPath = await createGitRepo();
    writeFileSync(path.join(repoPath, "src.txt"), "dirty\n");

    await expect(validateSourceGitState({
      allowDirtyBase: false,
      repoPath,
    })).rejects.toThrow(/dirty/i);
    await expect(validateSourceGitState({
      allowDirtyBase: true,
      repoPath,
    })).resolves.toMatchObject({
      branch: "main",
      dirty: true,
    });
  });

  test("detects merge, rebase, cherry-pick, and bisect state from git metadata", async () => {
    const repoPath = await createGitRepo();
    const gitDir = path.join(repoPath, ".git");

    writeFileSync(path.join(gitDir, "MERGE_HEAD"), "abc\n");
    expect(await getGitOperationState(repoPath)).toBe("merge");
    rmGitState(gitDir);

    mkdirSync(path.join(gitDir, "rebase-merge"));
    expect(await getGitOperationState(repoPath)).toBe("rebase");
    rmGitState(gitDir);

    writeFileSync(path.join(gitDir, "CHERRY_PICK_HEAD"), "abc\n");
    expect(await getGitOperationState(repoPath)).toBe("cherry-pick");
    rmGitState(gitDir);

    writeFileSync(path.join(gitDir, "BISECT_LOG"), "git bisect start\n");
    expect(await getGitOperationState(repoPath)).toBe("bisect");
  });

  test("derives the runner branch and isolated worktree path", () => {
    const homeDir = tempDir("relay-home-");
    const repoPath = path.join(homeDir, "repos", "dotfiles");

    expect(deriveRunnerBranch("docs/plans/2026-05-21-relay.md")).toBe("codex/relay");
    expect(deriveWorktreePath({
      homeDir,
      planPath: "docs/plans/2026-05-21-relay.md",
      repoPath,
    })).toBe(path.join(homeDir, ".codex", "worktrees", "dotfiles", "relay"));
  });

  test("creates or reuses an isolated worktree only when relay state identity matches", async () => {
    const sourceRepoPath = await createGitRepo();
    const root = tempDir("relay-worktrees-");
    const planPath = "docs/plans/relay.md";
    const runnerBranch = deriveRunnerBranch(planPath);
    const baseHead = (await readGitRepositoryInfo(sourceRepoPath)).head;
    const worktreePath = path.join(root, "relay");

    const created = await ensureRelayWorktree({
      baseHead,
      planPath,
      runnerBranch,
      sourceRepoPath,
      worktreePath,
    });

    expect(created.created).toBe(true);
    expect(existsSync(path.join(worktreePath, ".git"))).toBe(true);

    initializeRelayState({
      baseBranch: "main",
      baseHead,
      planPath,
      runnerBranch,
      sourceRepoPath,
      tasks: parsePlan("# Relay\n\n- [ ] Add git helpers\n").tasks,
      worktreePath,
    });

    const reused = await ensureRelayWorktree({
      baseHead,
      planPath,
      runnerBranch,
      sourceRepoPath,
      worktreePath,
    });
    expect(reused.created).toBe(false);

    await expect(ensureRelayWorktree({
      baseHead,
      planPath: "docs/plans/other.md",
      runnerBranch,
      sourceRepoPath,
      worktreePath,
    })).rejects.toThrow(/plan path/i);
  });

  test("commits a completed slice with the plan file and touched files", async () => {
    const repoPath = await createGitRepo();
    const planPath = path.join(repoPath, "docs", "plans", "relay.md");
    const touchedPath = path.join(repoPath, "src.txt");
    writeFileSync(planPath, "# Relay\n\n- [x] Add git helpers\n");
    writeFileSync(touchedPath, "changed\n");
    const task = parsePlan("# Relay\n\n- [x] Add git helpers\n").tasks[0];

    const commit = await commitRelaySlice({
      planPath,
      task,
      touchedPaths: [touchedPath],
      worktreePath: repoPath,
    });

    expect(commit.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(commit.message).toBe("feat: add git helpers");
    expect(commit.taskId).toBe(task.id);
    const committedFiles = await gitStdout(repoPath, ["show", "--name-only", "--format=", "HEAD"]);
    expect(committedFiles).toContain("docs/plans/relay.md");
    expect(committedFiles).toContain("src.txt");
  });

  test("refuses to commit when no meaningful diff exists for a non-documentation task", async () => {
    const repoPath = await createGitRepo();
    const planPath = path.join(repoPath, "docs", "plans", "relay.md");
    const task = parsePlan("# Relay\n\n- [ ] Add git helpers\n").tasks[0];

    await expect(commitRelaySlice({
      planPath,
      task,
      touchedPaths: [path.join(repoPath, "src.txt")],
      worktreePath: repoPath,
    })).rejects.toThrow(/no meaningful diff/i);
  });

  test("pushes the runner branch through an injected command executor", async () => {
    const calls: CommandSpec[] = [];
    const executor: CommandExecutor = async (spec) => {
      calls.push(spec);
      return {
        args: spec.args ?? [],
        command: spec.command,
        cwd: spec.cwd,
        durationMs: 1,
        exitCode: 0,
        stderr: "",
        stdout: "",
        timedOut: false,
      };
    };

    await pushRelayBranch({
      branch: "codex/relay",
      executor,
      repoPath: "/repo",
    });

    expect(calls).toEqual([{
      args: ["-C", "/repo", "push", "-u", "origin", "codex/relay"],
      command: "git",
    }]);
  });
});

async function createGitRepo(): Promise<string> {
  const repoPath = tempDir("relay-git-repo-");
  await git(repoPath, ["init", "--initial-branch=main"]);
  await git(repoPath, ["config", "user.name", "Relay Test"]);
  await git(repoPath, ["config", "user.email", "relay@example.invalid"]);
  mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
  writeFileSync(path.join(repoPath, "docs", "plans", "relay.md"), "# Relay\n");
  writeFileSync(path.join(repoPath, "src.txt"), "initial\n");
  await git(repoPath, ["add", "."]);
  await git(repoPath, ["commit", "-m", "initial commit"]);
  return repoPath;
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

function rmGitState(gitDir: string): void {
  for (const entry of [
    "MERGE_HEAD",
    "rebase-merge",
    "rebase-apply",
    "CHERRY_PICK_HEAD",
    "BISECT_LOG",
  ]) {
    const entryPath = path.join(gitDir, entry);
    if (existsSync(entryPath)) {
      rmSync(entryPath, { force: true, recursive: true });
    }
  }
}
