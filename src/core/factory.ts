import type { Assignment, Dependency, Project, Resource, Task } from "./types.js";
import { DEFAULT_STYLES, DEFAULT_WORK_WEEK } from "./types.js";
import { nextAsgId, nextDepId, nextResourceId, nextTaskId, uid } from "./ids.js";

export function blankTask(partial: Partial<Task> = {}): Task {
  return {
    uniqueID: partial.uniqueID ?? nextTaskId(),
    parentId: partial.parentId ?? null,
    order: partial.order ?? 0,
    title: partial.title ?? "New Task",
    type: partial.type ?? "task",
    note: partial.note ?? "",
    effort: partial.effort ?? 8 * 3600,
    effortDone: partial.effortDone ?? 0,
    effortRemaining: partial.effortRemaining ?? (partial.effort ?? 8 * 3600),
    duration: partial.duration ?? 8 * 3600,
    elapsedDuration: partial.elapsedDuration ?? false,
    staticCost: partial.staticCost ?? 0,
    priority: partial.priority ?? 0,
    completion: partial.completion ?? 0,
    schedulingMode: partial.schedulingMode ?? "automatic",
    asapAlap: partial.asapAlap ?? "asap",
    allowSplitting: partial.allowSplitting ?? true,
    startNoEarlierThanDate: partial.startNoEarlierThanDate ?? null,
    startNoLaterThanDate: partial.startNoLaterThanDate ?? null,
    endNoEarlierThanDate: partial.endNoEarlierThanDate ?? null,
    endNoLaterThanDate: partial.endNoLaterThanDate ?? null,
    manualStartDate: partial.manualStartDate ?? null,
    manualEndDate: partial.manualEndDate ?? null,
    minEffortEstimate: partial.minEffortEstimate ?? null,
    expectedEffortEstimate: partial.expectedEffortEstimate ?? null,
    maxEffortEstimate: partial.maxEffortEstimate ?? null,
    resourceAssignmentType: partial.resourceAssignmentType ?? "adjustDuration",
    taskProgressRequires: partial.taskProgressRequires ?? "any",
    collapsed: partial.collapsed ?? false,
    whenClosed: partial.whenClosed ?? "rollUp",
    recurrence: partial.recurrence ?? null,
    customData: partial.customData ?? {},
    color: partial.color ?? null,
    splitChunks: partial.splitChunks ?? null,
    startDate: partial.startDate ?? new Date().toISOString(),
    endDate: partial.endDate ?? new Date().toISOString(),
    freeSlack: partial.freeSlack ?? 0,
    totalSlack: partial.totalSlack ?? 0,
    critical: partial.critical ?? false,
    resourceLeveledDate: partial.resourceLeveledDate ?? null,
    resourceLevelingDelay: partial.resourceLevelingDelay ?? 0,
    assignmentsCost: partial.assignmentsCost ?? 0,
    totalCost: partial.totalCost ?? 0,
    violation: partial.violation ?? null,
  };
}

export function blankResource(partial: Partial<Resource> = {}): Resource {
  return {
    uniqueID: partial.uniqueID ?? nextResourceId(),
    parentId: partial.parentId ?? null,
    order: partial.order ?? 0,
    name: partial.name ?? "New Resource",
    type: partial.type ?? "staff",
    email: partial.email ?? "",
    note: partial.note ?? "",
    units: partial.units ?? 1,
    efficiency: partial.efficiency ?? 1,
    costPerUse: partial.costPerUse ?? 0,
    costPerHour: partial.costPerHour ?? 0,
    customData: partial.customData ?? {},
    workWeek: partial.workWeek ?? null,
    collapsed: partial.collapsed ?? false,
  };
}

export function blankProject(partial: Partial<Project> = {}): Project {
  const start = partial.startDate ?? new Date().toISOString();
  return {
    id: partial.id ?? uid("prj"),
    documentName: partial.documentName ?? "Untitled.oplx",
    title: partial.title ?? "Untitled",
    direction: partial.direction ?? "forward",
    dateMode: partial.dateMode ?? "specific",
    granularity: partial.granularity ?? "hour",
    startDate: start,
    endDate: partial.endDate ?? null,
    currency: partial.currency ?? "USD",
    showSeconds: partial.showSeconds ?? false,
    showTimeOfDay: partial.showTimeOfDay ?? false,
    effortUnits: partial.effortUnits ?? ["d", "h"],
    durationUnits: partial.durationUnits ?? ["d", "h"],
    hoursPerDay: partial.hoursPerDay ?? 8,
    hoursPerWeek: partial.hoursPerWeek ?? 40,
    hoursPerMonth: partial.hoursPerMonth ?? 160,
    hoursPerYear: partial.hoursPerYear ?? 2080,
    fileType: partial.fileType ?? "flat",
    includePreview: partial.includePreview ?? true,
    workWeek: partial.workWeek ?? structuredClone(DEFAULT_WORK_WEEK),
    holidays: partial.holidays ?? [],
    tasks: partial.tasks ?? [],
    resources: partial.resources ?? [],
    dependencies: partial.dependencies ?? [],
    assignments: partial.assignments ?? [],
    baselines: partial.baselines ?? [],
    currentBaselineId: partial.currentBaselineId ?? null,
    changes: partial.changes ?? [],
    styles: partial.styles ?? structuredClone(DEFAULT_STYLES),
    slackLimitHours: partial.slackLimitHours ?? 0,
    criticalPathToMilestoneIds: partial.criticalPathToMilestoneIds ?? [],
    notes: partial.notes ?? "",
    linkedFiles: partial.linkedFiles ?? [],
    customData: partial.customData ?? {},
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

export function makeDependency(
  from: string,
  to: string,
  type: Dependency["type"] = "FS",
  leadSeconds = 0,
): Dependency {
  return { id: nextDepId(), prerequisiteTaskId: from, dependentTaskId: to, type, leadSeconds, leadKind: "work" };
}

export function makeAssignment(taskId: string, resourceId: string, units = 1): Assignment {
  return { id: nextAsgId(), taskId, resourceId, units };
}
