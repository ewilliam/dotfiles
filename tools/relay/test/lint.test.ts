import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runCli } from "../src/cli";
import {
  formatLintReport,
  getLintExitCode,
  lintPlanFile,
  lintPlanText,
} from "../src/lint";
import type { LintFinding } from "../src/types";
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

describe("relay plan linter rules", () => {
  test("reports P0 findings for missing, outside, taskless, and empty plans", () => {
    const repoPath = tempDir("relay-lint-repo-");
    const outsideDir = tempDir("relay-lint-outside-");
    const outsidePlan = path.join(outsideDir, "plan.md");
    writeFileSync(outsidePlan, "# Outside\n\n- [ ] Add task\n");

    const missing = lintPlanFile({
      planPath: "docs/plans/missing.md",
      repoPath,
    });
    const outside = lintPlanFile({
      planPath: outsidePlan,
      repoPath,
    });
    const taskless = lintPlanText("# Empty\n\nNo tasks here.", {
      planPath: "docs/plans/empty.md",
      repoPath,
    });
    const emptyTask = lintPlanText("# Empty task\n\n- [ ]   \n", {
      planPath: "docs/plans/empty-task.md",
      repoPath,
    });

    expect(missing.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("does not exist"), severity: "P0" }),
    );
    expect(outside.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("inside the repo"), severity: "P0" }),
    );
    expect(taskless.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("No parseable"), severity: "P0" }),
    );
    expect(emptyTask.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("empty"), severity: "P0" }),
    );
  });

  test("reports P1 findings for weak unattended execution structure", () => {
    const report = lintPlanText(`# Weak plan

- [ ] Implement auth
`);

    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("phase"), severity: "P1" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("too broad"), severity: "P1" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("acceptance"), severity: "P1" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("file/module"), severity: "P1" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("verification"), severity: "P1" }),
    );
  });

  test("reports P1 when risky manual operations lack stop conditions", () => {
    const report = lintPlanText(`# Risky plan

## Phase 1: Risk

- [ ] Deploy production database migration
  - Files:
    - Modify: \`db/schema.sql\`
  - Acceptance criteria:
    - Migration is prepared.
  - Verification commands:
    - \`bun test\`
  - Commit boundary:
    - \`git add db/schema.sql\`
`);

    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("risky manual"), severity: "P1" }),
    );
  });

  test("allows fully completed plans to pass lint for final verification", () => {
    const report = lintPlanText(`# Completed plan

## Phase 1: Done

- [x] Add focused parser support
  - Files:
    - Modify: \`src/plan.ts\`
  - Acceptance criteria:
    - Parser support works.
  - Verification commands:
    - \`bun test\`
  - Commit boundary:
    - \`git add src/plan.ts\`

## Final PR Checklist

- Verification passes.
`);

    expect(report.findings).not.toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("No unchecked") }),
    );
    expect(getLintExitCode(report.findings, { allowLintWarnings: false })).toBe(0);
  });

  test("reports P2 findings for clarity issues", () => {
    const report = lintPlanText(`# No final checklist

## Phase 1: Many Tasks

- [ ] ${"Add a very long task name ".repeat(7)}
  - Files:
    - Modify: \`src/a.ts\`
  - Acceptance criteria:
    - A works.
  - Verification commands:
    - \`bun test\`
- [ ] Add second slice
  - Files:
    - Modify: \`src/b.ts\`
  - Acceptance criteria:
    - B works.
  - Verification commands:
    - \`bun test\`
- [ ] Add third slice
  - Files:
    - Modify: \`src/c.ts\`
  - Acceptance criteria:
    - C works.
  - Verification commands:
    - \`bun test\`
- [ ] Add fourth slice
  - Files:
    - Modify: \`src/d.ts\`
  - Acceptance criteria:
    - D works.
  - Verification commands:
    - \`bun test\`
- [ ] Add fifth slice
  - Files:
    - Modify: \`src/e.ts\`
  - Acceptance criteria:
    - E works.
  - Verification commands:
    - \`bun test\`
- [ ] Add sixth slice
  - Files:
    - Modify: \`src/f.ts\`
  - Acceptance criteria:
    - F works.
  - Verification commands:
    - \`bun test\`
- [ ] Add seventh slice
  - Files:
    - Modify: \`src/g.ts\`
  - Acceptance criteria:
    - G works.
  - Verification commands:
    - \`bun test\`
`);

    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("more than six"), severity: "P2" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("longer than 140"), severity: "P2" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("final PR checklist"), severity: "P2" }),
    );
    expect(report.findings).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("commit boundary"), severity: "P2" }),
    );
  });
});

describe("relay plan linter output and exit policy", () => {
  test("uses nonzero exit codes for P0 and P1 unless warnings are allowed", () => {
    const p0: LintFinding[] = [
      { message: "Plan is missing.", remediation: "Create it.", severity: "P0" },
    ];
    const p1: LintFinding[] = [
      { message: "Plan needs phases.", remediation: "Add phases.", severity: "P1" },
    ];
    const p2: LintFinding[] = [
      { message: "Plan could be clearer.", remediation: "Clarify it.", severity: "P2" },
    ];

    expect(getLintExitCode(p0, { allowLintWarnings: true })).toBe(1);
    expect(getLintExitCode(p1, { allowLintWarnings: false })).toBe(1);
    expect(getLintExitCode(p1, { allowLintWarnings: true })).toBe(0);
    expect(getLintExitCode(p2, { allowLintWarnings: false })).toBe(0);
  });

  test("formats severity, location, finding text, and remediation", () => {
    const report = lintPlanText(`# Weak plan

- [ ] Implement auth
`);

    const output = formatLintReport(report);

    expect(output).toContain("[P1]");
    expect(output).toContain("line 3");
    expect(output).toContain("Implement auth");
    expect(output).toContain("Remediation:");
  });

  test("dispatches relay lint-plan through the default CLI handler", async () => {
    const repoPath = tempDir("relay-cli-lint-");
    const planDir = path.join(repoPath, "docs", "plans");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(
      path.join(planDir, "feature.md"),
      `# Feature

## Phase 1: Foundation

- [ ] Add focused parser support
  - Files:
    - Modify: \`src/plan.ts\`
  - Acceptance criteria:
    - Parser support works.
  - Verification commands:
    - \`bun test\`
  - Commit boundary:
    - \`git add src/plan.ts\`

## Final PR Checklist

- Verification passes.
`,
    );
    const output: string[] = [];

    const exitCode = await runCli([
      "lint-plan",
      "--repo",
      repoPath,
      "--plan",
      "docs/plans/feature.md",
    ], {
      stderr: (message) => output.push(`stderr:${message}`),
      stdout: (message) => output.push(message),
    });

    expect(exitCode).toBe(0);
    expect(output.join("\n")).toContain("Plan lint passed");
  });
});
