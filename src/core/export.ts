import type { Project } from "./types.js";
import { formatDuration } from "./duration.js";
import { flattenedOutline, outlineNumber } from "./scheduler.js";

export function toCsv(project: Project): string {
  const rows = [["Number", "Title", "Type", "Duration", "Effort", "Start", "End", "Complete", "Cost", "Assigned", "Prerequisites", "Note"]];
  for (const t of flattenedOutline({ ...project, tasks: project.tasks.map((x) => ({ ...x, collapsed: false })) })) {
    const assigned = project.assignments
      .filter((a) => a.taskId === t.uniqueID)
      .map((a) => project.resources.find((r) => r.uniqueID === a.resourceId)?.name)
      .filter(Boolean)
      .join("; ");
    const prereq = project.dependencies
      .filter((d) => d.dependentTaskId === t.uniqueID)
      .map((d) => `${outlineNumber(project, d.prerequisiteTaskId, "hierarchical")}${d.type === "FS" ? "" : d.type}`)
      .join("; ");
    rows.push([
      outlineNumber(project, t.uniqueID, "hierarchical"),
      t.title,
      t.type,
      formatDuration(t.duration, project, t.elapsedDuration),
      formatDuration(t.effort, project),
      t.startDate,
      t.endDate,
      String(Math.round(t.completion)),
      String(t.totalCost),
      assigned,
      prereq,
      t.note.replace(/\n/g, " "),
    ]);
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function toIcs(project: Project): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//OmniPlan Clone//Atlas//EN`, `X-WR-CALNAME:${project.title}`];
  for (const t of project.tasks) {
    if (t.type === "group") continue;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:omniplan-task-${t.uniqueID}@local`);
    lines.push(`DTSTAMP:${icsDate(new Date())}`);
    lines.push(`DTSTART:${icsDate(new Date(t.startDate))}`);
    lines.push(`DTEND:${icsDate(new Date(t.endDate))}`);
    lines.push(`SUMMARY:${escapeIcs(t.title)}`);
    if (t.note) lines.push(`DESCRIPTION:${escapeIcs(t.note)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export function toReportHtml(project: Project): string {
  const tasks = project.tasks
    .map(
      (t) =>
        `<tr><td>${t.title}</td><td>${t.type}</td><td>${Math.round(t.completion)}%</td><td>${new Date(t.startDate).toLocaleDateString()}</td><td>${new Date(t.endDate).toLocaleDateString()}</td><td>${t.totalCost.toFixed(2)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${project.title} Report</title>
  <style>body{font:13px -apple-system,sans-serif;margin:40px;color:#222}h1{font-weight:600}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{color:#666;font-size:11px;text-transform:uppercase}</style>
  </head><body><h1>${project.title}</h1><p>Generated ${new Date().toLocaleString()}</p>
  <table><thead><tr><th>Task</th><th>Type</th><th>Complete</th><th>Start</th><th>End</th><th>Cost</th></tr></thead><tbody>${tasks}</tbody></table></body></html>`;
}

export function fromCsv(csv: string, project: Project): { title: string; durationHint: string }[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.toLowerCase() || "";
  const titleIdx = header.split(",").findIndex((c) => c.includes("title") || c.includes("name"));
  return lines.map((line) => {
    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, ""));
    return { title: cols[Math.max(0, titleIdx)] || "Imported", durationHint: cols[2] || "1d" };
  });
}
