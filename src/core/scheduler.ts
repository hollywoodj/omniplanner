import type { Assignment, Dependency, DependencyType, Project, Task } from "./types.js";
import { addElapsedSeconds, addWorkSeconds, parseIso, snapToWork, subtractWorkSeconds, workSecondsBetween } from "./calendar.js";

export interface Violation {
  id: string;
  taskId: string | null;
  kind: "cycle" | "constraint" | "dependency" | "resource" | "date";
  message: string;
  suggestion: string;
}

function taskById(project: Project): Map<string, Task> {
  return new Map(project.tasks.map((t) => [t.uniqueID, t]));
}

function childrenOf(project: Project, parentId: string | null): Task[] {
  return project.tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.order - b.order);
}

function isLeaf(project: Project, task: Task): boolean {
  return task.type !== "group" && !project.tasks.some((t) => t.parentId === task.uniqueID);
}

export function leafTasks(project: Project): Task[] {
  return project.tasks.filter((t) => isLeaf(project, t) && t.type !== "group");
}

function applyDependency(predEnd: Date, predStart: Date, dep: Dependency, succStart: Date, succEnd: Date): { start: Date; end: Date } {
  const lag = dep.leadSeconds;
  const type: DependencyType = dep.type;
  let constraintStart = succStart;
  if (type === "FS") constraintStart = new Date(predEnd.getTime() + lag * 1000);
  else if (type === "SS") constraintStart = new Date(predStart.getTime() + lag * 1000);
  else if (type === "FF") {
    const neededEnd = new Date(predEnd.getTime() + lag * 1000);
    const duration = succEnd.getTime() - succStart.getTime();
    constraintStart = new Date(neededEnd.getTime() - duration);
  } else if (type === "SF") {
    const neededEnd = new Date(predStart.getTime() + lag * 1000);
    const duration = succEnd.getTime() - succStart.getTime();
    constraintStart = new Date(neededEnd.getTime() - duration);
  }
  if (constraintStart > succStart) {
    const delta = constraintStart.getTime() - succStart.getTime();
    return { start: constraintStart, end: new Date(succEnd.getTime() + delta) };
  }
  return { start: succStart, end: succEnd };
}

function topoSort(ids: string[], deps: Dependency[]): { order: string[]; cycles: string[][] } {
  const incoming = new Map<string, number>(ids.map((id) => [id, 0]));
  const edges = new Map<string, string[]>();
  for (const id of ids) edges.set(id, []);
  for (const d of deps) {
    if (!incoming.has(d.dependentTaskId) || !incoming.has(d.prerequisiteTaskId)) continue;
    edges.get(d.prerequisiteTaskId)!.push(d.dependentTaskId);
    incoming.set(d.dependentTaskId, (incoming.get(d.dependentTaskId) || 0) + 1);
  }
  const queue = ids.filter((id) => incoming.get(id) === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const n of edges.get(id) || []) {
      incoming.set(n, (incoming.get(n) || 1) - 1);
      if (incoming.get(n) === 0) queue.push(n);
    }
  }
  const leftover = ids.filter((id) => !order.includes(id));
  const cycles: string[][] = leftover.length ? [leftover] : [];
  return { order: order.concat(leftover), cycles };
}

function computeTaskSpan(task: Task, start: Date, project: Project): { start: Date; end: Date } {
  if (task.type === "milestone") return { start, end: start };
  const duration = Math.max(0, task.duration);
  if (task.elapsedDuration) return { start, end: addElapsedSeconds(start, duration) };
  return { start, end: addWorkSeconds(start, duration, project) };
}

function effortFromAssignments(task: Task, assignments: Assignment[]): number {
  if (task.type === "milestone" || task.type === "group") return task.effort;
  if (assignments.length === 0) return task.duration;
  const units = assignments.reduce((s, a) => s + a.units, 0);
  return task.duration * Math.max(units, 0.01);
}

export function scheduleProject(project: Project): { project: Project; violations: Violation[] } {
  const violations: Violation[] = [];
  const map = taskById(project);
  const projectStart = parseIso(project.startDate) ?? new Date();
  const leaves = leafTasks(project);
  const ids = leaves.map((t) => t.uniqueID);
  const { order, cycles } = topoSort(ids, project.dependencies);
  for (const c of cycles) {
    violations.push({
      id: `cycle-${c.join("-")}`,
      taskId: c[0] ?? null,
      kind: "cycle",
      message: `Dependency loop involving tasks ${c.join(", ")}.`,
      suggestion: "Remove one dependency in the loop.",
    });
  }

  const earlyStart = new Map<string, Date>();
  const earlyEnd = new Map<string, Date>();

  for (const id of order) {
    const task = map.get(id)!;
    let start = snapToWork(projectStart, project, 1);
    if (project.direction === "forward") start = snapToWork(projectStart, project, 1);

    if (task.schedulingMode === "manual" && task.manualStartDate) {
      start = parseIso(task.manualStartDate) ?? start;
    }
    if (task.startNoEarlierThanDate) {
      const c = parseIso(task.startNoEarlierThanDate);
      if (c && c > start) start = c;
    }

    for (const dep of project.dependencies.filter((d) => d.dependentTaskId === id)) {
      const ps = earlyStart.get(dep.prerequisiteTaskId);
      const pe = earlyEnd.get(dep.prerequisiteTaskId);
      if (!ps || !pe) continue;
      const span = computeTaskSpan(task, start, project);
      const applied = applyDependency(pe, ps, dep, span.start, span.end);
      if (applied.start > start) start = applied.start;
    }

    start = snapToWork(start, project, 1);

    if (task.type === "hammock") {
      const preds = project.dependencies.filter((d) => d.dependentTaskId === id);
      const succs = project.dependencies.filter((d) => d.prerequisiteTaskId === id);
      const predEnds = preds.map((d) => earlyEnd.get(d.prerequisiteTaskId)).filter(Boolean) as Date[];
      start = predEnds.length ? new Date(Math.max(...predEnds.map((d) => d.getTime()))) : start;
    }

    let span = computeTaskSpan(task, start, project);

    if (task.schedulingMode === "manual" && task.manualEndDate) {
      span.end = parseIso(task.manualEndDate) ?? span.end;
    }
    if (task.endNoLaterThanDate) {
      const c = parseIso(task.endNoLaterThanDate);
      if (c && span.end > c) {
        violations.push({
          id: `fnlt-${id}`,
          taskId: id,
          kind: "constraint",
          message: `"${task.title}" finishes after its End No Later Than constraint.`,
          suggestion: "Relax the constraint or shorten the task.",
        });
      }
    }
    if (task.endNoEarlierThanDate) {
      const c = parseIso(task.endNoEarlierThanDate);
      if (c && span.end < c) span.end = c;
    }
    if (task.startNoLaterThanDate) {
      const c = parseIso(task.startNoLaterThanDate);
      if (c && start > c) {
        violations.push({
          id: `snlt-${id}`,
          taskId: id,
          kind: "constraint",
          message: `"${task.title}" starts after its Start No Later Than constraint.`,
          suggestion: "Relax the constraint or remove a predecessor.",
        });
      }
    }

    if (task.splitChunks && task.splitChunks.length) {
      span.start = parseIso(task.splitChunks[0].start) ?? span.start;
      span.end = parseIso(task.splitChunks[task.splitChunks.length - 1].end) ?? span.end;
    }

    earlyStart.set(id, span.start);
    earlyEnd.set(id, span.end);
  }

  const projectEndCandidates = [...earlyEnd.values()];
  const projectEnd =
    parseIso(project.endDate) ??
    (projectEndCandidates.length ? new Date(Math.max(...projectEndCandidates.map((d) => d.getTime()))) : addWorkSeconds(projectStart, project.hoursPerWeek * 3600, project));

  const lateEnd = new Map<string, Date>();
  const lateStart = new Map<string, Date>();
  for (const id of [...order].reverse()) {
    const task = map.get(id)!;
    let end = projectEnd;
    const succs = project.dependencies.filter((d) => d.prerequisiteTaskId === id);
    if (succs.length) {
      let minEnd = projectEnd;
      for (const dep of succs) {
        const ss = lateStart.get(dep.dependentTaskId) ?? earlyStart.get(dep.dependentTaskId);
        const se = lateEnd.get(dep.dependentTaskId) ?? earlyEnd.get(dep.dependentTaskId);
        if (!ss || !se) continue;
        if (dep.type === "FS") minEnd = new Date(Math.min(minEnd.getTime(), ss.getTime() - dep.leadSeconds * 1000));
        else if (dep.type === "SS") minEnd = new Date(Math.min(minEnd.getTime(), addWorkSeconds(ss, task.duration, project).getTime()));
        else if (dep.type === "FF") minEnd = new Date(Math.min(minEnd.getTime(), se.getTime() - dep.leadSeconds * 1000));
        else minEnd = new Date(Math.min(minEnd.getTime(), se.getTime()));
      }
      end = minEnd;
    }
    const start = task.type === "milestone" ? end : subtractWorkSeconds(end, task.duration, project);
    lateEnd.set(id, end);
    lateStart.set(id, start);
  }

  for (const task of project.tasks) {
    if (!isLeaf(project, task)) continue;
    const es = earlyStart.get(task.uniqueID) ?? projectStart;
    const ee = earlyEnd.get(task.uniqueID) ?? es;
    const ls = lateStart.get(task.uniqueID) ?? es;
    task.startDate = es.toISOString();
    task.endDate = ee.toISOString();
    task.totalSlack = Math.max(0, workSecondsBetween(es, ls, project));
    const succs = project.dependencies.filter((d) => d.prerequisiteTaskId === task.uniqueID);
    if (succs.length) {
      const nextStarts = succs.map((d) => earlyStart.get(d.dependentTaskId)).filter(Boolean) as Date[];
      const minSucc = nextStarts.length ? new Date(Math.min(...nextStarts.map((d) => d.getTime()))) : ee;
      task.freeSlack = Math.max(0, workSecondsBetween(ee, minSucc, project));
    } else {
      task.freeSlack = task.totalSlack;
    }
    task.critical = task.totalSlack < project.hoursPerDay * 3600 * 0.02 && task.type !== "group";
    const assigns = project.assignments.filter((a) => a.taskId === task.uniqueID);
    if (task.type === "task" || task.type === "hammock") {
      if (task.effort <= 0) task.effort = effortFromAssignments(task, assigns);
    }
    task.effortRemaining = Math.max(0, task.effort - task.effortDone);
    task.completion = task.effort > 0 ? Math.min(100, (task.effortDone / task.effort) * 100) : task.completion;
    task.assignmentsCost = costForTask(project, task, assigns);
    task.totalCost = task.staticCost + task.assignmentsCost;
    if (task.endNoLaterThanDate && ee > (parseIso(task.endNoLaterThanDate) as Date)) {
      task.violation = "Finishes after constraint";
    } else {
      task.violation = null;
    }
  }

  rollupGroups(project);
  detectResourceOverallocation(project, violations);

  const ends = project.tasks.filter((t) => t.parentId === null).map((t) => parseIso(t.endDate)?.getTime() || 0);
  if (ends.length) {
    const maxEnd = new Date(Math.max(...ends));
    if (project.direction === "forward") project.endDate = maxEnd.toISOString();
  }

  return { project, violations };
}

function costForTask(project: Project, task: Task, assigns: Assignment[]): number {
  let cost = 0;
  const hours = task.effort / 3600;
  for (const a of assigns) {
    const r = project.resources.find((x) => x.uniqueID === a.resourceId);
    if (!r) continue;
    cost += r.costPerUse;
    cost += r.costPerHour * hours * a.units;
  }
  return cost;
}

function rollupGroups(project: Project): void {
  const byParent = new Map<string | null, Task[]>();
  for (const t of project.tasks) {
    const list = byParent.get(t.parentId) || [];
    list.push(t);
    byParent.set(t.parentId, list);
  }
  const visit = (id: string) => {
    const kids = (byParent.get(id) || []).sort((a, b) => a.order - b.order);
    for (const k of kids) if (k.type === "group" || project.tasks.some((t) => t.parentId === k.uniqueID)) visit(k.uniqueID);
    const node = project.tasks.find((t) => t.uniqueID === id);
    if (!node) return;
    const children = kids;
    if (!children.length) {
      if (node.type === "group") {
        node.effort = 0;
        node.duration = 0;
      }
      return;
    }
    node.type = node.type === "milestone" ? "milestone" : "group";
    const starts = children.map((c) => parseIso(c.startDate)?.getTime() || 0);
    const ends = children.map((c) => parseIso(c.endDate)?.getTime() || 0);
    node.startDate = new Date(Math.min(...starts)).toISOString();
    node.endDate = new Date(Math.max(...ends)).toISOString();
    node.effort = children.reduce((s, c) => s + c.effort, 0);
    node.effortDone = children.reduce((s, c) => s + c.effortDone, 0);
    node.duration = workSecondsBetween(new Date(node.startDate), new Date(node.endDate), project);
    node.staticCost = children.reduce((s, c) => s + c.staticCost, 0);
    node.assignmentsCost = children.reduce((s, c) => s + c.assignmentsCost, 0);
    node.totalCost = node.staticCost + node.assignmentsCost;
    node.completion = node.effort > 0 ? (node.effortDone / node.effort) * 100 : children.reduce((s, c) => s + c.completion, 0) / children.length;
    node.critical = children.some((c) => c.critical);
    node.totalSlack = Math.min(...children.map((c) => c.totalSlack));
    node.freeSlack = Math.min(...children.map((c) => c.freeSlack));
  };
  for (const t of childrenOf(project, null)) visit(t.uniqueID);
}

function detectResourceOverallocation(project: Project, violations: Violation[]) {
  for (const r of project.resources) {
    if (r.type === "group" || r.type === "material") continue;
    const assigns = project.assignments.filter((a) => a.resourceId === r.uniqueID);
    const intervals = assigns
      .map((a) => {
        const t = project.tasks.find((x) => x.uniqueID === a.taskId);
        if (!t) return null;
        return { start: parseIso(t.startDate)!.getTime(), end: parseIso(t.endDate)!.getTime(), units: a.units, task: t };
      })
      .filter(Boolean) as { start: number; end: number; units: number; task: Task }[];
    for (let i = 0; i < intervals.length; i++) {
      let load = intervals[i].units;
      for (let j = 0; j < intervals.length; j++) {
        if (i === j) continue;
        if (intervals[i].start < intervals[j].end && intervals[j].start < intervals[i].end) load += intervals[j].units;
      }
      if (load > r.units + 0.001) {
        violations.push({
          id: `res-${r.uniqueID}-${intervals[i].task.uniqueID}`,
          taskId: intervals[i].task.uniqueID,
          kind: "resource",
          message: `${r.name} is overallocated on "${intervals[i].task.title}" (${Math.round(load * 100)}% > ${Math.round(r.units * 100)}%).`,
          suggestion: "Level resources, split the task, or assign additional staff.",
        });
        intervals[i].task.violation = intervals[i].task.violation || "Resource overallocation";
      }
    }
  }
}

export function outlineNumber(project: Project, taskId: string, mode: "hierarchical" | "flat"): string {
  const flat = project.tasks.filter((t) => t.type !== "group" || true).sort(compareOutline);
  if (mode === "flat") {
    const idx = flat.findIndex((t) => t.uniqueID === taskId);
    return String(idx + 1);
  }
  const path: number[] = [];
  const walk = (parentId: string | null, target: string): boolean => {
    const kids = project.tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.order - b.order);
    for (let i = 0; i < kids.length; i++) {
      path.push(i + 1);
      if (kids[i].uniqueID === target) return true;
      if (walk(kids[i].uniqueID, target)) return true;
      path.pop();
    }
    return false;
  };
  walk(null, taskId);
  return path.join(".") || "0";
}

export function compareOutline(a: Task, b: Task): number {
  return a.order - b.order;
}

export function flattenedOutline(project: Project): Task[] {
  const out: Task[] = [];
  const walk = (parentId: string | null) => {
    const kids = project.tasks.filter((t) => t.parentId === parentId).sort((a, b) => a.order - b.order);
    for (const k of kids) {
      out.push(k);
      if (!k.collapsed) walk(k.uniqueID);
    }
  };
  walk(null);
  return out;
}

export function allDescendants(project: Project, taskId: string): Task[] {
  const out: Task[] = [];
  const walk = (id: string) => {
    for (const t of project.tasks.filter((x) => x.parentId === id)) {
      out.push(t);
      walk(t.uniqueID);
    }
  };
  walk(taskId);
  return out;
}
