export type ViewMode = "outline" | "gantt" | "network" | "resource";
export type InspectorTab = "project" | "milestones" | "task" | "resource" | "styles" | "custom";

export interface Task {
  uniqueID: string;
  parentId: string | null;
  order: number;
  title: string;
  type: "task" | "milestone" | "group" | "hammock";
  note: string;
  effort: number;
  effortDone: number;
  effortRemaining: number;
  duration: number;
  elapsedDuration: boolean;
  staticCost: number;
  priority: number;
  completion: number;
  schedulingMode: "automatic" | "manual";
  asapAlap: "asap" | "alap";
  allowSplitting: boolean;
  startNoEarlierThanDate: string | null;
  startNoLaterThanDate: string | null;
  endNoEarlierThanDate: string | null;
  endNoLaterThanDate: string | null;
  manualStartDate: string | null;
  manualEndDate: string | null;
  minEffortEstimate: number | null;
  expectedEffortEstimate: number | null;
  maxEffortEstimate: number | null;
  resourceAssignmentType: string;
  taskProgressRequires: string;
  collapsed: boolean;
  whenClosed: string;
  recurrence: { interval: number; unit: string; start: string } | null;
  customData: Record<string, string>;
  color: string | null;
  splitChunks: { start: string; end: string }[] | null;
  startDate: string;
  endDate: string;
  freeSlack: number;
  totalSlack: number;
  critical: boolean;
  resourceLeveledDate: string | null;
  resourceLevelingDelay: number;
  assignmentsCost: number;
  totalCost: number;
  violation: string | null;
}

export interface Resource {
  uniqueID: string;
  parentId: string | null;
  order: number;
  name: string;
  type: "staff" | "equipment" | "material" | "group";
  email: string;
  note: string;
  units: number;
  efficiency: number;
  costPerUse: number;
  costPerHour: number;
  customData: Record<string, string>;
  collapsed: boolean;
}

export interface Dependency {
  id: string;
  prerequisiteTaskId: string;
  dependentTaskId: string;
  type: "FS" | "FF" | "SS" | "SF";
  leadSeconds: number;
  leadKind: string;
}

export interface Assignment {
  id: string;
  taskId: string;
  resourceId: string;
  units: number;
}

export interface Project {
  id: string;
  documentName: string;
  title: string;
  direction: "forward" | "backward";
  dateMode: "specific" | "tbd";
  granularity: "minute" | "hour" | "day";
  startDate: string;
  endDate: string | null;
  currency: string;
  showSeconds: boolean;
  showTimeOfDay: boolean;
  hoursPerDay: number;
  hoursPerWeek: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  fileType: string;
  includePreview: boolean;
  tasks: Task[];
  resources: Resource[];
  dependencies: Dependency[];
  assignments: Assignment[];
  baselines: { id: string; name: string; createdAt: string }[];
  currentBaselineId: string | null;
  styles: {
    ganttBarColor: string;
    criticalPathColor: string;
    weekendColor: string;
    todayColor: string;
    outlineFont: string;
    outlineSize: number;
  };
  slackLimitHours: number;
  criticalPathToMilestoneIds: string[];
  notes: string;
  linkedFiles: { id: string; path: string; name: string }[];
  customData: Record<string, string>;
  violations?: { id: string; taskId: string | null; kind: string; message: string; suggestion: string }[];
}

export interface Preferences {
  tabIndents: boolean;
  newRowsIndentedInGroups: boolean;
  returnCreatesRow: boolean;
  firstDayOfWeek: number;
  fiscalYearEnabled: boolean;
  fiscalYearStartMonth: number;
  defaultTemplateId: string;
  checkForUpdates: boolean;
  sendAnonymousInfo: boolean;
  appearance: "auto" | "light" | "dark";
  omnifocusUrl: string;
  omniplanUrl: string;
}

export function flatten(project: Project): Task[] {
  const out: Task[] = [];
  const walk = (parentId: string | null) => {
    project.tasks
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .forEach((t) => {
        out.push(t);
        if (!t.collapsed) walk(t.uniqueID);
      });
  };
  walk(null);
  return out;
}

export function hier(project: Project, id: string): string {
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
  walk(null, id);
  return path.join(".");
}

export function depthOf(project: Project, id: string): number {
  let d = 0;
  let cur = project.tasks.find((t) => t.uniqueID === id);
  while (cur?.parentId) {
    d++;
    cur = project.tasks.find((t) => t.uniqueID === cur!.parentId);
  }
  return d;
}

export function fmtDur(seconds: number, hpd = 8): string {
  if (!seconds) return "0";
  const d = Math.floor(seconds / (hpd * 3600));
  const h = Math.floor((seconds - d * hpd * 3600) / 3600);
  if (d && h) return `${d}d ${h}h`;
  if (d) return `${d}d`;
  if (h) return `${h}h`;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function fmtDate(iso: string, tbd = false): string {
  if (tbd) {
    return "T-day";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function money(n: number, c = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);
}
