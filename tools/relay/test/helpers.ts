import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function makeTempDir(prefix = "relay-test-"): string {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

export function removeTempDir(dir: string): void {
  rmSync(dir, { force: true, recursive: true });
}
