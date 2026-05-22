import { afterEach, describe, expect, test } from "bun:test";
import path from "node:path";

import { derivePlanSlug, deriveWorktreePath, getRelayPaths } from "../src/paths";
import { runCommand } from "../src/shell";
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

describe("relay foundation", () => {
  test("derivePlanSlug returns the dated plan slug", () => {
    expect(derivePlanSlug("docs/plans/2026-05-21-relay.md")).toBe("relay");
  });

  test("worktree paths use the repo name and plan slug, while state paths use .relay", () => {
    const homeDir = tempDir("relay-home-");
    const repoPath = path.join(homeDir, "repos", "dotfiles");

    const worktreePath = deriveWorktreePath({
      homeDir,
      planPath: "docs/plans/2026-05-21-relay.md",
      repoPath,
    });

    expect(worktreePath).toBe(
      path.join(homeDir, ".codex", "worktrees", "dotfiles", "relay"),
    );

    const relayPaths = getRelayPaths(worktreePath);
    expect(relayPaths.relayDir).toBe(path.join(worktreePath, ".relay"));
    expect(relayPaths.stateFile).toBe(path.join(worktreePath, ".relay", "state.json"));
    expect(relayPaths.eventsFile).toBe(path.join(worktreePath, ".relay", "events.jsonl"));
    expect(relayPaths.logsDir).toBe(path.join(worktreePath, ".relay", "logs"));
  });

  test("runCommand captures output, exit code, duration, and injected environment", async () => {
    const cwd = tempDir("relay-command-");

    const result = await runCommand(process.execPath, [
      "-e",
      "console.log(process.env.RELAY_TEST_VALUE); console.error('relay-stderr'); process.exit(7);",
    ], {
      cwd,
      env: {
        RELAY_TEST_VALUE: "relay-stdout",
      },
    });

    expect(result.command).toBe(process.execPath);
    expect(result.args).toEqual([
      "-e",
      "console.log(process.env.RELAY_TEST_VALUE); console.error('relay-stderr'); process.exit(7);",
    ]);
    expect(result.cwd).toBe(cwd);
    expect(result.stdout).toBe("relay-stdout\n");
    expect(result.stderr).toBe("relay-stderr\n");
    expect(result.exitCode).toBe(7);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.timedOut).toBe(false);
  });
});
