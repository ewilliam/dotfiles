import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { sendRelayNotification } from "../src/notify";
import { runRelay } from "../src/runner";
import { runCommand } from "../src/shell";
import type {
  CodexExecutionResult,
  CommandExecutor,
  CommandResult,
  RelayNotification,
  RunCodexExecInput,
} from "../src/types";
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

describe("relay macOS notifications", () => {
  test("uses osascript with title relay and escaped notification text", async () => {
    const calls: string[][] = [];

    await sendRelayNotification({
      kind: "completed",
      message: "done \"quoted\"\nnext line",
    }, {
      executor: async (spec) => {
        calls.push([spec.command, ...(spec.args ?? [])]);
        return commandResult(spec.command, spec.args);
      },
      platform: "darwin",
    });

    expect(calls).toEqual([[
      "osascript",
      "-e",
      "display notification \"done \\\"quoted\\\"\\nnext line\" with title \"relay\"",
    ]]);
  });

  test("skips noncritical notifications on non-macOS platforms", async () => {
    const calls: string[][] = [];

    const result = await sendRelayNotification({
      kind: "completed",
      message: "done",
    }, {
      executor: async (spec) => {
        calls.push([spec.command, ...(spec.args ?? [])]);
        return commandResult(spec.command, spec.args);
      },
      platform: "linux",
    });

    expect(result).toEqual({ skipped: true });
    expect(calls).toEqual([]);
  });
});

describe("relay runner notification hooks", () => {
  test("notifies on blocker with plan slug and task text", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath), {
      homeDir,
      notify: (notification) => {
        notifications.push(notification);
      },
      runCodex: async (input) => {
        writeRunnerOutput(input, "unchecked");
        return fakeCodexResult(input, { ok: true });
      },
    });

    expect(result.status).toBe("blocked");
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      kind: "blocked",
      taskId: expect.any(String),
    });
    const message = String(notifications[0]?.message ?? "");
    expect(message).toContain("[relay]");
    expect(message).toContain("Wire first runner slice");
  });

  test("notifies when verification still fails after repair", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      verifyCommands: ["test -f src/never-created.txt"],
    }), {
      homeDir,
      notify: (notification) => {
        notifications.push(notification);
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

    expect(result.status).toBe("blocked");
    const notification = notifications[notifications.length - 1];
    expect(notification).toMatchObject({
      kind: "blocked",
    });
    const message = String(notification?.message ?? "");
    expect(message).toContain("verify-");
    expect(message).toContain("Wire first runner slice");
  });

  test("notifies when a PR is created and when the full plan completes", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(oneTaskPlan());
    const notifications: RelayNotification[] = [];
    const executor = prCreatingExecutor("https://github.com/example/dotfiles/pull/10");

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      finalVerifyCommands: ["test -f src/runner-output.txt"],
      pr: true,
    }), {
      executor,
      homeDir,
      notify: (notification) => {
        notifications.push(notification);
      },
      runCodex: createCompletingCodex(),
    });

    expect(result.status).toBe("completed");
    expect(notifications.map((notification) => notification.kind)).toEqual([
      "pr_ready",
      "completed",
    ]);
    expect(notifications[0]).toMatchObject({
      kind: "pr_ready",
      prUrl: "https://github.com/example/dotfiles/pull/10",
    });
  });

  test("notifies after committed slices only when notify-each-slice is set", async () => {
    const { homeDir, planPath, repoPath } = await createRunnerRepo(twoTaskPlan());
    const notifications: RelayNotification[] = [];

    const result = await runRelay(baseRunOptions(repoPath, planPath, {
      notifyEachSlice: true,
    }), {
      homeDir,
      notify: (notification) => {
        notifications.push(notification);
      },
      runCodex: createCompletingCodex(),
    });

    expect(result.status).toBe("completed");
    expect(notifications.map((notification) => notification.kind)).toEqual([
      "committed",
      "committed",
      "completed",
    ]);
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

async function createRunnerRepo(planText: string): Promise<{
  homeDir: string;
  planPath: string;
  repoPath: string;
}> {
  const root = tempDir("relay-notify-");
  const homeDir = path.join(root, "home");
  const repoPath = path.join(root, "source");
  const planPath = "docs/plans/relay.md";

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

function twoTaskPlan(): string {
  return oneTaskPlan().replace(
    "## Final PR Checklist",
    `- [ ] Wire second runner slice
  - Files:
    - Modify: \`src/runner-output.txt\`
  - Acceptance criteria:
    - Runner output exists.
  - Verification commands:
    - \`test -f src/runner-output.txt\`
  - Commit boundary:
    - \`git add src/runner-output.txt\`

## Final PR Checklist`,
  );
}

function createCompletingCodex() {
  return async (input: RunCodexExecInput): Promise<CodexExecutionResult> => {
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
  options: { ok: boolean },
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
    timedOut: false,
  };
}

function prCreatingExecutor(url: string): CommandExecutor {
  return async (spec) => {
    if (spec.command === "git" && spec.args?.includes("push")) {
      return commandResult(spec.command, spec.args);
    }
    if (spec.command === "gh" && spec.args?.[0] === "auth") {
      return commandResult(spec.command, spec.args);
    }
    if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "view") {
      return commandResult(spec.command, spec.args, {
        exitCode: 1,
        stderr: "no pull requests found\n",
      });
    }
    if (spec.command === "gh" && spec.args?.[0] === "pr" && spec.args[1] === "create") {
      return commandResult(spec.command, spec.args, {
        stdout: `${url}\n`,
      });
    }
    return runCommand(spec);
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

async function git(repoPath: string, args: string[]): Promise<void> {
  const result = await runCommand("git", ["-C", repoPath, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "task";
}
