/**
 * Cross-app integration matching Omni Automation (OmniPlan ↔ OmniFocus).
 *
 * Official protocol (omni-automation.com/omniplan/app-to-app.html):
 *   URL.tellFunction(appName, fn, argument).call(success, error)
 *
 * URL schemes (both apps):
 *   omniplan:///task/{uniqueID}
 *   omniplan:///task/{id,id}
 *   omniplan:///task?title=...
 *   omniplan:///resource/{uniqueID}
 *   omniplan://localhost/omnijs-run?script=...
 *   omnifocus:///task/{primaryKey}
 *
 * Copy OmniPlan → OmniFocus payload keys:
 *   OPprojectName, OPtaskTitle, OPtaskNote, OPtaskDueDate
 *   Returns: omnifocus:///task/{id}[]  (appended to OmniPlan task notes)
 *
 * Copy OmniFocus → OmniPlan payload keys:
 *   OFtaskTitle, OFtaskNote, OFtaskDueDate
 *   Returns: omniplan:///task/{uniqueID}[]  (appended to OmniFocus task notes)
 *
 * OmniPlanFocusSync custom data key: OmniFocusID
 */

export const OMNI_SCHEMES = {
  omniplan: "omniplan",
  omnifocus: "omnifocus",
  omnioutliner: "omnioutliner",
} as const;

export interface OPToOFTaskPayload {
  OPprojectName: string;
  OPtaskTitle: string;
  OPtaskNote: string;
  OPtaskDueDate: string;
  OPtaskID?: string;
}

export interface OFToOPTaskPayload {
  OFtaskTitle: string;
  OFtaskNote: string;
  OFtaskDueDate: string;
  OFtaskID?: string;
}

export interface TellRequest {
  app: string;
  functionName?: string;
  argument: unknown;
  script?: string;
}

export interface TellResult {
  ok: boolean;
  result?: unknown;
  errorMessage?: string;
}

export function taskUrl(app: "omniplan" | "omnifocus", id: string | string[]): string {
  const ids = Array.isArray(id) ? id.join(",") : id;
  return `${app}:///task/${ids}`;
}

export function resourceUrl(id: string | string[]): string {
  const ids = Array.isArray(id) ? id.join(",") : id;
  return `omniplan:///resource/${ids}`;
}

export function parseOmniUrl(raw: string): {
  app: string;
  host: string;
  path: string;
  kind: "task" | "resource" | "document" | "run" | "add" | "unknown";
  ids: string[];
  query: Record<string, string>;
} {
  const url = new URL(raw.replace(/^([a-z]+):\/\/\//i, "$1://localhost/"));
  const app = (raw.match(/^([a-z]+):/i)?.[1] || "omniplan").toLowerCase();
  const parts = url.pathname.replace(/^\//, "").split("/").filter(Boolean);
  const query = Object.fromEntries(url.searchParams.entries());
  let kind: "task" | "resource" | "document" | "run" | "add" | "unknown" = "unknown";
  let ids: string[] = [];
  if (parts[0] === "omnijs-run" || url.searchParams.has("script")) kind = "run";
  else if (parts.includes("task") || parts[0] === "task") {
    kind = "task";
    const i = parts.lastIndexOf("task");
    const rest = parts[i + 1] || query.id || "";
    ids = rest.split(",").map((s) => decodeURIComponent(s).trim()).filter(Boolean);
  } else if (parts.includes("resource") || parts[0] === "resource") {
    kind = "resource";
    const i = parts.lastIndexOf("resource");
    ids = (parts[i + 1] || "").split(",").filter(Boolean);
  } else if (parts[0] === "add") kind = "add";
  else if (parts.length) kind = "document";
  return { app, host: url.host, path: url.pathname, kind, ids, query };
}

export function appendLinkToNote(note: string | null | undefined, link: string): string {
  const n = note || "";
  if (n.includes(link)) return n;
  return n.length ? `${n}\n${link}` : link;
}

export function extractLinks(note: string, scheme: string): string[] {
  const re = new RegExp(`${scheme}:\\/\\/\\/[^\\s]+`, "g");
  return note.match(re) || [];
}

/** Built-in plug-in manifests matching official Omni Automation identifiers. */
export const BUILTIN_PLUGINS = [
  {
    type: "action" as const,
    targets: ["omniplan"],
    author: "Otto Automator",
    identifier: "com.omni-automation.op.copy-tasks-to-omnifocus",
    version: "1.2",
    description: "This action will create copies of the selected OmniPlan tasks in OmniFocus.",
    label: "Copy Selected Tasks to OmniFocus",
    shortLabel: "Copy to OmniFocus",
    paletteLabel: "Copy to OmniFocus",
    image: "doc.on.doc.fill",
  },
  {
    type: "action" as const,
    targets: ["omnifocus"],
    author: "Otto Automator",
    identifier: "com.omni-automation.of.op.copy-tasks-to-omniplan",
    version: "1.2",
    description: "This action will create copies of the selected tasks in the current OmniPlan project.",
    label: "Copy Selected Tasks to OmniPlan",
    shortLabel: "Copy to OmniPlan",
    paletteLabel: "Copy to OmniPlan",
    image: "doc.on.doc.fill",
  },
  {
    type: "action" as const,
    targets: ["omniplan"],
    author: "OmniPlan",
    identifier: "com.omniplan.sync.pull-omnifocus",
    version: "1.0",
    description: "Pull completion status from OmniFocus for tasks that have an OmniFocusID custom value.",
    label: "Pull Status from OmniFocus",
    shortLabel: "Pull from OmniFocus",
    paletteLabel: "Pull OF",
    image: "arrow.triangle.2.circlepath",
  },
  {
    type: "action" as const,
    targets: ["omniplan"],
    author: "OmniPlan",
    identifier: "com.omniplan.sync.push-omnifocus",
    version: "1.0",
    description: "Push title, dates, and completion to linked OmniFocus tasks.",
    label: "Push Updates to OmniFocus",
    shortLabel: "Push to OmniFocus",
    paletteLabel: "Push OF",
    image: "arrow.up.circle",
  },
];
