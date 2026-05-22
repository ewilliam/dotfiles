import {
  lstatSync,
  mkdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_RELAY_BIN_DIR = "/Users/ewilliam/.local/bin";
export const DEFAULT_RELAY_ENTRYPOINT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "bin",
  "relay.ts",
);

export interface InstallRelayInput {
  binDir?: string;
  entrypointPath?: string;
}

export interface InstallRelayResult {
  linkPath: string;
  targetPath: string;
}

export class RelayInstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayInstallError";
  }
}

export function installRelay(input: InstallRelayInput = {}): InstallRelayResult {
  const binDir = path.resolve(input.binDir ?? DEFAULT_RELAY_BIN_DIR);
  const targetPath = path.resolve(input.entrypointPath ?? DEFAULT_RELAY_ENTRYPOINT);
  const linkPath = path.join(binDir, "relay");

  mkdirSync(binDir, { recursive: true });
  const existing = lstatIfExists(linkPath);
  if (existing) {
    const stat = existing;
    if (!stat.isSymbolicLink()) {
      throw new RelayInstallError(`Refusing to overwrite non-symlink relay file: ${linkPath}`);
    }
    unlinkSync(linkPath);
  }

  symlinkSync(targetPath, linkPath);

  return {
    linkPath,
    targetPath,
  };
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
