import { performance } from "node:perf_hooks";

import type { CommandExecutor, CommandResult, CommandSpec } from "./types";

export interface RunCommandOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export function runCommand(spec: CommandSpec): Promise<CommandResult>;
export function runCommand(
  command: string,
  args?: string[],
  options?: RunCommandOptions,
): Promise<CommandResult>;
export async function runCommand(
  specOrCommand: CommandSpec | string,
  args: string[] = [],
  options: RunCommandOptions = {},
): Promise<CommandResult> {
  const spec = normalizeCommandSpec(specOrCommand, args, options);
  const startedAt = performance.now();
  const environment = mergeEnvironment(spec.env);
  let timedOut = false;

  const proc = Bun.spawn([spec.command, ...(spec.args ?? [])], {
    cwd: spec.cwd,
    env: environment,
    stderr: "pipe",
    stdout: "pipe",
  });

  const stdoutPromise = new Response(proc.stdout).text();
  const stderrPromise = new Response(proc.stderr).text();
  const exitPromise = proc.exited;
  const timeoutMs = spec.timeoutMs;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const exitCode = await (timeoutMs === undefined
    ? exitPromise
    : Promise.race([
        exitPromise,
        new Promise<number>((resolve) => {
          timeout = setTimeout(() => {
            timedOut = true;
            proc.kill();
            resolve(1);
          }, timeoutMs);
        }),
      ]));

  if (timeout) {
    clearTimeout(timeout);
  }

  const [stdout, stderr] = await Promise.all([stdoutPromise, stderrPromise]);

  return {
    command: spec.command,
    args: spec.args ?? [],
    cwd: spec.cwd,
    stdout,
    stderr,
    exitCode,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    timedOut,
  };
}

export function createCommandExecutor(executor: CommandExecutor = runCommand): CommandExecutor {
  return executor;
}

function normalizeCommandSpec(
  specOrCommand: CommandSpec | string,
  args: string[],
  options: RunCommandOptions,
): CommandSpec {
  if (typeof specOrCommand === "string") {
    return {
      command: specOrCommand,
      args,
      ...options,
    };
  }

  return {
    ...specOrCommand,
    args: specOrCommand.args ?? [],
  };
}

function mergeEnvironment(
  overrides: Record<string, string | undefined> | undefined,
): Record<string, string> {
  const environment: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      environment[key] = value;
    }
  }

  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) {
      delete environment[key];
    } else {
      environment[key] = value;
    }
  }

  return environment;
}
