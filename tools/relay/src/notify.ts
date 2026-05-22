import { runCommand } from "./shell";
import type {
  CommandExecutor,
  RelayNotification,
} from "./types";

export interface SendRelayNotificationOptions {
  executor?: CommandExecutor;
  platform?: NodeJS.Platform;
}

export interface RelayNotificationResult {
  skipped?: boolean;
}

export class RelayNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelayNotificationError";
  }
}

export async function sendRelayNotification(
  notification: RelayNotification,
  options: SendRelayNotificationOptions = {},
): Promise<RelayNotificationResult> {
  if ((options.platform ?? process.platform) !== "darwin") {
    return { skipped: true };
  }

  const executor = options.executor ?? runCommand;
  const result = await executor({
    args: [
      "-e",
      `display notification ${appleScriptString(notification.message)} with title "relay"`,
    ],
    command: "osascript",
  });

  if (result.exitCode !== 0) {
    throw new RelayNotificationError(
      `osascript notification failed with exit ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }

  return {};
}

function appleScriptString(value: string): string {
  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\r?\n/g, "\\n")}"`;
}
