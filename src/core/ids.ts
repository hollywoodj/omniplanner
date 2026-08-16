const SEQ = { task: 1, resource: 1, dep: 1, asg: 1, other: 1 };

export function resetIds(next = { task: 1, resource: 1, dep: 1, asg: 1, other: 1 }) {
  Object.assign(SEQ, next);
}

export function nextTaskId(): string {
  return String(SEQ.task++);
}

export function nextResourceId(): string {
  return String(SEQ.resource++);
}

export function nextDepId(): string {
  return `d${SEQ.dep++}`;
}

export function nextAsgId(): string {
  return `a${SEQ.asg++}`;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${SEQ.other++}-${Math.random().toString(36).slice(2, 8)}`;
}

export function syncCountersFromProject(tasks: { uniqueID: string }[], resources: { uniqueID: string }[]) {
  const maxTask = tasks.reduce((m, t) => Math.max(m, Number.parseInt(t.uniqueID, 10) || 0), 0);
  const maxRes = resources.reduce((m, r) => Math.max(m, Number.parseInt(r.uniqueID, 10) || 0), 0);
  SEQ.task = Math.max(SEQ.task, maxTask + 1);
  SEQ.resource = Math.max(SEQ.resource, maxRes + 1);
}
