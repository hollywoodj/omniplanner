import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { BUILTIN_PLUGINS } from "./bridge.js";
import { DEFAULT_PREFERENCES } from "./types.js";
import type { AppState, Project } from "./types.js";
import { sampleAtlasRelease, simpleProject } from "./sample.js";
import { scheduleProject } from "./scheduler.js";
import { syncCountersFromProject } from "./ids.js";
import { blankProject } from "./factory.js";

const DATA_DIR = process.env.OMNIPLAN_DATA || join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "omniplan.json");

function builtinTemplates() {
  const standard = sampleAtlasRelease();
  const simple = simpleProject();
  return [
    { id: "standard", name: "Standard Project", builtIn: true, isDefault: true, project: { title: "Standard Project" } },
    { id: "standard-styled", name: "Standard Project (Styled)", builtIn: true, isDefault: false, project: { title: "Standard Project (Styled)", styles: standard.styles } },
    { id: "simple", name: "Simple Project", builtIn: true, isDefault: false, project: { title: "Simple Project", tasks: simple.tasks.slice(0, 4) } },
  ];
}

export function defaultState(): AppState {
  const atlas = sampleAtlasRelease();
  return {
    version: "4.10.3",
    projects: [atlas],
    templates: builtinTemplates(),
    reportTemplates: [
      {
        id: "summary",
        name: "Project Summary",
        builtIn: true,
        html: "<h1>{{title}}</h1><p>{{duration}} · {{cost}}</p>",
      },
      {
        id: "milestone",
        name: "Milestone Report",
        builtIn: true,
        html: "<h1>Milestones — {{title}}</h1>",
      },
    ],
    preferences: { ...DEFAULT_PREFERENCES },
    accounts: [],
    dashboards: [{ id: "main", name: "Portfolio", projectIds: [atlas.id] }],
    plugins: BUILTIN_PLUGINS,
  };
}

let cache: AppState | null = null;

export function loadState(): AppState {
  if (cache) return cache;
  if (!existsSync(DATA_FILE)) {
    cache = defaultState();
    saveState(cache);
    return cache;
  }
  const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as AppState;
  parsed.preferences = { ...DEFAULT_PREFERENCES, ...parsed.preferences };
  parsed.plugins = parsed.plugins?.length ? parsed.plugins : BUILTIN_PLUGINS;
  for (const p of parsed.projects) syncCountersFromProject(p.tasks, p.resources);
  cache = parsed;
  return cache;
}

export function saveState(state: AppState = loadState()): void {
  cache = state;
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export function getProject(id: string): Project {
  const p = loadState().projects.find((x) => x.id === id);
  if (!p) throw Object.assign(new Error(`Project not found: ${id}`), { status: 404 });
  return p;
}

export function putProject(project: Project): Project {
  const scheduled = scheduleProject(project).project;
  scheduled.updatedAt = new Date().toISOString();
  const state = loadState();
  const idx = state.projects.findIndex((p) => p.id === scheduled.id);
  if (idx >= 0) state.projects[idx] = scheduled;
  else state.projects.push(scheduled);
  saveState(state);
  return scheduled;
}

export function createProject(title: string, templateId?: string): Project {
  const state = loadState();
  const base = templateId === "simple" ? simpleProject() : sampleAtlasRelease();
  const project = blankProject({
    ...base,
    id: undefined,
    title,
    documentName: `${title}.oplx`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (templateId !== "standard" && templateId !== undefined) {
    project.tasks = base.tasks;
    project.resources = base.resources;
    project.dependencies = base.dependencies;
    project.assignments = base.assignments;
  }
  if (templateId === "empty") {
    project.tasks = [];
    project.resources = [];
    project.dependencies = [];
    project.assignments = [];
  }
  state.projects.push(project);
  saveState(state);
  return scheduleProject(project).project;
}

export function deleteProject(id: string): void {
  const state = loadState();
  state.projects = state.projects.filter((p) => p.id !== id);
  saveState(state);
}

export function mutateProject(id: string, fn: (p: Project) => Project): Project {
  const project = structuredClone(getProject(id));
  return putProject(fn(project));
}
