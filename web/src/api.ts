const json = async (r: Response) => {
  if (!r.ok) {
    const t = await r.text();
    throw new Error(t || r.statusText);
  }
  if (r.status === 204) return null;
  return r.json();
};

export const api = {
  state: () => fetch("/api/state").then(json),
  project: (id: string) => fetch(`/api/projects/${id}`).then(json),
  saveProject: (p: unknown) =>
    fetch(`/api/projects/${(p as { id: string }).id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(p),
    }).then(json),
  patchProject: (id: string, body: unknown) =>
    fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  createProject: (title: string, templateId?: string) =>
    fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, templateId }) }).then(json),
  addTask: (id: string, body: unknown) =>
    fetch(`/api/projects/${id}/tasks`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  patchTask: (id: string, taskId: string, body: unknown) =>
    fetch(`/api/projects/${id}/tasks/${taskId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  deleteTask: (id: string, taskId: string) => fetch(`/api/projects/${id}/tasks/${taskId}`, { method: "DELETE" }).then(json),
  addDep: (id: string, body: unknown) =>
    fetch(`/api/projects/${id}/dependencies`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  deleteDep: (id: string, depId: string) => fetch(`/api/projects/${id}/dependencies/${depId}`, { method: "DELETE" }).then(json),
  addResource: (id: string, body: unknown) =>
    fetch(`/api/projects/${id}/resources`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  patchResource: (id: string, rid: string, body: unknown) =>
    fetch(`/api/projects/${id}/resources/${rid}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  deleteResource: (id: string, rid: string) => fetch(`/api/projects/${id}/resources/${rid}`, { method: "DELETE" }).then(json),
  assign: (id: string, body: unknown) =>
    fetch(`/api/projects/${id}/assignments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json),
  unassign: (id: string, aid: string) => fetch(`/api/projects/${id}/assignments/${aid}`, { method: "DELETE" }).then(json),
  level: (id: string) => fetch(`/api/projects/${id}/level`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then(json),
  catchUp: (id: string, date?: string) =>
    fetch(`/api/projects/${id}/catch-up`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date }) }).then(json),
  reschedule: (id: string, date?: string) =>
    fetch(`/api/projects/${id}/reschedule`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date }) }).then(json),
  baseline: (id: string, name?: string) =>
    fetch(`/api/projects/${id}/baseline`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).then(json),
  simulate: (id: string) =>
    fetch(`/api/projects/${id}/simulate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ autoEstimate: true, iterations: 200 }) }).then(json),
  eva: (id: string) => fetch(`/api/projects/${id}/eva`).then(json),
  prefs: (body?: unknown) =>
    body
      ? fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(json)
      : fetch("/api/preferences").then(json),
  copyToOmniFocus: (projectId: string, taskIds: string[]) =>
    fetch("/bridge/omnifocus/copy-tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, taskIds }) }).then(json),
  pullOf: (projectId: string) =>
    fetch("/bridge/omnifocus/pull-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) }).then(json),
  pushOf: (projectId: string) =>
    fetch("/bridge/omnifocus/push-updates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId }) }).then(json),
  exportUrl: (id: string, fmt: string) => `/api/projects/${id}/export/${fmt}`,
};
