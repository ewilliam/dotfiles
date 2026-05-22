import type { RelayOptions } from "./types";

export interface ParseRelayArgsOptions {
  cwd?: string;
}

export interface RelayIo {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

export interface RelayHandlers {
  run: (options: RelayOptions) => Promise<number> | number;
  lintPlan: (options: RelayOptions) => Promise<number> | number;
  install: (options: RelayOptions) => Promise<number> | number;
}

export interface RunCliOptions extends RelayIo {
  cwd?: string;
  handlers?: RelayHandlers;
}

type FlagName =
  | "--allow-lint-warnings"
  | "--final-verify"
  | "--force"
  | "--notify-each-slice"
  | "--plan"
  | "--pr"
  | "--repo"
  | "--resume"
  | "--verify";

const VALUE_FLAGS = new Set<FlagName>([
  "--final-verify",
  "--plan",
  "--repo",
  "--verify",
]);

const REPEATABLE_FLAGS = new Set<FlagName>(["--final-verify", "--verify"]);

export class RelayCliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayCliError";
  }
}

export function parseRelayArgs(
  args: string[],
  options: ParseRelayArgsOptions = {},
): RelayOptions {
  const cwd = options.cwd ?? process.cwd();
  const remaining = [...args];
  const command = readCommand(remaining);
  const seen = new Set<FlagName>();
  const relayOptions: RelayOptions = {
    allowDirtyBase: false,
    allowLintWarnings: false,
    command,
    finalVerifyCommands: [],
    force: false,
    notifyEachSlice: false,
    pr: false,
    repoPath: cwd,
    resume: false,
    verifyCommands: [],
  };

  while (remaining.length > 0) {
    const flag = remaining.shift();
    if (!flag) {
      continue;
    }

    if (!isFlagName(flag)) {
      const label = flag.startsWith("-") ? "Unknown flag" : "Unexpected argument";
      throw new RelayCliError(`${label}: ${flag}`);
    }

    if (!REPEATABLE_FLAGS.has(flag) && seen.has(flag)) {
      throw new RelayCliError(`Flag cannot be repeated: ${flag}`);
    }
    seen.add(flag);

    const value = VALUE_FLAGS.has(flag) ? readFlagValue(flag, remaining) : undefined;
    applyFlag(relayOptions, flag, value);
  }

  validateOptions(relayOptions);
  return relayOptions;
}

export function createHelpText(): string {
  return [
    "Usage: relay [options]",
    "       relay lint-plan --plan <path> [options]",
    "       relay install",
    "",
    "Commands:",
    "  relay       Run the next unchecked plan slice.",
    "  lint-plan   Validate a Relay-ready plan.",
    "  install     Install the relay executable at ~/.local/bin/relay.",
    "",
    "Options:",
    "  --repo <path>              Source repository. Defaults to the current directory.",
    "  --plan <path>              Plan file relative to the repo, or absolute.",
    "  --pr                       Push and open or update a pull request.",
    "  --verify <command>         Per-slice verification command. Repeatable.",
    "  --final-verify <command>   Final verification command. Repeatable.",
    "  --resume                   Continue from an existing .relay state directory.",
    "  --force                    Overwrite existing .relay state for the same run.",
    "  --allow-lint-warnings      Permit P1 lint findings.",
    "  --notify-each-slice        Notify after each committed slice.",
    "  --help                     Show this help.",
  ].join("\n");
}

export async function runCli(
  args: string[] = process.argv.slice(2),
  options: RunCliOptions = {},
): Promise<number> {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    stdout(createHelpText());
    return 0;
  }

  try {
    const relayOptions = parseRelayArgs(args, {
      cwd: options.cwd,
    });
    const handlers = options.handlers ?? createDefaultHandlers();

    switch (relayOptions.command) {
      case "install":
        return await handlers.install(relayOptions);
      case "lint-plan":
        return await handlers.lintPlan(relayOptions);
      case "run":
        return await handlers.run(relayOptions);
    }
  } catch (error) {
    if (error instanceof RelayCliError) {
      stderr(`relay: ${error.message}`);
      return 2;
    }
    throw error;
  }
}

function readCommand(args: string[]): RelayOptions["command"] {
  const first = args[0];

  if (first === "run" || first === "lint-plan" || first === "install") {
    args.shift();
    return first;
  }

  if (first && !first.startsWith("-")) {
    throw new RelayCliError(`Unknown command: ${first}`);
  }

  return "run";
}

function readFlagValue(flag: FlagName, args: string[]): string {
  const value = args.shift();

  if (!value || value.startsWith("-")) {
    throw new RelayCliError(`Missing value for ${flag}`);
  }

  return value;
}

function applyFlag(
  options: RelayOptions,
  flag: FlagName,
  value: string | undefined,
): void {
  switch (flag) {
    case "--allow-lint-warnings":
      options.allowLintWarnings = true;
      return;
    case "--final-verify":
      options.finalVerifyCommands.push(requiredValue(flag, value));
      return;
    case "--force":
      options.force = true;
      return;
    case "--notify-each-slice":
      options.notifyEachSlice = true;
      return;
    case "--plan":
      options.planPath = requiredValue(flag, value);
      return;
    case "--pr":
      options.pr = true;
      return;
    case "--repo":
      options.repoPath = requiredValue(flag, value);
      return;
    case "--resume":
      options.resume = true;
      return;
    case "--verify":
      options.verifyCommands.push(requiredValue(flag, value));
      return;
  }
}

function validateOptions(options: RelayOptions): void {
  if (options.resume && options.force) {
    throw new RelayCliError("--resume cannot be combined with --force");
  }

  if ((options.command === "run" || options.command === "lint-plan") && !options.planPath) {
    throw new RelayCliError(`${options.command} requires --plan <path>`);
  }

  if (options.command === "install" && options.planPath) {
    throw new RelayCliError("install does not accept --plan");
  }
}

function requiredValue(flag: FlagName, value: string | undefined): string {
  if (!value) {
    throw new RelayCliError(`Missing value for ${flag}`);
  }

  return value;
}

function isFlagName(value: string): value is FlagName {
  return (
    value === "--allow-lint-warnings" ||
    value === "--final-verify" ||
    value === "--force" ||
    value === "--notify-each-slice" ||
    value === "--plan" ||
    value === "--pr" ||
    value === "--repo" ||
    value === "--resume" ||
    value === "--verify"
  );
}

function createDefaultHandlers(): RelayHandlers {
  const notImplemented = (options: RelayOptions) => {
    throw new RelayCliError(`${options.command} is not implemented yet`);
  };

  return {
    install: notImplemented,
    lintPlan: notImplemented,
    run: notImplemented,
  };
}
