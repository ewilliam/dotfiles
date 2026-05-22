import { describe, expect, test } from "bun:test";

import { detectTaskSplits, parsePlan } from "../src/plan";

describe("relay plan parser", () => {
  test("parses phase headings into ordered phases", () => {
    const document = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Add foundation

## Phase 2: Runner

- [ ] Add runner
`);

    expect(document.title).toBe("Relay");
    expect(document.phases.map((phase) => phase.title)).toEqual([
      "Phase 1: Foundation",
      "Phase 2: Runner",
    ]);
    expect(document.phases.map((phase) => phase.ordinal)).toEqual([1, 2]);
    expect(document.phases.map((phase) => phase.line)).toEqual([3, 7]);
    expect(document.tasks.map((task) => task.phaseTitle)).toEqual([
      "Phase 1: Foundation",
      "Phase 2: Runner",
    ]);
  });

  test("extracts only top-level checkbox tasks as executable tasks", () => {
    const document = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Top-level unchecked
  - [ ] Nested unchecked
  - [x] Nested checked
- [x] Top-level checked
  - [ ] Another nested item
`);

    expect(document.tasks).toHaveLength(2);
    expect(document.tasks.map((task) => task.text)).toEqual([
      "Top-level unchecked",
      "Top-level checked",
    ]);
    expect(document.tasks.map((task) => task.checked)).toEqual([false, true]);
    expect(document.tasks.map((task) => task.line)).toEqual([5, 8]);
  });

  test("falls back to top-level checkboxes when no phase headings exist", () => {
    const document = parsePlan(`# Relay

Intro prose.

- [ ] Add parser
- [x] Add CLI
`);

    expect(document.phases).toEqual([]);
    expect(document.tasks.map((task) => task.text)).toEqual(["Add parser", "Add CLI"]);
    expect(document.tasks.every((task) => task.phaseId === undefined)).toBe(true);
  });

  test("derives stable task ids from phase order, task order, and normalized checkbox text", () => {
    const document = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] **Add**   parser
- [ ] **Add** parser
`);

    expect(document.tasks[0].id).toMatch(/^phase-1-task-1-[a-f0-9]{8}$/);
    expect(document.tasks[1].id).toMatch(/^phase-1-task-2-[a-f0-9]{8}$/);
    expect(document.tasks[0].id).not.toBe(document.tasks[1].id);
  });

  test("keeps unaffected task ids stable when unrelated prose is edited", () => {
    const before = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Add parser
`);
    const after = parsePlan(`# Relay

## Phase 1: Foundation

Unrelated prose changed here.

- [ ] Add parser
`);

    expect(after.tasks[0].id).toBe(before.tasks[0].id);
  });

  test("detects blocker notes directly under a task", () => {
    const document = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Add parser
  BLOCKED: source spec is unavailable
- [ ] Add linter
`);

    expect(document.tasks[0].blockerNote).toBe("BLOCKED: source spec is unavailable");
    expect(document.tasks[1].blockerNote).toBeUndefined();
  });

  test("detects task splitting after a re-parse within the same phase", () => {
    const before = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Implement parser
- [ ] Implement linter
`);
    const after = parsePlan(`# Relay

## Phase 1: Foundation

- [ ] Add parser tests
- [ ] Implement parser core
- [ ] Implement linter
`);

    const splits = detectTaskSplits(before, after);

    expect(splits).toHaveLength(1);
    expect(splits[0].previousTaskId).toBe(before.tasks[0].id);
    expect(splits[0].replacementTaskIds).toEqual([
      after.tasks[0].id,
      after.tasks[1].id,
    ]);
  });
});
