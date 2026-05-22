import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
} from "node:fs";
import path from "node:path";

import { runCli } from "../src/cli";
import {
  DEFAULT_RELAY_ENTRYPOINT,
  DEFAULT_RELAY_STOW_DIR,
  DEFAULT_RELAY_STOW_PACKAGE,
  DEFAULT_RELAY_STOW_TARGET_DIR,
  DEFAULT_RELAY_PLAN_STOW_SOURCE_DIR,
  DEFAULT_LEGACY_RELAY_PLAN_STOW_SOURCE_DIR,
  installRelay,
  RelayInstallError,
} from "../src/install";
import type { CommandResult, CommandSpec } from "../src/types";
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

describe("relay installer", () => {
  test("restows the relay package into the target home directory", async () => {
    const tempRoot = tempDir("relay-install-");
    const stowDir = path.join(tempRoot, "stow");
    const targetDir = path.join(tempRoot, "home");
    const calls: CommandSpec[] = [];

    const result = await installRelay({
      executor: async (spec) => {
        calls.push(spec);
        return commandResult(spec);
      },
      stowDir,
      targetDir,
    });

    expect(result.packageName).toBe(DEFAULT_RELAY_STOW_PACKAGE);
    expect(result.linkPath).toBe(path.join(targetDir, ".local", "bin", "relay"));
    expect(result.targetPath).toBe(path.join(stowDir, "relay", ".local", "bin", "relay"));
    expect(result.skillLinkPath).toBe(
      path.join(targetDir, ".agents", "skills", "relay-plan"),
    );
    expect(result.skillTargetPath).toBe(
      path.join(stowDir, "relay", ".agents", "skills", "relay-plan"),
    );
    expect(calls).toEqual([
      {
        args: ["-d", stowDir, "-t", targetDir, "--restow", DEFAULT_RELAY_STOW_PACKAGE],
        command: "stow",
        cwd: "/Users/ewilliam/Projects/dotfiles",
      },
    ]);
  });

  test("removes known legacy symlinks before restowing relay", async () => {
    const tempRoot = tempDir("relay-install-legacy-");
    const stowDir = path.join(tempRoot, "stow");
    const targetDir = path.join(tempRoot, "home");
    const relayLink = path.join(targetDir, ".local", "bin", "relay");
    const skillLink = path.join(targetDir, ".agents", "skills", "relay-plan");
    mkdirSync(path.dirname(relayLink), { recursive: true });
    mkdirSync(path.dirname(skillLink), { recursive: true });
    symlinkSync(DEFAULT_RELAY_ENTRYPOINT, relayLink);
    symlinkSync(DEFAULT_LEGACY_RELAY_PLAN_STOW_SOURCE_DIR, skillLink);

    await installRelay({
      executor: async (spec) => {
        expect(existsSync(relayLink)).toBe(false);
        expect(existsSync(skillLink)).toBe(false);
        return commandResult(spec);
      },
      stowDir,
      targetDir,
    });
  });

  test("throws when stow cannot restow the relay package", async () => {
    const tempRoot = tempDir("relay-install-fail-");

    await expect(
      installRelay({
        executor: async (spec) =>
          commandResult(spec, {
            exitCode: 1,
            stderr: "existing target is neither a link nor a directory\n",
          }),
        stowDir: path.join(tempRoot, "stow"),
        targetDir: path.join(tempRoot, "home"),
      }),
    ).rejects.toThrow(RelayInstallError);
  });

  test("relay install calls stow and prints the installed package links", async () => {
    const output: string[] = [];

    const exitCode = await runCli(["install"], {
      stdout: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("/Users/ewilliam/.local/bin/relay");
    expect(output.join("\n")).toContain("/Users/ewilliam/.agents/skills/relay-plan");
    expect(realpathSync("/Users/ewilliam/.local/bin/relay")).toBe(DEFAULT_RELAY_ENTRYPOINT);
    expect(realpathSync("/Users/ewilliam/.agents/skills/relay-plan")).toBe(
      DEFAULT_RELAY_PLAN_STOW_SOURCE_DIR,
    );
    expect(DEFAULT_RELAY_STOW_DIR).toBe("/Users/ewilliam/Projects/dotfiles/stow");
    expect(DEFAULT_RELAY_STOW_TARGET_DIR).toBe("/Users/ewilliam");
  });

  test("bootstrap script checks bun after brew bundle", () => {
    const script = readFileSync(
      "/Users/ewilliam/Projects/dotfiles/setup/01-brew.sh",
      "utf8",
    );
    const brewBundleIndex = script.indexOf("brew bundle --file=\"$DOTFILES/Brewfile\"");
    const bunCheckIndex = script.indexOf("bun --version");

    expect(brewBundleIndex).toBeGreaterThan(-1);
    expect(bunCheckIndex).toBeGreaterThan(brewBundleIndex);
    expect(script).toContain("warn");
  });
});

function commandResult(
  spec: CommandSpec,
  overrides: Partial<CommandResult> = {},
): CommandResult {
  return {
    args: spec.args ?? [],
    command: spec.command,
    cwd: spec.cwd,
    durationMs: 1,
    exitCode: 0,
    stderr: "",
    stdout: "",
    timedOut: false,
    ...overrides,
  };
}
