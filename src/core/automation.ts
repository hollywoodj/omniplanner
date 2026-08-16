import type { Project, Task } from "./types.js";
import { blankTask } from "./factory.js";
import { appendLinkToNote, type OFToOPTaskPayload, type OPToOFTaskPayload } from "./bridge.js";
import { parseDuration } from "./duration.js";

export interface AutomationContext {
  document: { name: string };
  actual: {
    rootTask: TaskProxy;
    taskNamed(name: string): TaskProxy | null;
  };
  selection: { tasks: TaskProxy[]; resources: { uniqueID: string; name: string }[]; project: Project };
}

class TaskProxy {
  constructor(
    private project: Project,
    public task: Task,
  ) {}
  get uniqueID() {
    return this.task.uniqueID;
  }
  get title() {
    return this.task.title;
  }
  set title(v: string) {
    this.task.title = v;
  }
  get note() {
    return this.task.note;
  }
  set note(v: string) {
    this.task.note = v;
  }
  get endDate() {
    return this.task.endDate ? new Date(this.task.endDate) : null;
  }
  get startDate() {
    return this.task.startDate ? new Date(this.task.startDate) : null;
  }
  set endNoLaterThanDate(v: Date | null) {
    this.task.endNoLaterThanDate = v ? v.toISOString() : null;
  }
  set type(v: Task["type"]) {
    this.task.type = v;
  }
  customValue(key: string) {
    return this.task.customData[key] ?? null;
  }
  setCustomValue(key: string, value: string) {
    this.task.customData[key] = value;
  }
  addSubtask(): TaskProxy {
    const child = blankTask({ parentId: this.task.uniqueID === "root" ? null : this.task.uniqueID, order: this.project.tasks.length });
    if (this.task.uniqueID !== "root") this.task.type = "group";
    this.project.tasks.push(child);
    return new TaskProxy(this.project, child);
  }
  descendents(): TaskProxy[] {
    const walk = (id: string | null): Task[] => {
      const kids = this.project.tasks.filter((t) => t.parentId === id);
      return kids.flatMap((k) => [k, ...walk(k.uniqueID)]);
    };
    const rootId = this.task.uniqueID === "root" ? null : this.task.uniqueID;
    return walk(rootId).map((t) => new TaskProxy(this.project, t));
  }
  remove() {
    this.project.tasks = this.project.tasks.filter((t) => t.uniqueID !== this.task.uniqueID);
  }
}

export function automationContext(project: Project, selectedIds: string[] = []): AutomationContext {
  const root: Task = blankTask({ uniqueID: "root", title: project.title, type: "group" });
  const rootProxy = new TaskProxy(project, root);
  rootProxy.addSubtask = () => {
    const child = blankTask({ parentId: null, order: thisOrder(project) });
    project.tasks.push(child);
    return new TaskProxy(project, child);
  };
  return {
    document: { name: project.documentName.replace(/\.oplx$/i, "") },
    actual: {
      rootTask: rootProxy,
      taskNamed(name: string) {
        const t = project.tasks.find((x) => x.title === name);
        return t ? new TaskProxy(project, t) : null;
      },
    },
    selection: {
      tasks: project.tasks.filter((t) => selectedIds.includes(t.uniqueID)).map((t) => new TaskProxy(project, t)),
      resources: project.resources,
      project,
    },
  };
}

function thisOrder(project: Project) {
  const top = project.tasks.filter((t) => t.parentId === null);
  return top.length ? Math.max(...top.map((t) => t.order)) + 1 : 0;
}

export function copyTasksToOmniFocusPayload(project: Project, taskIds: string[]): OPToOFTaskPayload[] {
  const today = new Date().toISOString();
  return taskIds
    .map((id) => project.tasks.find((t) => t.uniqueID === id))
    .filter(Boolean)
    .map((t) => {
      const link = `omniplan:///task/${t!.uniqueID}`;
      const note = appendLinkToNote(t!.note, link);
      return {
        OPprojectName: project.title,
        OPtaskTitle: t!.title,
        OPtaskNote: note,
        OPtaskDueDate: t!.endDate || today,
        OPtaskID: t!.uniqueID,
      };
    });
}

export function applyOmniFocusLinks(project: Project, taskIds: string[], ofLinks: string[]): Project {
  taskIds.forEach((id, i) => {
    const t = project.tasks.find((x) => x.uniqueID === id);
    const link = ofLinks[i];
    if (!t || !link) return;
    t.note = appendLinkToNote(t.note, link);
    const key = link.split("/").pop();
    if (key) t.customData.OmniFocusID = key;
  });
  return project;
}

export function ingestOmniFocusTasks(project: Project, payloads: OFToOPTaskPayload[]): { project: Project; links: string[] } {
  const links: string[] = [];
  for (const p of payloads) {
    const task = blankTask({
      title: p.OFtaskTitle,
      note: p.OFtaskNote,
      endNoLaterThanDate: p.OFtaskDueDate,
      parentId: null,
      order: thisOrder(project),
    });
    if (p.OFtaskID) task.customData.OmniFocusID = p.OFtaskID;
    project.tasks.push(task);
    links.push(`omniplan:///task/${task.uniqueID}`);
  }
  return { project, links };
}

export function applyOmniFocusStatus(
  project: Project,
  updates: { OmniFocusID: string; name?: string; completed?: boolean; dueDate?: string }[],
): Project {
  for (const u of updates) {
    const t = project.tasks.find((x) => x.customData.OmniFocusID === u.OmniFocusID);
    if (!t) continue;
    if (u.name) t.title = u.name;
    if (u.completed) {
      t.completion = 100;
      t.effortDone = t.effort;
    }
    if (u.dueDate) t.endNoLaterThanDate = u.dueDate;
  }
  return project;
}

export { parseDuration };
