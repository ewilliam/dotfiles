import {
  lstatSync,
  readlinkSync,
  unlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCommand } from "./shell";
import type { CommandExecutor } from "./types";

export const DEFAULT_DOTFILES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
export const DEFAULT_RELAY_STOW_DIR = path.join(DEFAULT_DOTFILES_DIR, "stow");
export const DEFAULT_RELAY_STOW_TARGET_DIR = os.homedir();
export const DEFAULT_RELAY_STOW_PACKAGE = "relay";
export const DEFAULT_RELAY_ENTRYPOINT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "bin",
  "relay.ts",
);
export const DEFAULT_RELAY_PLAN_STOW_SOURCE_DIR = path.join(
  DEFAULT_RELAY_STOW_DIR,
  DEFAULT_RELAY_STOW_PACKAGE,
  ".agents",
  "skills",
  "relay-plan",
);
export const DEFAULT_LEGACY_RELAY_PLAN_STOW_SOURCE_DIR = path.join(
  DEFAULT_RELAY_STOW_DIR,
  "agents",
  ".agents",
  "skills",
  "relay-plan",
);
export const DEFAULT_LEGACY_RELAY_PLAN_REPO_SOURCE_DIR = path.join(
  DEFAULT_DOTFILES_DIR,
  "tools",
  "relay",
  "skills",
  "relay-plan",
);

export interface InstallRelayInput {
  executor?: CommandExecutor;
  stowDir?: string;
  targetDir?: string;
}

export interface InstallRelayResult {
  linkPath: string;
  packageName: string;
  skillLinkPath: string;
  skillTargetPath: string;
  stowDir: string;
  targetPath: string;
  targetDir: string;
}

export class RelayInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayInstallError";
  }
}

export async function installRelay(input: InstallRelayInput = {}): Promise<InstallRelayResult> {
  const executor = input.executor ?? runCommand;
  const packageName = DEFAULT_RELAY_STOW_PACKAGE;
  const stowDir = path.resolve(input.stowDir ?? DEFAULT_RELAY_STOW_DIR);
  const targetDir = path.resolve(input.targetDir ?? DEFAULT_RELAY_STOW_TARGET_DIR);
  const linkPath = path.join(targetDir, ".local", "bin", "relay");
  const targetPath = path.join(stowDir, packageName, ".local", "bin", "relay");
  const skillLinkPath = path.join(targetDir, ".agents", "skills", "relay-plan");
  const skillTargetPath = path.join(stowDir, packageName, ".agents", "skills", "relay-plan");

  removeKnownLegacySymlink({
    allowedTargets: [DEFAULT_RELAY_ENTRYPOINT],
    linkPath,
  });
  removeKnownLegacySymlink({
    allowedTargets: [
      DEFAULT_LEGACY_RELAY_PLAN_STOW_SOURCE_DIR,
      DEFAULT_LEGACY_RELAY_PLAN_REPO_SOURCE_DIR,
    ],
    linkPath: skillLinkPath,
  });

  const result = await executor({
    args: ["-d", stowDir, "-t", targetDir, "--restow", packageName],
    command: "stow",
    cwd: DEFAULT_DOTFILES_DIR,
  });

  if (result.exitCode !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.exitCode}`;
    throw new RelayInstallError(`stow failed for ${packageName}: ${detail}`);
  }

  return {
    linkPath,
    packageName,
    skillLinkPath,
    skillTargetPath,
    stowDir,
    targetPath,
    targetDir,
  };
}

interface RemoveKnownLegacySymlinkInput {
  allowedTargets: string[];
  linkPath: string;
}

function removeKnownLegacySymlink(input: RemoveKnownLegacySymlinkInput): void {
  const existing = lstatIfExists(input.linkPath);
  if (!existing?.isSymbolicLink()) {
    return;
  }

  const rawTarget = readlinkSync(input.linkPath);
  const resolvedTarget = path.resolve(path.dirname(input.linkPath), rawTarget);
  const isKnownLegacyTarget = input.allowedTargets.some(
    (target) => path.resolve(target) === resolvedTarget,
  );

  if (isKnownLegacyTarget) {
    unlinkSync(input.linkPath);
  }
}

function lstatIfExists(candidate: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}
