import { createHash } from "node:crypto";

import type {
  PlanDocument,
  PlanPhase,
  PlanTask,
  TaskSplitDetection,
} from "./types";

const TITLE_RE = /^#\s+(.+?)\s*$/;
const PHASE_HEADING_RE = /^##\s+(Phase\b.+?)\s*$/i;
const TOP_LEVEL_CHECKBOX_RE = /^- \[( |x|X)\]\s*(.*)$/;
const BLOCKER_RE = /\bBLOCKED:\s*(.*)$/i;
const ROOT_PHASE_KEY = "__root__";

export function parsePlan(markdown: string): PlanDocument {
  const lines = markdown.split(/\r?\n/);
  const phases: PlanPhase[] = [];
  const tasks: PlanTask[] = [];
  let title: string | undefined;
  let currentPhase: PlanPhase | undefined;
  let currentTask: PlanTask | undefined;
  const taskCountsByPhase = new Map<string, number>();

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    if (!title) {
      const titleMatch = line.match(TITLE_RE);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }
    }

    const phaseMatch = line.match(PHASE_HEADING_RE);
    if (phaseMatch) {
      currentPhase = {
        id: `phase-${phases.length + 1}`,
        line: lineNumber,
        ordinal: phases.length + 1,
        tasks: [],
        title: phaseMatch[1].trim(),
      };
      phases.push(currentPhase);
      currentTask = undefined;
      continue;
    }

    const checkboxMatch = line.match(TOP_LEVEL_CHECKBOX_RE);
    if (checkboxMatch) {
      const phaseKey = currentPhase?.id ?? ROOT_PHASE_KEY;
      const ordinal = (taskCountsByPhase.get(phaseKey) ?? 0) + 1;
      taskCountsByPhase.set(phaseKey, ordinal);

      currentTask = {
        checked: checkboxMatch[1].toLowerCase() === "x",
        detailLines: [],
        id: buildTaskId(currentPhase?.ordinal, ordinal, checkboxMatch[2]),
        line: lineNumber,
        ordinal,
        phaseId: currentPhase?.id,
        phaseOrdinal: currentPhase?.ordinal,
        phaseTitle: currentPhase?.title,
        text: checkboxMatch[2].trim(),
      };
      tasks.push(currentTask);
      currentPhase?.tasks.push(currentTask);
      continue;
    }

    if (currentTask) {
      currentTask.detailLines.push(line);
      const blockerMatch = line.match(BLOCKER_RE);
      if (blockerMatch && !currentTask.blockerNote) {
        currentTask.blockerNote = `BLOCKED: ${blockerMatch[1].trim()}`;
      }
    }
  }

  return {
    phases,
    raw: markdown,
    tasks,
    title,
  };
}

export function detectTaskSplits(
  previous: PlanDocument,
  current: PlanDocument,
): TaskSplitDetection[] {
  const splits: TaskSplitDetection[] = [];
  const currentTasksByPhase = groupTasksByPhase(current.tasks);

  for (const previousTask of previous.tasks) {
    if (previousTask.checked || current.tasks.some((task) => task.id === previousTask.id)) {
      continue;
    }

    const samePhaseCurrentTasks =
      currentTasksByPhase.get(phaseKey(previousTask)) ?? [];
    if (
      samePhaseCurrentTasks.some(
        (task) =>
          normalizeTaskTextForId(task.text) === normalizeTaskTextForId(previousTask.text),
      )
    ) {
      continue;
    }

    const previousPhaseTasks = previous.tasks.filter(
      (task) => phaseKey(task) === phaseKey(previousTask),
    );
    const previousIndex = previousPhaseTasks.indexOf(previousTask);
    const startIndex = findCurrentBoundary(
      previousPhaseTasks.slice(0, previousIndex).reverse(),
      samePhaseCurrentTasks,
      "after",
    );
    const endIndex = findCurrentBoundary(
      previousPhaseTasks.slice(previousIndex + 1),
      samePhaseCurrentTasks,
      "before",
    );
    const replacements = samePhaseCurrentTasks.slice(startIndex, endIndex);

    if (replacements.length >= 2 && replacements.every((task) => !task.checked)) {
      splits.push({
        phaseId: previousTask.phaseId,
        phaseTitle: previousTask.phaseTitle,
        previousTaskId: previousTask.id,
        previousText: previousTask.text,
        replacementTaskIds: replacements.map((task) => task.id),
        replacementTexts: replacements.map((task) => task.text),
      });
    }
  }

  return splits;
}

export function normalizeTaskTextForId(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildTaskId(
  phaseOrdinal: number | undefined,
  taskOrdinal: number,
  text: string,
): string {
  const phasePrefix = phaseOrdinal ? `phase-${phaseOrdinal}` : "no-phase";
  return `${phasePrefix}-task-${taskOrdinal}-${shortHash(normalizeTaskTextForId(text))}`;
}

function shortHash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function groupTasksByPhase(tasks: PlanTask[]): Map<string, PlanTask[]> {
  const grouped = new Map<string, PlanTask[]>();
  for (const task of tasks) {
    const key = phaseKey(task);
    grouped.set(key, [...(grouped.get(key) ?? []), task]);
  }
  return grouped;
}

function phaseKey(task: PlanTask): string {
  return task.phaseId ?? ROOT_PHASE_KEY;
}

function findCurrentBoundary(
  previousCandidates: PlanTask[],
  currentTasks: PlanTask[],
  position: "after" | "before",
): number {
  for (const previousTask of previousCandidates) {
    const index = currentTasks.findIndex(
      (currentTask) =>
        normalizeTaskTextForId(currentTask.text) ===
        normalizeTaskTextForId(previousTask.text),
    );
    if (index >= 0) {
      return position === "after" ? index + 1 : index;
    }
  }

  return position === "after" ? 0 : currentTasks.length;
}
