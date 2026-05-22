import { existsSync, readFileSync } from "node:fs";

import { isPathInside, resolvePlanPath, resolveRepoPath } from "./paths";
import { parsePlan } from "./plan";
import type {
  LintFinding,
  LintReport,
  LintSeverity,
  PlanDocument,
  PlanTask,
  RelayOptions,
} from "./types";

export interface LintPlanFileOptions {
  repoPath: string;
  planPath: string;
  allowPlanOutsideRepo?: boolean;
}

export interface LintPlanTextOptions {
  repoPath?: string;
  planPath?: string;
}

export interface LintExitOptions {
  allowLintWarnings: boolean;
}

export interface LintIo {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

const RISKY_OPERATION_RE =
  /\b(secret|credential|production|deploy|destructive|database)\b/i;
const STOP_CONDITION_RE = /\b(blockers?|blocked|stop if|stop condition)\b/i;

export function lintPlanFile(options: LintPlanFileOptions): LintReport {
  const repoPath = resolveRepoPath(options.repoPath);
  const planPath = resolvePlanPath(repoPath, options.planPath);
  const findings: LintFinding[] = [];

  if (!options.allowPlanOutsideRepo && !isPathInside(repoPath, planPath)) {
    findings.push({
      message: "Plan path must be inside the repo unless an explicit override is provided.",
      remediation: "Move the plan under the repository or call the linter with an explicit outside-repo override.",
      severity: "P0",
    });
  }

  if (!existsSync(planPath)) {
    return {
      findings: [
        ...findings,
        {
          message: "Plan file does not exist.",
          remediation: "Create the plan file or pass the correct --plan path.",
          severity: "P0",
        },
      ],
      planPath: options.planPath,
    };
  }

  const textReport = lintPlanText(readFileSync(planPath, "utf8"), {
    planPath: options.planPath,
    repoPath,
  });

  return {
    ...textReport,
    findings: [...findings, ...textReport.findings],
  };
}

export function lintPlanText(
  markdown: string,
  options: LintPlanTextOptions = {},
): LintReport {
  const document = parsePlan(markdown);
  const findings = lintPlanDocument(document);

  return {
    document,
    findings,
    planPath: options.planPath,
  };
}

export function lintPlanDocument(document: PlanDocument): LintFinding[] {
  const findings: LintFinding[] = [];

  if (document.tasks.length === 0) {
    findings.push({
      message: "No parseable top-level checkbox tasks were found.",
      remediation: "Add one top-level '- [ ]' checkbox per Relay slice.",
      severity: "P0",
    });
  }

  if (document.tasks.length > 0 && !document.tasks.some((task) => !task.checked)) {
    findings.push({
      message: "No unchecked executable tasks were found.",
      remediation: "Leave at least one top-level task unchecked before running Relay.",
      severity: "P0",
    });
  }

  for (const task of document.tasks) {
    if (task.text.trim().length === 0) {
      findings.push(taskFinding("P0", task, {
        message: "Task text is empty.",
        remediation: "Add concise task text after the checkbox.",
      }));
    }
  }

  findings.push(...lintMalformedNestedCheckboxes(document));

  if (document.tasks.length > 0 && document.phases.length === 0) {
    findings.push({
      message: "Plan has executable tasks but no phase headings.",
      remediation: "Group tasks under '## Phase N: Name' headings.",
      severity: "P1",
    });
  }

  for (const task of document.tasks) {
    if (isBroadTaskText(task.text)) {
      findings.push(taskFinding("P1", task, {
        message: "Task text is too broad for unattended execution.",
        remediation: "Split this into smaller slices with concrete file ownership and verification.",
      }));
    }

    if (!hasDetailSignal(task, "acceptance criteria")) {
      findings.push(taskFinding("P1", task, {
        message: "Task is missing acceptance criteria.",
        remediation: "Add an Acceptance criteria section under this task.",
      }));
    }

    if (!hasFileOwnershipSignal(task)) {
      findings.push(taskFinding("P1", task, {
        message: "Task is missing file/module ownership hints.",
        remediation: "Add Files, Create, Modify, or Delete details under this task.",
      }));
    }

    if (!hasDetailSignal(task, "verification commands")) {
      findings.push(taskFinding("P1", task, {
        message: "Task is missing verification commands.",
        remediation: "Add a Verification commands section with commands to run for this slice.",
      }));
    }

    if (hasRiskyOperation(task) && !hasStopCondition(task)) {
      findings.push(taskFinding("P1", task, {
        message: "Task includes risky manual operations without stop conditions.",
        remediation: "Add a Blockers section that says when Relay must stop instead of guessing.",
      }));
    }

    if (task.text.length > 140) {
      findings.push(taskFinding("P2", task, {
        message: "Task text is longer than 140 characters.",
        remediation: "Shorten the checkbox text and move details into the task body.",
      }));
    }

    if (!hasDetailSignal(task, "commit boundary")) {
      findings.push(taskFinding("P2", task, {
        message: "Task commit boundary is unclear.",
        remediation: "Add a Commit boundary section listing the exact git add and commit commands.",
      }));
    }
  }

  for (const phase of document.phases) {
    if (phase.tasks.length > 6) {
      findings.push({
        line: phase.line,
        message: "Phase has more than six tasks.",
        phaseOrdinal: phase.ordinal,
        phaseTitle: phase.title,
        remediation: "Split the phase into smaller phases with six or fewer slices.",
        severity: "P2",
      });
    }
  }

  if (!hasFinalPrChecklist(document)) {
    findings.push({
      message: "Plan is missing a final PR checklist.",
      remediation: "Add a final PR checklist covering verification, branch state, and PR readiness.",
      severity: "P2",
    });
  }

  return findings;
}

export function getLintExitCode(
  findings: LintFinding[],
  options: LintExitOptions,
): number {
  if (findings.some((finding) => finding.severity === "P0")) {
    return 1;
  }
  if (!options.allowLintWarnings && findings.some((finding) => finding.severity === "P1")) {
    return 1;
  }
  return 0;
}

export function formatLintReport(report: LintReport): string {
  const exitCode = getLintExitCode(report.findings, { allowLintWarnings: false });
  const header =
    report.findings.length === 0
      ? `Plan lint passed: ${report.planPath ?? "<inline plan>"}`
      : exitCode === 0
        ? `Plan lint passed with warnings: ${report.planPath ?? "<inline plan>"}`
        : `Plan lint failed: ${report.planPath ?? "<inline plan>"}`;

  if (report.findings.length === 0) {
    return header;
  }

  const lines = [header, ""];
  for (const finding of report.findings) {
    lines.push(`[${finding.severity}] ${formatFindingLocation(finding)}: ${finding.message}`);
    if (finding.taskText) {
      lines.push(`Task: ${finding.taskText}`);
    }
    lines.push(`Remediation: ${finding.remediation}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export async function runLintPlan(
  options: RelayOptions,
  io: LintIo = {},
): Promise<number> {
  if (!options.planPath) {
    throw new Error("lint-plan requires a plan path");
  }

  const report = lintPlanFile({
    planPath: options.planPath,
    repoPath: options.repoPath,
  });
  const exitCode = getLintExitCode(report.findings, {
    allowLintWarnings: options.allowLintWarnings,
  });
  const output = formatLintReport(report);

  if (exitCode === 0) {
    (io.stdout ?? console.log)(output);
  } else {
    (io.stderr ?? console.error)(output);
  }

  return exitCode;
}

function taskFinding(
  severity: LintSeverity,
  task: PlanTask,
  input: Pick<LintFinding, "message" | "remediation">,
): LintFinding {
  return {
    ...input,
    line: task.line,
    phaseOrdinal: task.phaseOrdinal,
    phaseTitle: task.phaseTitle,
    severity,
    taskId: task.id,
    taskOrdinal: task.ordinal,
    taskText: task.text,
  };
}

function lintMalformedNestedCheckboxes(document: PlanDocument): LintFinding[] {
  return document.raw.split(/\r?\n/).flatMap((line, index) => {
    if (/^\s+- \[( |x|X)\]\s+/.test(line) && !line.startsWith("- ")) {
      return [{
        line: index + 1,
        message: "Nested checkbox tasks are not executable Relay tasks.",
        remediation: "Convert nested checkboxes to normal bullets or promote them to top-level tasks.",
        severity: "P0" as const,
      }];
    }
    return [];
  });
}

function hasDetailSignal(task: PlanTask, signal: string): boolean {
  const expected = signal.toLowerCase();
  return task.detailLines.some((line) => {
    const normalized = line
      .trim()
      .replace(/^[-*]\s+/, "")
      .replace(/:$/, "")
      .toLowerCase();
    return normalized === expected || normalized.startsWith(`${expected}:`);
  });
}

function hasFileOwnershipSignal(task: PlanTask): boolean {
  return task.detailLines.some((line) => {
    const normalized = line.trim().toLowerCase();
    return (
      /^[-*]\s+files:/.test(normalized) ||
      /^files:/.test(normalized) ||
      /^[-*]\s+(create|modify|delete):/.test(normalized)
    );
  });
}

function hasRiskyOperation(task: PlanTask): boolean {
  return RISKY_OPERATION_RE.test([task.text, ...task.detailLines].join("\n"));
}

function hasStopCondition(task: PlanTask): boolean {
  return STOP_CONDITION_RE.test(task.detailLines.join("\n"));
}

function isBroadTaskText(text: string): boolean {
  const normalized = text
    .replace(/[`*_~]/g, "")
    .replace(/[^\w\s/-]/g, "")
    .trim()
    .toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length <= 3 && /^(implement|build|create|add)\b/.test(normalized)) {
    return true;
  }

  return /^(implement|build|create|add)\s+(auth|authentication|dashboard|billing|feature|ui|api)$/.test(
    normalized,
  );
}

function hasFinalPrChecklist(document: PlanDocument): boolean {
  return /^##+\s+(final\s+)?pr checklist\b/im.test(document.raw);
}

function formatFindingLocation(finding: LintFinding): string {
  const parts: string[] = [];
  if (finding.phaseTitle) {
    parts.push(finding.phaseTitle);
  } else if (finding.phaseOrdinal) {
    parts.push(`Phase ${finding.phaseOrdinal}`);
  }
  if (finding.taskOrdinal) {
    parts.push(`task ${finding.taskOrdinal}`);
  }
  if (finding.line) {
    parts.push(`line ${finding.line}`);
  }
  return parts.join(", ") || "plan";
}
