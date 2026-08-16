/** OmniPlan 4 domain types, aligned with Omni Automation (omni-automation.com/omniplan). */

export type TaskType = "task" | "milestone" | "group" | "hammock";
export type ResourceType = "staff" | "equipment" | "material" | "group";
export type DependencyType = "FS" | "FF" | "SS" | "SF";
export type LeadKind = "work" | "elapsed" | "percent";
export type ScheduleDirection = "forward" | "backward";
export type DateMode = "specific" | "tbd";
export type Granularity = "minute" | "hour" | "day";
export type ResourceAssignmentType = "adjustDuration" | "adjustEffort" | "adjustAssignedAmounts";
export type TaskProgressRequires = "any" | "all";
export type SchedulingMode = "automatic" | "manual";
export type AsapAlap = "asap" | "alap";
export type ViewMode = "outline" | "gantt" | "network" | "resource";
export type BaselineDisplay = "actual" | "baseline" | "both" | "split";
export type NonWorkingTimeDisplay = "none" | "holidays" | "weekends" | "all";
export type NumberingMode = "hierarchical" | "flat";
export type FileType = "flat" | "package";

export interface RecurrenceRule {
  interval: number;
  unit: "day" | "week" | "month" | "year";
  start: string;
  endBy?: string;
  endAfter?: number;
}

export interface Dependency {
  id: string;
  prerequisiteTaskId: string;
  dependentTaskId: string;
  type: DependencyType;
  leadSeconds: number;
  leadKind: LeadKind;
}

export interface Assignment {
  id: string;
  taskId: string;
  resourceId: string;
  units: number;
}

export interface Task {
  uniqueID: string;
  parentId: string | null;
  order: number;
  title: string;
  type: TaskType;
  note: string;
  effort: number;
  effortDone: number;
  effortRemaining: number;
  duration: number;
  elapsedDuration: boolean;
  staticCost: number;
  priority: number;
  completion: number;
  schedulingMode: SchedulingMode;
  asapAlap: AsapAlap;
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
  resourceAssignmentType: ResourceAssignmentType;
  taskProgressRequires: TaskProgressRequires;
  collapsed: boolean;
  whenClosed: "taskBar" | "rollUp";
  recurrence: RecurrenceRule | null;
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
  type: ResourceType;
  email: string;
  note: string;
  units: number;
  efficiency: number;
  costPerUse: number;
  costPerHour: number;
  customData: Record<string, string>;
  workWeek: WorkWeek | null;
  collapsed: boolean;
}

export interface WorkDay {
  startMinutes: number;
  endMinutes: number;
  startMinutes2?: number;
  endMinutes2?: number;
}

export interface WorkWeek {
  days: Record<number, WorkDay | null>;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface BaselineSnapshot {
  id: string;
  name: string;
  createdAt: string;
  tasks: Record<string, { startDate: string; endDate: string; effort: number; cost: number }>;
}

export interface ChangeRecord {
  id: string;
  at: string;
  author: string;
  summary: string;
  accepted: boolean | null;
}

export interface NamedStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  rowColor: string | null;
  barColor: string | null;
}

export interface ProjectStyles {
  outlineFont: string;
  outlineSize: number;
  ganttBarColor: string;
  criticalPathColor: string;
  milestoneColor: string;
  groupColor: string;
  dependencyColor: string;
  weekendColor: string;
  todayColor: string;
  namedStyles: NamedStyle[];
}

export interface Project {
  id: string;
  documentName: string;
  title: string;
  direction: ScheduleDirection;
  dateMode: DateMode;
  granularity: Granularity;
  startDate: string;
  endDate: string | null;
  currency: string;
  showSeconds: boolean;
  showTimeOfDay: boolean;
  effortUnits: Array<"s" | "m" | "h" | "d" | "w" | "mo" | "y">;
  durationUnits: Array<"s" | "m" | "h" | "d" | "w" | "mo" | "y">;
  hoursPerDay: number;
  hoursPerWeek: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  fileType: FileType;
  includePreview: boolean;
  workWeek: WorkWeek;
  holidays: Holiday[];
  tasks: Task[];
  resources: Resource[];
  dependencies: Dependency[];
  assignments: Assignment[];
  baselines: BaselineSnapshot[];
  currentBaselineId: string | null;
  changes: ChangeRecord[];
  styles: ProjectStyles;
  slackLimitHours: number;
  criticalPathToMilestoneIds: string[];
  notes: string;
  linkedFiles: { id: string; path: string; name: string }[];
  customData: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Preferences {
  tabIndents: boolean;
  newRowsIndentedInGroups: boolean;
  returnCreatesRow: boolean;
  firstDayOfWeek: number;
  fiscalYearEnabled: boolean;
  fiscalYearStartMonth: number;
  dateHeaderFormats: Record<string, { primary: string; summary: string | null }>;
  defaultTemplateId: string;
  checkForUpdates: boolean;
  sendAnonymousInfo: boolean;
  appearance: "auto" | "light" | "dark";
  omnifocusUrl: string;
  omniplanUrl: string;
}

export interface Template {
  id: string;
  name: string;
  builtIn: boolean;
  isDefault: boolean;
  project: Partial<Project>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  builtIn: boolean;
  html: string;
}

export interface ServerAccount {
  id: string;
  kind: "omni" | "webdav" | "calendar";
  name: string;
  url: string;
  connected: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  projectIds: string[];
}

export interface AppState {
  version: string;
  projects: Project[];
  templates: Template[];
  reportTemplates: ReportTemplate[];
  preferences: Preferences;
  accounts: ServerAccount[];
  dashboards: Dashboard[];
  plugins: PluginManifest[];
}

export interface PluginManifest {
  type: "action";
  targets: string[];
  author: string;
  identifier: string;
  version: string;
  description: string;
  label: string;
  shortLabel: string;
  paletteLabel: string;
  image?: string;
}

export const DEFAULT_WORK_WEEK: WorkWeek = {
  days: {
    0: null,
    1: { startMinutes: 8 * 60, endMinutes: 12 * 60, startMinutes2: 13 * 60, endMinutes2: 17 * 60 },
    2: { startMinutes: 8 * 60, endMinutes: 12 * 60, startMinutes2: 13 * 60, endMinutes2: 17 * 60 },
    3: { startMinutes: 8 * 60, endMinutes: 12 * 60, startMinutes2: 13 * 60, endMinutes2: 17 * 60 },
    4: { startMinutes: 8 * 60, endMinutes: 12 * 60, startMinutes2: 13 * 60, endMinutes2: 17 * 60 },
    5: { startMinutes: 8 * 60, endMinutes: 12 * 60, startMinutes2: 13 * 60, endMinutes2: 17 * 60 },
    6: null,
  },
};

export const DEFAULT_STYLES: ProjectStyles = {
  outlineFont: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
  outlineSize: 13,
  ganttBarColor: "#5aa7a8",
  criticalPathColor: "#d94c3f",
  milestoneColor: "#5aa7a8",
  groupColor: "#5aa7a8",
  dependencyColor: "#8a8a8a",
  weekendColor: "#f3f4f6",
  todayColor: "#e24b3b",
  namedStyles: [],
};

export const DEFAULT_PREFERENCES: Preferences = {
  tabIndents: true,
  newRowsIndentedInGroups: true,
  returnCreatesRow: true,
  firstDayOfWeek: 0,
  fiscalYearEnabled: false,
  fiscalYearStartMonth: 1,
  dateHeaderFormats: {
    hours: { primary: "h a", summary: "EEE MMM d" },
    days: { primary: "d", summary: "MMM yyyy" },
    weeks: { primary: "MMM d", summary: "yyyy" },
    months: { primary: "MMM", summary: "yyyy" },
    quarters: { primary: "'Q'q", summary: "yyyy" },
    years: { primary: "yyyy", summary: null },
  },
  defaultTemplateId: "standard",
  checkForUpdates: true,
  sendAnonymousInfo: false,
  appearance: "auto",
  omnifocusUrl: process.env.OMNIFOCUS_URL || "http://127.0.0.1:4456",
  omniplanUrl: process.env.OMNIPLAN_URL || "http://127.0.0.1:4455",
};

export const OUTLINE_COLUMNS = [
  "title",
  "hierarchicalTitle",
  "duration",
  "effort",
  "effortDone",
  "start",
  "end",
  "assigned",
  "complete",
  "prerequisites",
  "dependents",
  "taskCost",
  "resourcesCost",
  "totalCost",
  "freeSlack",
  "totalSlack",
  "priority",
  "startNoEarlierThan",
  "endNoLaterThan",
  "notes",
  "violation",
  "omnifocusId",
] as const;

export type OutlineColumn = (typeof OUTLINE_COLUMNS)[number];
