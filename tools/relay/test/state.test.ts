import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parsePlan } from "../src/plan";
import {
  appendRelayEvent,
  initializeRelayState,
  readRelayEvents,
  readRelayState,
  RelayStateError,
  validateResumeIdentity,
  writeRelayState,
  writeTaskLog,
} from "../src/state";
import type { RelayEventType, RelayState, VerificationResult } from "../src/types";
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

describe("relay state persistence", () => {
  test("initializes .relay state, events, and logs inside a worktree", () => {
    const input = createStateInput();

    const state = initializeRelayState(input);

    expect(existsSync(path.join(input.worktreePath, ".relay"))).toBe(true);
    expect(existsSync(path.join(input.worktreePath, ".relay", "state.json"))).toBe(true);
    expect(existsSync(path.join(input.worktreePath, ".relay", "events.jsonl"))).toBe(true);
    expect(existsSync(path.join(input.worktreePath, ".relay", "logs"))).toBe(true);

    const persisted = readRelayState(input.worktreePath);
    expect(persisted).toEqual(state);
    expect(persisted).toMatchObject({
      baseBranch: "main",
      baseHead: "abc123",
      completedTaskIds: [],
      failedTaskIds: [],
      repairAttempts: {},
      runnerBranch: "codex/relay",
      sourceRepoPath: input.sourceRepoPath,
      version: 1,
      worktreePath: input.worktreePath,
    });
    expect(persisted.planPath).toBe(path.join(input.sourceRepoPath, "docs/plans/relay.md"));
    expect(persisted.tasks).toHaveLength(2);
    expect(readFileSync(path.join(input.worktreePath, ".relay", "events.jsonl"), "utf8")).toBe("");
  });

  test("appends relay events as ordered JSONL records", () => {
    const input = createStateInput();
    initializeRelayState(input);
    const eventTypes: RelayEventType[] = [
      "task_started",
      "codex_finished",
      "verification_finished",
      "repair_started",
      "commit_created",
      "blocked",
      "completed",
    ];

    for (const [index, type] of eventTypes.entries()) {
      appendRelayEvent(input.worktreePath, {
        data: { index },
        message: `event-${index}`,
        taskId: input.tasks[0].id,
        timestamp: `2026-05-21T00:00:0${index}.000Z`,
        type,
      });
    }

    const events = readRelayEvents(input.worktreePath);
    expect(events.map((event) => event.type)).toEqual(eventTypes);
    expect(events.map((event) => event.data?.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(events.map((event) => event.timestamp)).toEqual([
      "2026-05-21T00:00:00.000Z",
      "2026-05-21T00:00:01.000Z",
      "2026-05-21T00:00:02.000Z",
      "2026-05-21T00:00:03.000Z",
      "2026-05-21T00:00:04.000Z",
      "2026-05-21T00:00:05.000Z",
      "2026-05-21T00:00:06.000Z",
    ]);
  });

  test("persists task progress, repair attempts, commits, verification, and PR URL", () => {
    const input = createStateInput();
    const initial = initializeRelayState(input);
    const verification: VerificationResult = {
      command: "bun test tools/relay/test/state.test.ts",
      completedAt: "2026-05-21T00:01:00.000Z",
      durationMs: 25,
      exitCode: 0,
      passed: true,
      startedAt: "2026-05-21T00:00:59.000Z",
      stderr: "",
      stdout: "ok",
      taskId: input.tasks[0].id,
    };
    const updated: RelayState = {
      ...initial,
      commits: [{
        createdAt: "2026-05-21T00:02:00.000Z",
        message: "feat: persist relay state",
        sha: "deadbeef",
        taskId: input.tasks[0].id,
      }],
      completedTaskIds: [input.tasks[0].id],
      currentTaskId: input.tasks[1].id,
      failedTaskIds: [input.tasks[1].id],
      prUrl: "https://github.com/example/repo/pull/1",
      repairAttempts: {
        [input.tasks[1].id]: 1,
      },
      updatedAt: "2026-05-21T00:03:00.000Z",
      verificationResults: [verification],
    };

    writeRelayState(input.worktreePath, updated);

    expect(readRelayState(input.worktreePath)).toEqual(updated);
  });

  test("validates resume identity and rejects mismatched fields", () => {
    const input = createStateInput();
    const state = initializeRelayState(input);

    expect(() => validateResumeIdentity(state, input)).not.toThrow();
    expect(initializeRelayState({ ...input, resume: true })).toEqual(state);
    expect(() =>
      validateResumeIdentity(state, {
        ...input,
        sourceRepoPath: path.join(tempDir("relay-other-repo-"), "repo"),
      }),
    ).toThrow(/source repo/i);
    expect(() =>
      validateResumeIdentity(state, {
        ...input,
        worktreePath: path.join(tempDir("relay-other-worktree-"), "worktree"),
      }),
    ).toThrow(/worktree/i);
    expect(() =>
      validateResumeIdentity(state, {
        ...input,
        runnerBranch: "codex/other",
      }),
    ).toThrow(/runner branch/i);
    expect(() =>
      validateResumeIdentity(state, {
        ...input,
        planPath: "docs/plans/other.md",
      }),
    ).toThrow(/plan path/i);
  });

  test("refuses existing state without resume or force", () => {
    const input = createStateInput();
    initializeRelayState(input);

    expect(() => initializeRelayState(input)).toThrow(/--resume or --force/);

    const forced = initializeRelayState({
      ...input,
      baseHead: "def456",
      force: true,
    });

    expect(forced.baseHead).toBe("def456");
    expect(readRelayState(input.worktreePath).baseHead).toBe("def456");
  });

  test("writes task and repair logs with deterministic relay log names", () => {
    const input = createStateInput();
    initializeRelayState(input);

    const taskLog = writeTaskLog(input.worktreePath, input.tasks[0], "task log");
    const repairLog = writeTaskLog(input.worktreePath, input.tasks[0], "repair log", {
      repair: true,
    });

    expect(taskLog).toBe(path.join(input.worktreePath, ".relay", "logs", "1-persist-state.log"));
    expect(repairLog).toBe(path.join(input.worktreePath, ".relay", "logs", "1-persist-state.repair.log"));
    expect(readFileSync(taskLog, "utf8")).toBe("task log");
    expect(readFileSync(repairLog, "utf8")).toBe("repair log");
  });

  test("records a blocked event when state JSON is corrupt", () => {
    const input = createStateInput();
    mkdirSync(path.join(input.worktreePath, ".relay"), { recursive: true });
    writeFileSync(path.join(input.worktreePath, ".relay", "events.jsonl"), "");
    writeFileSync(path.join(input.worktreePath, ".relay", "state.json"), "{ bad json");

    expect(() => readRelayState(input.worktreePath)).toThrow(RelayStateError);

    const events = readRelayEvents(input.worktreePath);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      message: expect.stringContaining("Corrupt relay state JSON"),
      type: "blocked",
    });
  });
});

function createStateInput() {
  const root = tempDir("relay-state-");
  const sourceRepoPath = path.join(root, "source");
  const worktreePath = path.join(root, "worktree");
  mkdirSync(sourceRepoPath, { recursive: true });
  mkdirSync(worktreePath, { recursive: true });
  const tasks = parsePlan(`# Relay

## Phase 1: State

- [ ] Persist state
  - Files:
    - Create: \`tools/relay/src/state.ts\`
- [ ] Resume state
  - Files:
    - Modify: \`tools/relay/src/state.ts\`
`).tasks;

  return {
    baseBranch: "main",
    baseHead: "abc123",
    now: () => new Date("2026-05-21T00:00:00.000Z"),
    planPath: "docs/plans/relay.md",
    runnerBranch: "codex/relay",
    sourceRepoPath,
    tasks,
    worktreePath,
  };
}
