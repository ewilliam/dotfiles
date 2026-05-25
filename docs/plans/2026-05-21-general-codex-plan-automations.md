# General Codex Plan Automations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a project-agnostic Codex automation generator that turns any local implementation plan into a recurring Codex automation.

**Architecture:** Build a dependency-free Node.js ESM CLI whose source is versioned in this dotfiles repo and installed through a symlink in `~/.local/bin`. The CLI validates the repository and plan paths, renders Codex automation TOML into `$CODEX_HOME` or `~/.codex`, and uses a generic prompt contract that learns project details from each target repository at run time. A personal Codex skill documents when future agents should use the CLI.

**Tech Stack:** Node.js ESM, Node built-in test runner, Codex automation TOML files, dotfiles-managed install symlink, personal Codex skills.

---

## File Structure

- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/src/plan-automation.mjs`
  - Pure builder functions for identity derivation, input validation, prompt creation, TOML rendering, and file writing.
- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin/codex-plan-automation.mjs`
  - CLI parser and executable entrypoint.
- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs`
  - Node test coverage for builder behavior, CLI parsing, symlink execution, path validation, and overwrite protection.
- Create or update symlink: `/Users/ewilliam/.local/bin/codex-plan-automation`
  - Global command pointing to the versioned CLI entrypoint.
- Create: `/Users/ewilliam/.agents/skills/codex-plan-automation/SKILL.md`
  - Personal Codex skill that triggers when a user asks to create or manage plan automations.
- Modify: `/Users/ewilliam/Projects/dotfiles/docs/plans/2026-05-21-general-codex-plan-automations.md`
  - Record final verification notes after implementation.

---

## Task 1: Build The Generic Automation Library

**Files:**

- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/src/plan-automation.mjs`
- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs`

- [ ] **Step 1: Create the tool directories**

Run:

```bash
mkdir -p /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/src
mkdir -p /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin
mkdir -p /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test
```

Expected: The three directories exist.

- [ ] **Step 2: Write the failing builder tests**

Create `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs`:

```js
import assert from 'node:assert/strict';
import {
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
	buildPlanAutomation,
	createPlanAutomation,
	derivePlanAutomationIdentity
} from '../src/plan-automation.mjs';

function makeRepoFixture(planName = '2026-05-21-payments.md') {
	const root = mkdtempSync(join(tmpdir(), 'codex-plan-repo-'));
	const plansDir = join(root, 'docs/plans');
	const relativePlanPath = `docs/plans/${planName}`;
	const planPath = join(root, relativePlanPath);

	mkdirSync(plansDir, { recursive: true });
	writeFileSync(
		planPath,
		'# Implementation Plan\n\n- [ ] **Step 1: Do one small thing**\n',
		'utf8'
	);

	return { root, planPath, relativePlanPath };
}

test('derives identity from a dated plan file', () => {
	assert.deepEqual(
		derivePlanAutomationIdentity(
			'/Users/ewilliam/Projects/example/docs/plans/2026-05-21-payments.md'
		),
		{
			id: 'continue-payments-plan',
			name: 'Continue Payments plan'
		}
	);
});

test('builds project-agnostic automation TOML', () => {
	const fixture = makeRepoFixture();

	try {
		const automation = buildPlanAutomation({
			planPath: fixture.relativePlanPath,
			cwd: fixture.root,
			now: 1779389909458
		});

		assert.equal(automation.id, 'continue-payments-plan');
		assert.match(automation.toml, /kind = "cron"/);
		assert.match(automation.toml, /rrule = "FREQ=HOURLY;INTERVAL=1"/);
		assert.ok(automation.toml.includes(`cwds = [${JSON.stringify(fixture.root)}]`));
		assert.match(automation.toml, /read repo instruction files/);
		assert.match(automation.toml, /Continue from the first unchecked step/);
		assert.match(automation.toml, /commit completed work/);
		assert.doesNotMatch(automation.toml, /Use the repo conventions:/);
		assert.doesNotMatch(automation.toml, /Use .* for .* validation/);
	} finally {
		rmSync(fixture.root, { recursive: true, force: true });
	}
});

test('adds PR instructions only when requested', () => {
	const fixture = makeRepoFixture();

	try {
		assert.doesNotMatch(
			buildPlanAutomation({
				planPath: fixture.relativePlanPath,
				cwd: fixture.root
			}).toml,
			/create a pull request/
		);

		assert.match(
			buildPlanAutomation({
				planPath: fixture.relativePlanPath,
				cwd: fixture.root,
				createPr: true
			}).toml,
			/create a pull request/
		);
	} finally {
		rmSync(fixture.root, { recursive: true, force: true });
	}
});

test('requires cwd and plan files to exist', () => {
	const fixture = makeRepoFixture();

	try {
		assert.throws(
			() =>
				buildPlanAutomation({
					planPath: fixture.relativePlanPath,
					cwd: join(fixture.root, 'missing')
				}),
			/cwd does not exist/
		);

		assert.throws(
			() =>
				buildPlanAutomation({
					planPath: 'docs/plans/missing.md',
					cwd: fixture.root
				}),
			/planPath does not exist/
		);
	} finally {
		rmSync(fixture.root, { recursive: true, force: true });
	}
});

test('rejects external plan files unless explicitly allowed', () => {
	const repo = makeRepoFixture();
	const external = makeRepoFixture('2026-05-21-external.md');

	try {
		assert.throws(
			() =>
				buildPlanAutomation({
					planPath: external.planPath,
					cwd: repo.root
				}),
			/planPath must be inside cwd/
		);

		const automation = buildPlanAutomation({
			planPath: external.planPath,
			cwd: repo.root,
			allowExternalPlan: true
		});

		assert.match(automation.toml, /Continue implementing \//);
	} finally {
		rmSync(repo.root, { recursive: true, force: true });
		rmSync(external.root, { recursive: true, force: true });
	}
});

test('writes automation.toml and refuses accidental overwrite', () => {
	const fixture = makeRepoFixture();
	const codexHome = mkdtempSync(join(tmpdir(), 'codex-plan-automation-'));

	try {
		const result = createPlanAutomation({
			planPath: fixture.relativePlanPath,
			cwd: fixture.root,
			codexHome,
			now: 1779389909458
		});

		assert.equal(
			result.path,
			join(codexHome, 'automations/continue-payments-plan/automation.toml')
		);
		assert.equal(readFileSync(result.path, 'utf8'), result.toml);
		assert.throws(
			() =>
				createPlanAutomation({
					planPath: fixture.relativePlanPath,
					cwd: fixture.root,
					codexHome
				}),
			/already exists/
		);
	} finally {
		rmSync(fixture.root, { recursive: true, force: true });
		rmSync(codexHome, { recursive: true, force: true });
	}
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run:

```bash
node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs
```

Expected: FAIL because `../src/plan-automation.mjs` does not exist.

- [ ] **Step 4: Implement the builder module**

Create `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/src/plan-automation.mjs`:

```js
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_REASONING_EFFORT = 'xhigh';
const VALID_STATUSES = new Set(['ACTIVE', 'PAUSED']);
const VALID_EXECUTION_ENVIRONMENTS = new Set(['local', 'worktree']);

export function derivePlanAutomationIdentity(planPath) {
	const stem = basename(planPath)
		.replace(/\.md$/i, '')
		.replace(/^\d{4}-\d{2}-\d{2}-/, '');
	const slug = slugify(stem || 'implementation');

	return {
		id: `continue-${slug}-plan`,
		name: `Continue ${titleFromSlug(slug)} plan`
	};
}

export function buildPlanAutomation(options) {
	if (!options || typeof options !== 'object') {
		throw new Error('options are required');
	}
	if (!options.planPath) {
		throw new Error('planPath is required');
	}

	const cwd = resolveDirectory(options.cwd ?? process.cwd(), 'cwd');
	const absolutePlanPath = resolvePlanPath({
		planPath: options.planPath,
		cwd,
		allowExternalPlan: options.allowExternalPlan === true
	});
	const planPath = normalizePlanPath(absolutePlanPath, cwd);
	const identity = derivePlanAutomationIdentity(absolutePlanPath);
	const id = validateAutomationId(options.id ?? identity.id);
	const name = options.name ?? identity.name;
	const intervalHours = parsePositiveInteger(options.intervalHours ?? 1, 'intervalHours');
	const status = validateEnum(options.status ?? 'ACTIVE', VALID_STATUSES, 'status');
	const executionEnvironment = validateEnum(
		options.executionEnvironment ?? 'local',
		VALID_EXECUTION_ENVIRONMENTS,
		'executionEnvironment'
	);
	const prompt = buildPrompt({ planPath, createPr: options.createPr === true });
	const now = options.now ?? Date.now();

	return {
		id,
		name,
		prompt,
		toml: [
			'version = 1',
			`id = ${tomlString(id)}`,
			'kind = "cron"',
			`name = ${tomlString(name)}`,
			`prompt = ${tomlString(prompt)}`,
			`status = ${tomlString(status)}`,
			`rrule = ${tomlString(`FREQ=HOURLY;INTERVAL=${intervalHours}`)}`,
			`model = ${tomlString(options.model ?? DEFAULT_MODEL)}`,
			`reasoning_effort = ${tomlString(options.reasoningEffort ?? DEFAULT_REASONING_EFFORT)}`,
			`execution_environment = ${tomlString(executionEnvironment)}`,
			`cwds = [${tomlString(cwd)}]`,
			`created_at = ${now}`,
			`updated_at = ${now}`,
			''
		].join('\n')
	};
}

export function createPlanAutomation(options) {
	const automation = buildPlanAutomation(options);
	const codexHome = resolve(
		options.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), '.codex')
	);
	const automationDir = join(codexHome, 'automations', automation.id);
	const automationPath = join(automationDir, 'automation.toml');

	mkdirSync(automationDir, { recursive: true });

	try {
		writeFileSync(automationPath, automation.toml, {
			encoding: 'utf8',
			flag: options.force === true ? 'w' : 'wx'
		});
	} catch (error) {
		if (error?.code === 'EEXIST') {
			throw new Error(`${automationPath} already exists. Re-run with --force to overwrite it.`);
		}
		throw error;
	}

	return { ...automation, path: automationPath };
}

function buildPrompt({ planPath, createPr }) {
	const sections = [
		`Continue implementing ${planPath} for this repository.`,
		'Before editing, read repo instruction files such as AGENTS.md, CLAUDE.md, GEMINI.md, README.md, CONTEXT.md, docs/adr/*, git status, recent commits, and the plan file when present. Follow the repository-specific conventions and verification commands you discover there.',
		'Continue from the first unchecked step in the plan. Keep changes scoped to the current task and preserve unrelated user changes.',
		'Concurrency guard: before making any edit, inspect git status, recent commits, active lock files, merge/rebase state, and branch/worktree state. If there appears to be another active automation run, uncommitted automation work, merge/rebase state, or conflicting branch/worktree state, stop without editing.',
		'Do not try to complete the entire plan in one run. Complete at most one plan task per run, or one coherent subtask if the task is large.',
		'Persist all progress in repo artifacts: update plan checkboxes, add concise blocker notes when needed, and commit completed work. Do not rely on prior automation run context.',
		'Run the verification commands listed in the plan. At minimum run focused tests for touched code and the repository standard checks when appropriate.',
		'If blocked by failing tests, missing credentials, unclear requirements, merge conflicts, or a risky decision, stop and write a concise blocker note into the plan instead of guessing.',
		'If every plan checkbox is already complete, do not start new feature work. Run final verification if it has not already been recorded, confirm the working tree is clean, notify the user that the plan is implemented with the branch, commits, and verification state, then exit the run.'
	];

	if (createPr) {
		sections.push(
			'Final pull request behavior: after every plan checkbox is complete and verification passes, create a pull request only when the current branch is not main/master, a remote is configured, and GitHub credentials are available. Push the branch before creating the pull request. If a PR already exists, mention the existing PR instead of opening a duplicate. If PR creation is blocked, write a concise blocker note into the plan and finish with the exact reason.'
		);
	}

	return sections.join('\n\n');
}

function resolveDirectory(path, label) {
	const absolutePath = resolve(path);
	let stat;

	try {
		stat = statSync(absolutePath);
	} catch {
		throw new Error(`${label} does not exist: ${absolutePath}`);
	}

	if (!stat.isDirectory()) {
		throw new Error(`${label} is not a directory: ${absolutePath}`);
	}

	return absolutePath;
}

function resolvePlanPath({ planPath, cwd, allowExternalPlan }) {
	const absolutePlanPath = isAbsolute(planPath) ? resolve(planPath) : resolve(cwd, planPath);
	let stat;

	try {
		stat = statSync(absolutePlanPath);
	} catch {
		throw new Error(`planPath does not exist: ${absolutePlanPath}`);
	}

	if (!stat.isFile()) {
		throw new Error(`planPath is not a file: ${absolutePlanPath}`);
	}

	if (!allowExternalPlan && !isInsideDirectory(cwd, absolutePlanPath)) {
		throw new Error(
			`planPath must be inside cwd. Pass --allow-external-plan to use ${absolutePlanPath}`
		);
	}

	return absolutePlanPath;
}

function normalizePlanPath(absolutePlanPath, cwd) {
	const relativePlanPath = relative(cwd, absolutePlanPath);
	return isInsideDirectory(cwd, absolutePlanPath) ? relativePlanPath : absolutePlanPath;
}

function isInsideDirectory(parent, child) {
	const relativePath = relative(parent, child);
	return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function parsePositiveInteger(value, label) {
	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new Error(`${label} must be a positive integer`);
	}
	return number;
}

function validateEnum(value, allowedValues, label) {
	if (!allowedValues.has(value)) {
		throw new Error(`${label} must be one of: ${[...allowedValues].join(', ')}`);
	}
	return value;
}

function validateAutomationId(value) {
	if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
		throw new Error('id must contain only lowercase letters, numbers, and hyphens');
	}
	return value;
}

function slugify(value) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'implementation'
	);
}

function titleFromSlug(slug) {
	return slug
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function tomlString(value) {
	return JSON.stringify(value);
}
```

- [ ] **Step 5: Run the builder tests and verify they pass**

Run:

```bash
node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit the builder**

Run:

```bash
git -C /Users/ewilliam/Projects/dotfiles status --short
git -C /Users/ewilliam/Projects/dotfiles add tools/codex-plan-automation/src/plan-automation.mjs tools/codex-plan-automation/test/plan-automation.test.mjs
git -C /Users/ewilliam/Projects/dotfiles commit -m "feat: add generic codex plan automation builder"
```

Expected: A commit containing only the builder module and builder tests.

---

## Task 2: Add The Global CLI

**Files:**

- Create: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin/codex-plan-automation.mjs`
- Modify: `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs`
- Create or update symlink: `/Users/ewilliam/.local/bin/codex-plan-automation`

- [ ] **Step 1: Add CLI parser and symlink tests**

Append to `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs`:

```js
import { spawnSync } from 'node:child_process';
import { symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from '../bin/codex-plan-automation.mjs';

test('parses CLI options', () => {
	assert.deepEqual(
		parseArgs([
			'--plan',
			'docs/plans/2026-05-21-payments.md',
			'--cwd',
			'/repo',
			'--create-pr',
			'--paused',
			'--allow-external-plan',
			'--interval-hours',
			'2'
		]),
		{
			planPath: 'docs/plans/2026-05-21-payments.md',
			cwd: '/repo',
			createPr: true,
			status: 'PAUSED',
			allowExternalPlan: true,
			intervalHours: 2
		}
	);
});

test('accepts the plan path as the first positional argument', () => {
	assert.deepEqual(parseArgs(['plan.md', '--dry-run']), {
		planPath: 'plan.md',
		dryRun: true
	});
});

test('rejects invalid interval values at parse time', () => {
	assert.throws(() => parseArgs(['--plan', 'plan.md', '--interval-hours', '1.5']), /positive integer/);
	assert.throws(() => parseArgs(['--plan', 'plan.md', '--interval-hours', '2abc']), /positive integer/);
	assert.throws(() => parseArgs(['--plan', 'plan.md', '--interval-hours', '-1']), /positive integer/);
});

test('runs correctly through a symlinked CLI path', () => {
	const fixture = makeRepoFixture();
	const binTarget = fileURLToPath(new URL('../bin/codex-plan-automation.mjs', import.meta.url));
	const tempBinDir = mkdtempSync(join(tmpdir(), 'codex-plan-bin-'));
	const symlinkPath = join(tempBinDir, 'codex-plan-automation');

	try {
		symlinkSync(binTarget, symlinkPath);
		const result = spawnSync(
			process.execPath,
			[
				symlinkPath,
				'--cwd',
				fixture.root,
				'--plan',
				fixture.relativePlanPath,
				'--dry-run'
			],
			{ encoding: 'utf8' }
		);

		assert.equal(result.status, 0, result.stderr);
		assert.match(result.stdout, /kind = "cron"/);
		assert.match(result.stdout, /Continue implementing docs\/plans\/2026-05-21-payments.md/);
	} finally {
		rmSync(fixture.root, { recursive: true, force: true });
		rmSync(tempBinDir, { recursive: true, force: true });
	}
});
```

- [ ] **Step 2: Run tests and verify CLI import fails**

Run:

```bash
node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs
```

Expected: FAIL because `../bin/codex-plan-automation.mjs` does not exist.

- [ ] **Step 3: Implement the CLI**

Create `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin/codex-plan-automation.mjs`:

```js
#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPlanAutomation, createPlanAutomation } from '../src/plan-automation.mjs';

const valueOptions = new Set([
	'--plan',
	'--cwd',
	'--codex-home',
	'--id',
	'--name',
	'--interval-hours',
	'--model',
	'--reasoning-effort',
	'--execution-environment'
]);

export function parseArgs(argv) {
	const options = {};

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--') continue;

		if (valueOptions.has(arg)) {
			const value = argv[index + 1];
			if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
			assignValue(options, arg, value);
			index += 1;
			continue;
		}

		if (arg === '--create-pr') options.createPr = true;
		else if (arg === '--force') options.force = true;
		else if (arg === '--dry-run') options.dryRun = true;
		else if (arg === '--paused') options.status = 'PAUSED';
		else if (arg === '--worktree') options.executionEnvironment = 'worktree';
		else if (arg === '--local') options.executionEnvironment = 'local';
		else if (arg === '--allow-external-plan') options.allowExternalPlan = true;
		else if (arg === '--help' || arg === '-h') options.help = true;
		else if (!arg.startsWith('-') && !options.planPath) options.planPath = arg;
		else throw new Error(`Unknown argument: ${arg}`);
	}

	return options;
}

export async function main(argv = process.argv.slice(2)) {
	const options = parseArgs(argv);

	if (options.help) {
		printUsage();
		return;
	}
	if (!options.planPath) throw new Error('Missing required --plan path');

	const buildOptions = {
		...options,
		cwd: options.cwd ?? process.cwd()
	};

	if (options.dryRun) {
		console.log(buildPlanAutomation(buildOptions).toml);
		return;
	}

	const automation = createPlanAutomation(buildOptions);
	console.log(`Created ${automation.path}`);
	console.log(`Automation id: ${automation.id}`);
}

function assignValue(options, arg, value) {
	if (arg === '--plan') options.planPath = value;
	if (arg === '--cwd') options.cwd = value;
	if (arg === '--codex-home') options.codexHome = value;
	if (arg === '--id') options.id = value;
	if (arg === '--name') options.name = value;
	if (arg === '--interval-hours') options.intervalHours = parsePositiveInteger(value, arg);
	if (arg === '--model') options.model = value;
	if (arg === '--reasoning-effort') options.reasoningEffort = value;
	if (arg === '--execution-environment') options.executionEnvironment = value;
}

function parsePositiveInteger(value, arg) {
	const number = Number(value);
	if (!Number.isInteger(number) || number < 1) {
		throw new Error(`${arg} must be a positive integer`);
	}
	return number;
}

function printUsage() {
	console.log(`Usage:
  codex-plan-automation --plan docs/plans/YYYY-MM-DD-feature.md [options]

Options:
  --cwd <path>                  Repository path, defaults to current directory
  --codex-home <path>           Defaults to CODEX_HOME or ~/.codex
  --id <id>                     Override automation id
  --name <name>                 Override automation name
  --interval-hours <n>          Defaults to 1
  --model <model>               Defaults to gpt-5.5
  --reasoning-effort <effort>   Defaults to xhigh
  --local                       Use local execution environment
  --worktree                    Use worktree execution environment
  --paused                      Create as PAUSED
  --create-pr                   Add final PR instructions
  --allow-external-plan         Permit a plan path outside --cwd
  --force                       Overwrite existing automation.toml
  --dry-run                     Print TOML without writing
`);
}

function isMainModule() {
	if (!process.argv[1]) return false;
	return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
}

if (isMainModule()) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Install the executable symlink**

Run:

```bash
mkdir -p /Users/ewilliam/.local/bin
chmod +x /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin/codex-plan-automation.mjs
ln -sf /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/bin/codex-plan-automation.mjs /Users/ewilliam/.local/bin/codex-plan-automation
```

Expected: `/Users/ewilliam/.local/bin/codex-plan-automation` points at the versioned dotfiles script.

- [ ] **Step 6: Smoke-test dry run from this repo**

Run:

```bash
/Users/ewilliam/.local/bin/codex-plan-automation \
  --cwd /Users/ewilliam/Projects/dotfiles \
  --plan docs/plans/2026-05-21-general-codex-plan-automations.md \
  --create-pr \
  --dry-run
```

Expected:

- Output contains `cwds = ["/Users/ewilliam/Projects/dotfiles"]`.
- Output contains `Continue implementing docs/plans/2026-05-21-general-codex-plan-automations.md`.
- Output contains `Final pull request behavior`.

- [ ] **Step 7: Commit the CLI**

Run:

```bash
git -C /Users/ewilliam/Projects/dotfiles status --short
git -C /Users/ewilliam/Projects/dotfiles add tools/codex-plan-automation/bin/codex-plan-automation.mjs tools/codex-plan-automation/test/plan-automation.test.mjs
git -C /Users/ewilliam/Projects/dotfiles commit -m "feat: add codex plan automation cli"
```

Expected: A commit containing only the CLI and CLI tests.

---

## Task 3: Add A Personal Codex Skill

**Files:**

- Create: `/Users/ewilliam/.agents/skills/codex-plan-automation/SKILL.md`

- [ ] **Step 1: Create the personal skill**

Create `/Users/ewilliam/.agents/skills/codex-plan-automation/SKILL.md`:

````md
---
name: codex-plan-automation
description: Use when the user asks to create, update, generalize, or inspect recurring Codex automations that execute implementation plans across local repositories.
---

# Codex Plan Automation

Use the `codex-plan-automation` CLI to create project-agnostic Codex cron automations for implementation plans.

## Workflow

1. Identify the repository root. Prefer the current working directory unless the user names another project.
2. Identify the plan file. Prefer explicit user-provided paths, then `docs/plans/*.md`, then `docs/superpowers/plans/*.md`.
3. Preview first with `codex-plan-automation --cwd <repo> --plan <plan> --dry-run`.
4. If the preview is correct, create the automation with the same arguments without `--dry-run`.
5. Use `--create-pr` when the user wants the automation to open a PR after all plan checkboxes are complete.
6. Use `--paused` when the user wants to review the automation before it starts.
7. Use `--allow-external-plan` only when the user explicitly wants a plan file outside the target repository.

## Commands

```bash
codex-plan-automation --cwd /path/to/repo --plan docs/plans/YYYY-MM-DD-feature.md --dry-run
codex-plan-automation --cwd /path/to/repo --plan docs/plans/YYYY-MM-DD-feature.md --create-pr
```

## Guardrails

- Do not hard-code project-specific conventions into the automation prompt.
- Let each repo's AGENTS.md, CLAUDE.md, GEMINI.md, README.md, CONTEXT.md, docs/adr/*, and plan file define local behavior.
- Do not overwrite an existing automation unless the user explicitly asks for `--force`.
- Keep unrelated untracked or modified files untouched.
- The CLI source lives at `/Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation`; the installed command is a symlink at `/Users/ewilliam/.local/bin/codex-plan-automation`.
````

- [ ] **Step 2: Verify the skill file is discoverable**

Run:

```bash
test -f /Users/ewilliam/.agents/skills/codex-plan-automation/SKILL.md
sed -n '1,100p' /Users/ewilliam/.agents/skills/codex-plan-automation/SKILL.md
```

Expected: The frontmatter includes `name: codex-plan-automation` and a `description` that mentions recurring Codex automations for implementation plans.

- [ ] **Step 3: Commit the skill if it is git-controlled**

Run:

```bash
git -C /Users/ewilliam/.agents/skills status --short
```

If `/Users/ewilliam/.agents/skills` is a git repo and the new skill is the only intended change, run:

```bash
git -C /Users/ewilliam/.agents/skills add codex-plan-automation/SKILL.md
git -C /Users/ewilliam/.agents/skills commit -m "feat: add codex plan automation skill"
```

If `/Users/ewilliam/.agents/skills` is not a git repo, record in the final implementation notes that the personal skill is filesystem-managed.

---

## Task 4: End-To-End Verification

**Files:**

- Modify: `/Users/ewilliam/Projects/dotfiles/docs/plans/2026-05-21-general-codex-plan-automations.md`
- May write to temporary directories under `/tmp` or `$TMPDIR`.

- [ ] **Step 1: Run the full test file**

Run:

```bash
node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Create a temporary repo fixture**

Run:

```bash
fixture="$(mktemp -d)"
node --input-type=module - "$fixture" <<'NODE'
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fixture = process.argv[2];
const plansDir = join(fixture, 'docs/plans');

mkdirSync(plansDir, { recursive: true });
writeFileSync(
	join(fixture, 'AGENTS.md'),
	'# Fixture Repo\n\nRun `npm test` before committing.\n',
	'utf8'
);
writeFileSync(
	join(plansDir, '2026-05-21-fixture.md'),
	'# Fixture Implementation Plan\n\n- [ ] **Step 1: Do one small thing**\n- [ ] **Step 2: Commit**\n',
	'utf8'
);
NODE
```

Expected: `$fixture` contains `AGENTS.md` and `docs/plans/2026-05-21-fixture.md`.

- [ ] **Step 3: Generate an automation into a temporary Codex home**

Run:

```bash
codex_home="$(mktemp -d)"
/Users/ewilliam/.local/bin/codex-plan-automation \
  --cwd "$fixture" \
  --codex-home "$codex_home" \
  --plan docs/plans/2026-05-21-fixture.md \
  --create-pr
```

Expected: Command prints `Created <path>` and `Automation id: continue-fixture-plan`.

- [ ] **Step 4: Inspect the generated TOML**

Run:

```bash
sed -n '1,220p' "$codex_home/automations/continue-fixture-plan/automation.toml"
```

Expected:

- Contains `cwds = ["<fixture path>"]`.
- Contains `Continue implementing docs/plans/2026-05-21-fixture.md`.
- Contains `Final pull request behavior`.
- Contains `read repo instruction files`.
- Contains no project-specific framework names.

- [ ] **Step 5: Confirm overwrite protection**

Run:

```bash
/Users/ewilliam/.local/bin/codex-plan-automation \
  --cwd "$fixture" \
  --codex-home "$codex_home" \
  --plan docs/plans/2026-05-21-fixture.md
```

Expected: FAIL with `already exists`.

- [ ] **Step 6: Confirm external plan validation**

Run:

```bash
external_plan="$(mktemp)"
printf '# External Plan\n\n- [ ] Step\n' > "$external_plan"
/Users/ewilliam/.local/bin/codex-plan-automation \
  --cwd "$fixture" \
  --codex-home "$codex_home" \
  --plan "$external_plan" \
  --dry-run
```

Expected: FAIL with `planPath must be inside cwd`.

Then run:

```bash
/Users/ewilliam/.local/bin/codex-plan-automation \
  --cwd "$fixture" \
  --codex-home "$codex_home" \
  --plan "$external_plan" \
  --allow-external-plan \
  --dry-run
```

Expected: PASS and output contains `Continue implementing /`.

- [ ] **Step 7: Clean up temporary fixtures**

Run:

```bash
rm -rf "$fixture" "$codex_home" "$external_plan"
```

Expected: Temporary verification files are removed.

- [ ] **Step 8: Record final verification in this plan**

Add a short note below this task:

```md
Verification note:

- `node --test /Users/ewilliam/Projects/dotfiles/tools/codex-plan-automation/test/plan-automation.test.mjs` passed.
- Symlinked CLI dry run passed.
- End-to-end fixture generation passed.
- Duplicate automation overwrite protection passed.
- External plan validation passed.
```

- [ ] **Step 9: Final commit**

Run:

```bash
git -C /Users/ewilliam/Projects/dotfiles status --short
git -C /Users/ewilliam/Projects/dotfiles add docs/plans/2026-05-21-general-codex-plan-automations.md
git -C /Users/ewilliam/Projects/dotfiles commit -m "docs: update codex plan automation implementation plan"
```

Expected: A commit containing only this plan update, unless earlier implementation commits intentionally remain unstaged or uncommitted.

---

## Self-Review

- Spec coverage: This plan covers a project-agnostic CLI, versioned dotfiles source, generic prompt rendering, path validation, strict interval parsing, symlink-safe execution, atomic overwrite protection, personal skill creation, and end-to-end fixture verification.
- Placeholder scan: No unresolved placeholder language or implementation gaps remain.
- Type consistency: Builder and CLI use the same option names: `planPath`, `cwd`, `codexHome`, `id`, `name`, `intervalHours`, `model`, `reasoningEffort`, `executionEnvironment`, `status`, `createPr`, `allowExternalPlan`, `force`, and `dryRun`.
- Generalization check: The generated automation prompt contains no project-specific framework, repo, or product assumptions. Each target repo provides conventions through its own instruction files and plan.
