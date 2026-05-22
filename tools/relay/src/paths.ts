import os from "node:os";
import path from "node:path";

export const RELAY_STATE_DIR_NAME = ".relay";
export const RELAY_LOGS_DIR_NAME = "logs";
export const RELAY_STATE_FILE_NAME = "state.json";
export const RELAY_EVENTS_FILE_NAME = "events.jsonl";

export interface WorktreePathInput {
  repoPath: string;
  planPath: string;
  homeDir?: string;
}

export interface RelayPaths {
  relayDir: string;
  stateFile: string;
  eventsFile: string;
  logsDir: string;
}

export function resolveRepoPath(repoPath: string): string {
  return path.resolve(repoPath);
}

export function resolvePlanPath(repoPath: string, planPath: string): string {
  return path.isAbsolute(planPath)
    ? path.resolve(planPath)
    : path.resolve(repoPath, planPath);
}

export function derivePlanSlug(planPath: string): string {
  const extension = path.extname(planPath);
  const fileName = path.basename(planPath, extension);
  const withoutDate = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return slugify(withoutDate || fileName || "plan");
}

export function deriveWorktreePath(input: WorktreePathInput): string {
  const repoName = path.basename(path.resolve(input.repoPath));
  const planSlug = derivePlanSlug(input.planPath);
  return path.join(
    input.homeDir ?? os.homedir(),
    ".codex",
    "worktrees",
    repoName,
    planSlug,
  );
}

export function getRelayPaths(worktreePath: string): RelayPaths {
  const relayDir = path.join(worktreePath, RELAY_STATE_DIR_NAME);
  return {
    relayDir,
    stateFile: path.join(relayDir, RELAY_STATE_FILE_NAME),
    eventsFile: path.join(relayDir, RELAY_EVENTS_FILE_NAME),
    logsDir: path.join(relayDir, RELAY_LOGS_DIR_NAME),
  };
}

export function isPathInside(parentPath: string, candidatePath: string): boolean {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertPathInside(
  parentPath: string,
  candidatePath: string,
  label = "path",
): string {
  const resolved = path.resolve(candidatePath);
  if (!isPathInside(parentPath, resolved)) {
    throw new Error(`${label} must be inside ${path.resolve(parentPath)}: ${resolved}`);
  }
  return resolved;
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "plan";
}
