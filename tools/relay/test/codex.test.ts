import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildRepairPrompt,
  buildSlicePrompt,
  getCodexExecArgs,
  runCodexExec,
} from "../src/codex";
import { parsePlan } from "../src/plan";
import type { CommandExecutor, CommandSpec, PlanTask } from "../src/types";
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

describe("relay codex prompts", () => {
  test("builds a bounded slice prompt for one relay task", () => {
    const task = createTask();
    const prompt = buildSlicePrompt({
      planPath: "/repo/docs/plans/relay.md",
      task,
      worktreePath: "/worktree",
    });

    expect(prompt).toContain("You are executing one relay slice.");
    expect(prompt).toContain("Repository: /worktree");
    expect(prompt).toContain("Plan: /repo/docs/plans/relay.md");
    expect(prompt).toContain("Current phase: Phase 4: Execution");
    expect(prompt).toContain("Current task: Implement bounded `codex exec` slice and repair prompt handling.");
    expect(prompt).toContain("Read repo instructions and the full plan first.");
    expect(prompt).toContain("Complete only the current task.");
    expect(prompt).toContain("If the task is too large, split it into smaller unchecked subtasks");
    expect(prompt).toContain("Preserve unrelated changes.");
    expect(prompt).toContain("Update the plan checkbox");
    expect(prompt).toContain("add a short verification note");
    expect(prompt).toContain("Do not commit, push, or open a PR.");
  });

  test("builds a repair prompt bounded to the same task and failure log", () => {
    const task = createTask();
    const prompt = buildRepairPrompt({
      failureLogPath: "/worktree/.relay/logs/verify-phase-4.log",
      planPath: "/repo/docs/plans/relay.md",
      task,
      worktreePath: "/worktree",
    });

    expect(prompt).toContain("The previous relay slice failed verification.");
    expect(prompt).toContain("Repository: /worktree");
    expect(prompt).toContain("Plan: /repo/docs/plans/relay.md");
    expect(prompt).toContain("Current task: Implement bounded `codex exec` slice and repair prompt handling.");
    expect(prompt).toContain("Failure log: /worktree/.relay/logs/verify-phase-4.log");
    expect(prompt).toContain("You may only repair work for this same task.");
    expect(prompt).toContain("Make the smallest fix");
    expect(prompt).toContain("rerun verification");
    expect(prompt).toContain("update the plan note");
    expect(prompt).toContain("Do not commit, push, or open a PR.");
  });
});

describe("relay codex execution", () => {
  test("centralizes noninteractive codex exec arguments", () => {
    const args = getCodexExecArgs({
      prompt: "prompt",
      worktreePath: "/worktree",
    });

    expect(args.slice(0, 3)).toEqual(["exec", "--cd", "/worktree"]);
    expect(args).toContain("--sandbox");
    expect(args).toContain("danger-full-access");
    expect(args).toContain("--config");
    expect(args).toContain('approval_policy="never"');
    expect(args.at(-1)).toBe("prompt");
  });

  test("runs a fake codex executable, captures the prompt, and writes a task log", async () => {
    const root = tempDir("relay-codex-");
    const worktreePath = path.join(root, "worktree");
    const fakeCodexPath = path.join(root, "fake-codex.sh");
    const capturedArgsPath = path.join(root, "captured-args.txt");
    mkdirSync(worktreePath, { recursive: true });
    writeFileSync(fakeCodexPath, [
      "#!/bin/sh",
      "printf '%s\\n' \"$@\" > \"$CAPTURED_ARGS_PATH\"",
      "printf 'relay stdout\\n'",
      "printf 'relay stderr\\n' >&2",
      "exit 0",
      "",
    ].join("\n"));
    chmodSync(fakeCodexPath, 0o755);
    const task = createTask();

    const result = await runCodexExec({
      codexExecutable: fakeCodexPath,
      env: {
        CAPTURED_ARGS_PATH: capturedArgsPath,
      },
      planPath: "/repo/docs/plans/relay.md",
      task,
      worktreePath,
    });

    const capturedArgs = readFileSync(capturedArgsPath, "utf8");
    expect(capturedArgs).toContain("exec\n--cd\n");
    expect(capturedArgs).toContain(`${worktreePath}\n`);
    expect(capturedArgs).toContain("You are executing one relay slice.");
    expect(result).toMatchObject({
      exitCode: 0,
      ok: true,
      stderr: "relay stderr\n",
      stdout: "relay stdout\n",
      taskId: task.id,
    });
    expect(result.logPath).toBe(path.join(
      worktreePath,
      ".relay",
      "logs",
      "1-implement-bounded-codex-exec-slice-and-repair-prompt-handling.log",
    ));
    const log = readFileSync(result.logPath, "utf8");
    expect(log).toContain("relay stdout\n");
    expect(log).toContain("relay stderr\n");
  });

  test("returns a structured failed result instead of throwing past the runner", async () => {
    const calls: CommandSpec[] = [];
    const executor: CommandExecutor = async (spec) => {
      calls.push(spec);
      return {
        args: spec.args ?? [],
        command: spec.command,
        cwd: spec.cwd,
        durationMs: 5,
        exitCode: 42,
        stderr: "failed\n",
        stdout: "partial\n",
        timedOut: false,
      };
    };
    const worktreePath = tempDir("relay-codex-fail-");
    const task = createTask();

    const result = await runCodexExec({
      executor,
      planPath: "/repo/docs/plans/relay.md",
      task,
      worktreePath,
    });

    expect(result).toMatchObject({
      exitCode: 42,
      ok: false,
      stderr: "failed\n",
      stdout: "partial\n",
      taskId: task.id,
      timedOut: false,
    });
    expect(calls).toHaveLength(1);
    expect(readFileSync(result.logPath, "utf8")).toContain("partial\n");
  });
});

function createTask(): PlanTask {
  return parsePlan(`# Relay

## Phase 4: Execution

- [ ] Implement bounded \`codex exec\` slice and repair prompt handling.
  - Files:
    - Create: \`tools/relay/src/codex.ts\`
`).tasks[0];
}
