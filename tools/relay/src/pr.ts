import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { pushRelayBranch } from "./git";
import { getRelayPaths } from "./paths";
import { readRelayEvents, recordPullRequest } from "./state";
import { runCommand } from "./shell";
import type {
  CommandExecutor,
  CommandResult,
  PlanDocument,
  RelayEvent,
  RelayState,
  VerificationResult,
} from "./types";

export interface PublishRelayPullRequestInput {
  branch: string;
  document: PlanDocument;
  repoPath: string;
  state: RelayState;
  worktreePath: string;
  executor?: CommandExecutor;
  now?: () => Date;
}

export interface RelayPullRequestResult {
  bodyPath: string;
  reused: boolean;
  url: string;
}

export class RelayPrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayPrError";
  }
}

export function buildRelayPrTitle(document: Pick<PlanDocument, "title">): string {
  return document.title?.trim() || "Relay implementation";
}

export function buildRelayPrBody(input: {
  document: PlanDocument;
  events?: RelayEvent[];
  state: RelayState;
}): string {
  const blockedEvents = (input.events ?? []).filter((event) => event.type === "blocked");

  return [
    `# ${buildRelayPrTitle(input.document)}`,
    "",
    "## Completed Phases",
    ...formatCompletedPhases(input.document),
    "",
    "## Commits Created",
    ...formatCommits(input.state),
    "",
    "## Verification Results",
    ...formatVerificationResults(input.state.verificationResults),
    "",
    "## Known Caveats",
    ...formatKnownCaveats(blockedEvents),
    "",
    "## Blocker History",
    ...formatBlockerHistory(blockedEvents),
    "",
  ].join("\n");
}

export async function publishRelayPullRequest(
  input: PublishRelayPullRequestInput,
): Promise<RelayPullRequestResult> {
  const executor = input.executor ?? runCommand;
  const title = buildRelayPrTitle(input.document);
  const bodyPath = writePrBodyFile(input.worktreePath, buildRelayPrBody({
    document: input.document,
    events: readRelayEvents(input.worktreePath),
    state: input.state,
  }));

  await ensureGhAuthenticated(input.worktreePath, executor);
  await pushRelayBranch({
    branch: input.branch,
    executor,
    repoPath: input.repoPath,
  });

  const existing = await findExistingPullRequest(input.worktreePath, input.branch, executor);
  const result = existing ?? await createPullRequest(input.worktreePath, {
    bodyPath,
    branch: input.branch,
    executor,
    title,
  });

  recordPullRequest(input.worktreePath, input.state, {
    now: input.now,
    reused: result.reused,
    url: result.url,
  });

  return {
    bodyPath,
    reused: result.reused,
    url: result.url,
  };
}

function writePrBodyFile(worktreePath: string, body: string): string {
  const paths = getRelayPaths(worktreePath);
  mkdirSync(paths.relayDir, { recursive: true });
  const bodyPath = path.join(paths.relayDir, "pr-body.md");
  writeFileSync(bodyPath, body, "utf8");
  return bodyPath;
}

async function ensureGhAuthenticated(
  worktreePath: string,
  executor: CommandExecutor,
): Promise<void> {
  const result = await runGh(worktreePath, ["auth", "status"], executor);
  if (result.exitCode !== 0) {
    throw new RelayPrError(
      `gh auth status failed with exit ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }
}

async function findExistingPullRequest(
  worktreePath: string,
  branch: string,
  executor: CommandExecutor,
): Promise<Pick<RelayPullRequestResult, "reused" | "url"> | undefined> {
  const result = await runGh(worktreePath, [
    "pr",
    "view",
    branch,
    "--json",
    "url",
  ], executor);
  if (result.exitCode !== 0) {
    return undefined;
  }

  return {
    reused: true,
    url: parsePrUrl(result.stdout, "gh pr view"),
  };
}

async function createPullRequest(
  worktreePath: string,
  input: {
    bodyPath: string;
    branch: string;
    executor: CommandExecutor;
    title: string;
  },
): Promise<Pick<RelayPullRequestResult, "reused" | "url">> {
  const result = await runGh(worktreePath, [
    "pr",
    "create",
    "--head",
    input.branch,
    "--title",
    input.title,
    "--body-file",
    input.bodyPath,
  ], input.executor);
  if (result.exitCode !== 0) {
    throw new RelayPrError(
      `gh pr create failed with exit ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }

  return {
    reused: false,
    url: parsePrUrl(result.stdout, "gh pr create"),
  };
}

function runGh(
  worktreePath: string,
  args: string[],
  executor: CommandExecutor,
): Promise<CommandResult> {
  return executor({
    args,
    command: "gh",
    cwd: worktreePath,
  });
}

function parsePrUrl(stdout: string, command: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new RelayPrError(`${command} did not return a pull request URL.`);
  }

  try {
    const parsed = JSON.parse(trimmed) as { url?: unknown };
    if (typeof parsed.url === "string" && parsed.url.length > 0) {
      return parsed.url;
    }
  } catch {
    // Plain URL output from gh pr create is accepted below.
  }

  const firstLine = trimmed.split(/\r?\n/)[0]?.trim();
  if (!firstLine) {
    throw new RelayPrError(`${command} did not return a pull request URL.`);
  }

  return firstLine;
}

function formatCompletedPhases(document: PlanDocument): string[] {
  if (document.phases.length === 0) {
    const completed = document.tasks.filter((task) => task.checked).length;
    return [`- Unphased tasks: ${completed}/${document.tasks.length} tasks complete`];
  }

  return document.phases.map((phase) => {
    const completed = phase.tasks.filter((task) => task.checked).length;
    return `- ${phase.title}: ${completed}/${phase.tasks.length} tasks complete`;
  });
}

function formatCommits(state: RelayState): string[] {
  if (state.commits.length === 0) {
    return ["- None."];
  }

  return state.commits.map((commit) => `- ${commit.sha} ${commit.message}`);
}

function formatVerificationResults(results: VerificationResult[]): string[] {
  if (results.length === 0) {
    return ["- None recorded."];
  }

  return results.map((result) => {
    const status = result.passed ? "PASS" : "FAIL";
    const scope = result.scope ? ` (${result.scope})` : "";
    return `- ${status} \`${result.command}\`${scope}`;
  });
}

function formatKnownCaveats(blockedEvents: RelayEvent[]): string[] {
  if (blockedEvents.length === 0) {
    return ["- None."];
  }

  return ["- Earlier blockers were recorded; see blocker history below."];
}

function formatBlockerHistory(blockedEvents: RelayEvent[]): string[] {
  if (blockedEvents.length === 0) {
    return ["- None."];
  }

  return blockedEvents.map((event) => `- ${event.timestamp}: ${event.message ?? "blocked"}`);
}
