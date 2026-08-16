import { parseOmniUrl, taskUrl } from "./bridge.js";
import type { Project } from "./types.js";

export function resolveUrl(project: Project, raw: string): { tasks: string[]; resources: string[] } {
  const parsed = parseOmniUrl(raw);
  if (parsed.kind === "task") {
    if (parsed.ids.length) return { tasks: parsed.ids, resources: [] };
    if (parsed.query.title || parsed.query.name) {
      const q = (parsed.query.title || parsed.query.name).toLowerCase();
      return {
        tasks: project.tasks.filter((t) => t.title.toLowerCase() === q).map((t) => t.uniqueID),
        resources: [],
      };
    }
    if (parsed.query.position) {
      return { tasks: [], resources: [] };
    }
  }
  if (parsed.kind === "resource") {
    if (parsed.query.name) {
      const q = parsed.query.name.toLowerCase();
      return { tasks: [], resources: project.resources.filter((r) => r.name.toLowerCase() === q).map((r) => r.uniqueID) };
    }
    return { tasks: [], resources: parsed.ids };
  }
  return { tasks: [], resources: [] };
}

export function linkForTask(taskId: string): string {
  return taskUrl("omniplan", taskId);
}
