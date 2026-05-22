import { afterEach, describe, expect, test } from "bun:test";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { runCli } from "../src/cli";
import {
  DEFAULT_RELAY_ENTRYPOINT,
  installRelay,
  RelayInstallError,
} from "../src/install";
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
  test("creates the bin directory and symlinks relay to the source entrypoint", () => {
    const binDir = path.join(tempDir("relay-install-"), "bin");

    const result = installRelay({ binDir });

    expect(result.linkPath).toBe(path.join(binDir, "relay"));
    expect(result.targetPath).toBe(DEFAULT_RELAY_ENTRYPOINT);
    expect(lstatSync(result.linkPath).isSymbolicLink()).toBe(true);
    expect(readlinkSync(result.linkPath)).toBe(DEFAULT_RELAY_ENTRYPOINT);
  });

  test("replaces stale symlinks but refuses to overwrite real files", () => {
    const binDir = path.join(tempDir("relay-install-stale-"), "bin");
    mkdirSync(binDir, { recursive: true });
    symlinkSync("/tmp/stale-relay", path.join(binDir, "relay"));

    installRelay({ binDir });

    expect(readlinkSync(path.join(binDir, "relay"))).toBe(DEFAULT_RELAY_ENTRYPOINT);

    const realFileBinDir = path.join(tempDir("relay-install-real-file-"), "bin");
    mkdirSync(realFileBinDir, { recursive: true });
    writeFileSync(path.join(realFileBinDir, "relay"), "not a symlink\n");

    expect(() => installRelay({ binDir: realFileBinDir })).toThrow(RelayInstallError);
  });

  test("relay install calls the installer and prints the installed symlink path", async () => {
    const output: string[] = [];

    const exitCode = await runCli(["install"], {
      stdout: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("/Users/ewilliam/.local/bin/relay");
    expect(readlinkSync("/Users/ewilliam/.local/bin/relay")).toBe(DEFAULT_RELAY_ENTRYPOINT);
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
