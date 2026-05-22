import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  createHelpText,
  parseRelayArgs,
  RelayCliError,
  runCli,
  type RelayHandlers,
} from "../src/cli";

describe("relay cli parser", () => {
  test("parses the default run command with repo, plan, verification, resume, pr, and notifications", () => {
    const options = parseRelayArgs([
      "--repo",
      "/repo",
      "--plan",
      "docs/plans/feature.md",
      "--pr",
      "--verify",
      "bun test",
      "--verify",
      "bun lint",
      "--final-verify",
      "bun test",
      "--resume",
      "--notify-each-slice",
    ]);

    expect(options).toEqual({
      allowDirtyBase: false,
      allowLintWarnings: false,
      command: "run",
      finalVerifyCommands: ["bun test"],
      force: false,
      notifyEachSlice: true,
      planPath: "docs/plans/feature.md",
      pr: true,
      repoPath: "/repo",
      resume: true,
      verifyCommands: ["bun test", "bun lint"],
    });
  });

  test("defaults the run repo to the current working directory", () => {
    const options = parseRelayArgs(["--plan", "docs/plans/feature.md"], {
      cwd: "/repo/default",
    });

    expect(options.command).toBe("run");
    expect(options.repoPath).toBe("/repo/default");
  });

  test("parses lint-plan with allow-lint-warnings", () => {
    const options = parseRelayArgs([
      "lint-plan",
      "--repo",
      "/repo",
      "--plan",
      "docs/plans/feature.md",
      "--allow-lint-warnings",
    ]);

    expect(options.command).toBe("lint-plan");
    expect(options.repoPath).toBe("/repo");
    expect(options.planPath).toBe("docs/plans/feature.md");
    expect(options.allowLintWarnings).toBe(true);
    expect(options.verifyCommands).toEqual([]);
    expect(options.finalVerifyCommands).toEqual([]);
  });

  test("parses install", () => {
    const options = parseRelayArgs(["install"], { cwd: "/repo" });

    expect(options.command).toBe("install");
    expect(options.repoPath).toBe("/repo");
    expect(options.planPath).toBeUndefined();
  });

  test("rejects invalid flag combinations and malformed arguments", () => {
    expect(() => parseRelayArgs(["--repo"])).toThrow(RelayCliError);
    expect(() => parseRelayArgs(["--bogus"])).toThrow("Unknown flag: --bogus");
    expect(() => parseRelayArgs(["--repo", "/one", "--repo", "/two"])).toThrow(
      "Flag cannot be repeated: --repo",
    );
    expect(() => parseRelayArgs(["--resume", "--force"])).toThrow(
      "--resume cannot be combined with --force",
    );
  });

  test("help text includes relay commands, state, and install target without old names", () => {
    const help = createHelpText();

    expect(help).toContain("relay");
    expect(help).toContain("lint-plan");
    expect(help).toContain("install");
    expect(help).toContain(".relay");
    expect(help).toContain("~/.local/bin/relay");
    expect(help).not.toContain(["codex", "runner"].join("-"));
  });

  test("README documents the same relay commands exposed by help", () => {
    const help = createHelpText();
    const readme = readFileSync("/Users/ewilliam/Projects/dotfiles/README.md", "utf8");

    for (const command of ["relay lint-plan", "relay install"]) {
      expect(help).toContain(command);
      expect(readme).toContain(command);
    }
    expect(readme).toContain("relay --repo");
    expect(readme).toContain("tools/relay/bin/relay.ts");
    expect(readme).toContain("~/.local/bin/relay");
  });
});

describe("relay cli dispatch", () => {
  test("relay --help exits zero and prints usage", async () => {
    const output: string[] = [];

    const exitCode = await runCli(["--help"], {
      stderr: (message) => output.push(`stderr:${message}`),
      stdout: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Usage: relay");
  });

  test("dispatches lint-plan through an injected handler", async () => {
    const calls: string[] = [];
    const handlers: RelayHandlers = {
      install: async () => {
        calls.push("install");
        return 0;
      },
      lintPlan: async (options) => {
        calls.push(`${options.command}:${options.repoPath}:${options.planPath}`);
        return 23;
      },
      run: async () => {
        calls.push("run");
        return 0;
      },
    };

    const exitCode = await runCli([
      "lint-plan",
      "--repo",
      "/repo",
      "--plan",
      "docs/plans/feature.md",
    ], {
      handlers,
      stderr: () => {},
      stdout: () => {},
    });

    expect(exitCode).toBe(23);
    expect(calls).toEqual(["lint-plan:/repo:docs/plans/feature.md"]);
  });
});
