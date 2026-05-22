import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parsePlan } from "../src/plan";
import {
  buildRelayPrBody,
  buildRelayPrTitle,
  publishRelayPullRequest,
  RelayPrError,
} from "../src/pr";
import {
  appendRelayEvent,
  initializeRelayState,
  readRelayEvents,
  readRelayState,
  writeRelayState,
} from "../src/state";
import { runRelay } from "../src/runner";
import { runCommand } from "../src/shell";
import type {
  CodexExecutionResult,
  CommandExecutor,
  CommandResult,
  RelayState,
  RunCodexExecInput,
  VerificationResult,
} from "../src/types";
import { makeTempDir, removeTempDir } from "./helpers";

const tempDirs: string[] = [];
const FORMER_TOOL_NAME = ["codex", "runner"].join("-");

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

describe("relay pull request body", () => {
  test("generates the PR title from the plan title", () => {
    const document = parsePlan(`# Relay Implementation Plan

## Phase 1: Foundation

- [x] Wire relay
`);

    expect(buildRelayPrTitle(document)).toBe("Relay Implementation Plan");
  });

  test("summarizes phases, commits, verification, caveats, and blockers", () => {
    const { document, state, worktreePath } = createPrState();
    appendRelayEvent(worktreePath, {
      message: "BLOCKED: missing gh auth",
      timestamp: "2026-05-21T00:03:00.000Z",
      type: "blocked",
    });

    const body = buildRelayPrBody({
      document,
      events: readRelayEvents(worktreePath),
      state,
    });

    expect(body).toContain("# Relay Implementation Plan");
    expect(body).toContain("- Phase 1: Foundation: 1/1 tasks complete");
    expect(body).toContain("- Phase 2: Pull Requests: 1/1 tasks complete");
    expect(body).toContain("abc1234");
    expect(body).toContain("feat: add relay pull request flow");
    expect(body).toContain("PASS `bun test tools/relay/test/pr.test.ts`");
    expect(body).toContain("## Known Caveats");
    expect(body).toContain("- Earlier blockers were recorded; see blocker history below.");
    expect(body).toContain("BLOCKED: missing gh auth");
    expect(body).not.toContain(FORMER_TOOL_NAME);
  });
});

describe("relay pull request publishing", () => {
  test("pushes the branch and reuses an existing PR returned by gh", async () => {
    const { document, state, worktreePath } = createPrState();
    const calls: string[][] = [];
    const executor: CommandExecutor = async (spec) => {
      calls.push([spec.command, ...(spec.args ?? [])]);
      if (spec.command === "git") {
        expect(spec.args).toEqual([
          "-C",
          "/tmp/source",
          "push",
          "-u",
          "origin",
          "codex/relay",
        ]);
        return commandResult(spec.command, spec.args, { stdout: "" });
      }
      if (spec.command === "gh" && spec.args?.[0] === "auth") {
        return commandResult(spec.command, spec.args, { stdout: "" });
      }
      if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "view") {
        return commandResult(spec.command, spec.args, {
          stdout: JSON.stringify({ url: "https://github.com/example/dotfiles/pull/7" }),
        });
      }
      throw new Error(`unexpected command: ${spec.command} ${(spec.args ?? []).join(" ")}`);
    };

    const result = await publishRelayPullRequest({
      branch: "codex/relay",
      document,
      executor,
      repoPath: "/tmp/source",
      state,
      worktreePath,
    });

    expect(result).toEqual({
      bodyPath: path.join(worktreePath, ".relay", "pr-body.md"),
      reused: true,
      url: "https://github.com/example/dotfiles/pull/7",
    });
    expect(existsSync(result.bodyPath)).toBe(true);
    expect(readFileSync(result.bodyPath, "utf8")).toContain("Relay Implementation Plan");
    expect(readRelayState(worktreePath).prUrl).toBe(result.url);
    expect(readRelayEvents(worktreePath).at(-1)).toMatchObject({
      data: {
        reused: true,
        url: result.url,
      },
      type: "pr_ready",
    });
    expect(calls.map((call) => call.slice(0, 3).join(" "))).toEqual([
      "gh auth status",
      "git -C /tmp/source",
      "gh pr view",
    ]);
  });

  test("creates a new PR when gh view finds no existing one", async () => {
    const { document, state, worktreePath } = createPrState();
    const calls: string[][] = [];
    const executor: CommandExecutor = async (spec) => {
      calls.push([spec.command, ...(spec.args ?? [])]);
      if (spec.command === "git") {
        return commandResult(spec.command, spec.args, { stdout: "" });
      }
      if (spec.command === "gh" && spec.args?.[0] === "auth") {
        return commandResult(spec.command, spec.args, { stdout: "" });
      }
      if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "view") {
        return commandResult(spec.command, spec.args, {
          exitCode: 1,
          stderr: "no pull requests found\n",
        });
      }
      if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "create") {
        expect(spec.args).toContain("--title");
        expect(spec.args).toContain("Relay Implementation Plan");
        expect(spec.args).toContain("--body-file");
        expect(spec.args).toContain(path.join(worktreePath, ".relay", "pr-body.md"));
        return commandResult(spec.command, spec.args, {
          stdout: "https://github.com/example/dotfiles/pull/8\n",
        });
      }
      throw new Error(`unexpected command: ${spec.command} ${(spec.args ?? []).join(" ")}`);
    };

    const result = await publishRelayPullRequest({
      branch: "codex/relay",
      document,
      executor,
      repoPath: "/tmp/source",
      state,
      worktreePath,
    });

    expect(result).toMatchObject({
      reused: false,
      url: "https://github.com/example/dotfiles/pull/8",
    });
    expect(calls.some((call) => call.join(" ").includes("pr create"))).toBe(true);
  });

  test("blocks when gh auth status fails", async () => {
    const { document, state, worktreePath } = createPrState();
    const executor: CommandExecutor = async (spec) => {
      if (spec.command === "gh" && spec.args?.[0] === "auth") {
        return commandResult(spec.command, spec.args, {
          exitCode: 1,
          stderr: "not logged in\n",
        });
      }
      throw new Error("publish should stop after auth failure");
    };

    await expect(publishRelayPullRequest({
      branch: "codex/relay",
      document,
      executor,
      repoPath: "/tmp/source",
      state,
      worktreePath,
    })).rejects.toThrow(RelayPrError);
  });

  test("runner performs final verification before pushing and creating a PR", async () => {
    const { homeDir, planPath, repoPath, worktreePath } = await createRunnerRepo();
    const calls: string[] = [];
    const finalCommand = "test -f src/runner-output.txt && test -f docs/plans/relay.md";
    const executor: CommandExecutor = async (spec) => {
      if (spec.command === "sh" && spec.args?.includes(finalCommand)) {
        calls.push("final-verify");
        return runCommand(spec);
      }
      if (spec.command === "git" && spec.args?.includes("push")) {
        calls.push("push");
        return commandResult(spec.command, spec.args);
      }
      if (spec.command === "gh" && spec.args?.[0] === "auth") {
        calls.push("auth");
        return commandResult(spec.command, spec.args);
      }
      if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "view") {
        calls.push("view");
        return commandResult(spec.command, spec.args, {
          exitCode: 1,
          stderr: "no pull requests found\n",
        });
      }
      if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "create") {
        calls.push("create");
        return commandResult(spec.command, spec.args, {
          stdout: "https://github.com/example/dotfiles/pull/9\n",
        });
      }
      return runCommand(spec);
    };

    const result = await runRelay({
      allowDirtyBase: false,
      allowLintWarnings: false,
      command: "run",
      finalVerifyCommands: [finalCommand],
      force: false,
      notifyEachSlice: false,
      planPath,
      pr: true,
      repoPath,
      resume: false,
      verifyCommands: ["test -f src/runner-output.txt"],
    }, {
      executor,
      homeDir,
      runCodex: createCompletingCodex(),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      prUrl: "https://github.com/example/dotfiles/pull/9",
      status: "completed",
    });
    expect(calls).toEqual(["final-verify", "auth", "push", "view", "create"]);
    expect(readRelayState(worktreePath).prUrl).toBe(result.prUrl);
    expect(readRelayEvents(worktreePath).map((event) => event.type)).toContain("pr_ready");
  });
});

function createPrState(): {
  document: ReturnType<typeof parsePlan>;
  state: RelayState;
  worktreePath: string;
} {
  const root = tempDir("relay-pr-");
  const sourceRepoPath = "/tmp/source";
  const worktreePath = path.join(root, "worktree");
  mkdirSync(worktreePath, { recursive: true });
  const document = parsePlan(`# Relay Implementation Plan

## Phase 1: Foundation

- [x] Scaffold relay foundation

## Phase 2: Pull Requests

- [x] Implement PR body generation and GitHub CLI integration
`);
  const initialized = initializeRelayState({
    baseBranch: "main",
    baseHead: "base123",
    now: () => new Date("2026-05-21T00:00:00.000Z"),
    planPath: "docs/plans/relay.md",
    runnerBranch: "codex/relay",
    sourceRepoPath,
    tasks: document.tasks,
    worktreePath,
  });
  const verification: VerificationResult = {
    command: "bun test tools/relay/test/pr.test.ts",
    completedAt: "2026-05-21T00:01:01.000Z",
    durationMs: 25,
    exitCode: 0,
    index: 1,
    logPath: path.join(worktreePath, ".relay", "logs", "verify.log"),
    passed: true,
    scope: "final",
    startedAt: "2026-05-21T00:01:00.000Z",
    stderr: "",
    stdout: "ok\n",
  };
  const state: RelayState = {
    ...initialized,
    commits: [{
      createdAt: "2026-05-21T00:02:00.000Z",
      message: "feat: add relay pull request flow",
      sha: "abc1234",
      taskId: document.tasks[1].id,
    }],
    completedTaskIds: document.tasks.map((task) => task.id),
    updatedAt: "2026-05-21T00:02:00.000Z",
    verificationResults: [verification],
  };
  writeRelayState(worktreePath, state);

  return {
    document,
    state,
    worktreePath,
  };
}

function commandResult(
  command: string,
  args: string[] | undefined,
  overrides: Partial<CommandResult> = {},
): CommandResult {
  return {
    args: args ?? [],
    command,
    durationMs: 1,
    exitCode: 0,
    stderr: "",
    stdout: "",
    timedOut: false,
    ...overrides,
  };
}

async function createRunnerRepo(): Promise<{
  homeDir: string;
  planPath: string;
  repoPath: string;
  worktreePath: string;
}> {
  const root = tempDir("relay-pr-runner-");
  const homeDir = path.join(root, "home");
  const repoPath = path.join(root, "source");
  const planPath = "docs/plans/relay.md";
  const worktreePath = path.join(homeDir, ".codex", "worktrees", "source", "relay");

  mkdirSync(path.join(repoPath, "docs", "plans"), { recursive: true });
  mkdirSync(path.join(repoPath, "src"), { recursive: true });
  await git(repoPath, ["init", "--initial-branch=main"]);
  await git(repoPath, ["config", "user.name", "Relay Test"]);
  await git(repoPath, ["config", "user.email", "relay@example.invalid"]);
  writeFileSync(path.join(repoPath, planPath), oneTaskPlan());
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

function oneTaskPlan(): string {
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

## Final PR Checklist

- Verification passes.
`;
}

function createCompletingCodex() {
  return async (input: RunCodexExecInput): Promise<CodexExecutionResult> => {
    const plan = readFileSync(input.planPath, "utf8");
    writeFileSync(
      input.planPath,
      plan.replace(`- [ ] ${input.task.text}`, `- [x] ${input.task.text}`),
    );
    const outputDir = path.join(input.worktreePath, "src");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, "runner-output.txt"), `${input.task.text}\n`);
    return {
      args: ["exec", "--cd", input.worktreePath, "prompt"],
      command: "codex",
      durationMs: 1,
      exitCode: 0,
      logPath: path.join(input.worktreePath, ".relay", "logs", "task.log"),
      ok: true,
      stderr: "",
      stdout: "ok\n",
      taskId: input.task.id,
      timedOut: false,
    };
  };
}

async function git(repoPath: string, args: string[]): Promise<void> {
  const result = await runCommand("git", ["-C", repoPath, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}
