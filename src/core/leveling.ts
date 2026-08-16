import type { Project, Task } from "./types.js";
import { addWorkSeconds, parseIso, snapToWork } from "./calendar.js";
import { leafTasks, scheduleProject } from "./scheduler.js";

export interface LevelOptions {
  allowSplitting?: boolean;
  levelPriority?: boolean;
}

export function levelResources(project: Project, options: LevelOptions = {}): Project {
  const leaves = leafTasks(project)
    .filter((t) => t.schedulingMode !== "manual" && t.type !== "milestone")
    .sort((a, b) => {
      if (options.levelPriority !== false && b.priority !== a.priority) return b.priority - a.priority;
      return (parseIso(a.startDate)?.getTime() || 0) - (parseIso(b.startDate)?.getTime() || 0);
    });

  const occupancy: Record<string, { start: number; end: number; units: number }[]> = {};
  for (const r of project.resources) occupancy[r.uniqueID] = [];

  for (const task of leaves) {
    const assigns = project.assignments.filter((a) => a.taskId === task.uniqueID);
    if (!assigns.length) continue;
    let start = parseIso(task.startDate) ?? new Date(project.startDate);
    start = snapToWork(start, project, 1);
    let delayed = 0;
    let guard = 0;
    while (guard++ < 500) {
      const end = addWorkSeconds(start, task.duration, project);
      const s = start.getTime();
      const e = end.getTime();
      let conflict = false;
      for (const a of assigns) {
        const r = project.resources.find((x) => x.uniqueID === a.resourceId);
        if (!r || r.type === "material") continue;
        const load = (occupancy[r.uniqueID] || [])
          .filter((iv) => s < iv.end && iv.start < e)
          .reduce((sum, iv) => sum + iv.units, 0);
        if (load + a.units > r.units + 0.001) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        task.startDate = start.toISOString();
        task.endDate = end.toISOString();
        task.resourceLeveledDate = start.toISOString();
        task.resourceLevelingDelay = delayed;
        for (const a of assigns) {
          occupancy[a.resourceId] = occupancy[a.resourceId] || [];
          occupancy[a.resourceId].push({ start: s, end: e, units: a.units });
        }
        break;
      }
      const next = addWorkSeconds(start, project.hoursPerDay * 3600, project);
      delayed += project.hoursPerDay * 3600;
      start = snapToWork(next, project, 1);
    }
  }

  return scheduleProject(project).project;
}

export function catchUp(project: Project, asOf: Date): Project {
  for (const t of project.tasks) {
    const end = parseIso(t.endDate);
    const start = parseIso(t.startDate);
    if (!end || !start) continue;
    if (end <= asOf) {
      t.completion = 100;
      t.effortDone = t.effort;
    } else if (start < asOf && end > asOf) {
      const total = end.getTime() - start.getTime();
      const done = asOf.getTime() - start.getTime();
      t.completion = Math.max(t.completion, Math.min(99, (done / total) * 100));
      t.effortDone = t.effort * (t.completion / 100);
    }
  }
  return scheduleProject(project).project;
}

export function rescheduleIncomplete(project: Project, from: Date): Project {
  for (const t of project.tasks) {
    if (t.completion >= 100 || t.type === "group") continue;
    const start = parseIso(t.startDate);
    if (start && start < from && t.schedulingMode !== "manual") {
      t.startNoEarlierThanDate = from.toISOString();
    }
  }
  return scheduleProject(project).project;
}

export function setBaseline(project: Project, name: string): Project {
  const snapshot = {
    id: `b${project.baselines.length + 1}`,
    name,
    createdAt: new Date().toISOString(),
    tasks: Object.fromEntries(
      project.tasks.map((t) => [
        t.uniqueID,
        { startDate: t.startDate, endDate: t.endDate, effort: t.effort, cost: t.totalCost },
      ]),
    ),
  };
  project.baselines.push(snapshot);
  project.currentBaselineId = snapshot.id;
  return project;
}

export function splitTask(task: Task, at: Date, resumeAt: Date): Task {
  task.splitChunks = [
    { start: task.startDate, end: at.toISOString() },
    { start: resumeAt.toISOString(), end: task.endDate },
  ];
  return task;
}
