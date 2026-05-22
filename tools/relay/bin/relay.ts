#!/usr/bin/env bun

try {
  const { runCli } = await import("../src/cli");
  const exitCode = await runCli(process.argv.slice(2));

  if (typeof exitCode === "number") {
    process.exit(exitCode);
  }
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
}
