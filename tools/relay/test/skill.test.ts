import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";

const SKILL_PATH = "/Users/ewilliam/.agents/skills/relay-plan/SKILL.md";
const SKILL_LINK_PATH = "/Users/ewilliam/.agents/skills/relay-plan";
const STOW_SKILL_PATH =
  "/Users/ewilliam/Projects/dotfiles/stow/relay/.agents/skills/relay-plan";
const FORMER_TOOL_NAME = ["codex", "runner"].join("-");

describe("relay planning skill", () => {
  test("installs a concise Relay planning skill with required workflow guardrails", () => {
    expect(existsSync(SKILL_PATH)).toBe(true);

    const skill = readFileSync(SKILL_PATH, "utf8");
    const frontmatter = skill.match(/^---\n([\s\S]+?)\n---/)?.[1] ?? "";
    const body = skill.replace(/^---\n[\s\S]+?\n---\n?/, "");

    expect(frontmatter).toContain("name: relay-plan");
    expect(frontmatter).toMatch(/description:.*creating.*optimizing.*linting.*Relay implementation plans/i);
    expect(body).toMatch(/phase-based plans/i);
    expect(body).toMatch(/one bounded top-level checkbox per runner slice/i);
    expect(body).toContain("exact files");
    expect(body).toContain("acceptance criteria");
    expect(body).toContain("verification commands");
    expect(body).toContain("blocker conditions");
    expect(body).toContain("commit boundaries");
    expect(body).toContain("relay lint-plan");
    expect(body).toContain("relay");
    expect(body).toContain(".relay");
    expect(body).toContain("~/.local/bin/relay");
    expect(body).toContain("~/.agents/skills/relay-plan/SKILL.md");
    expect(skill).not.toContain(FORMER_TOOL_NAME);
    expect(skill.match(/\blint-plan\b/g)?.length).toBe(1);
  });

  test("installs the skill through the dotfiles stow package", () => {
    expect(existsSync(SKILL_PATH)).toBe(true);
    expect(existsSync(`${STOW_SKILL_PATH}/SKILL.md`)).toBe(true);
    expect(lstatSync(SKILL_LINK_PATH).isSymbolicLink()).toBe(true);
    expect(realpathSync(SKILL_LINK_PATH)).toBe(STOW_SKILL_PATH);
  });
});
