import { useMemo, useRef } from "react";
import type { MouseEvent } from "react";
import type { Dependency, Project, Task } from "./types";
import { depthOf, flatten, fmtDate, fmtDur, hier } from "./types";

const DAY = 86400000;

export function Overview({ project, px }: { project: Project; px: number }) {
  const start = new Date(project.startDate).getTime();
  const rows = flatten(project).filter((t) => t.type !== "group");
  const max = Math.max(...rows.map((t) => new Date(t.endDate).getTime()), start + 30 * DAY);
  const w = ((max - start) / DAY) * (px / 4);
  return (
    <div className="overview">
      {rows.map((t) => {
        const s = ((new Date(t.startDate).getTime() - start) / DAY) * (px / 4);
        const dur = Math.max(2, ((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / DAY) * (px / 4));
        return <div key={t.uniqueID} className="mini" style={{ left: 8 + s, width: dur, background: t.critical ? "var(--op-critical)" : undefined }} />;
      })}
      <div className="today" style={{ left: 8 + ((Date.now() - start) / DAY) * (px / 4) }} />
    </div>
  );
}

export function Outline({
  project,
  selected,
  numbering,
  wide,
  onSelect,
  onChangeTitle,
  onToggle,
}: {
  project: Project;
  selected: string[];
  numbering: "hierarchical" | "flat";
  wide?: boolean;
  onSelect: (id: string, e: MouseEvent) => void;
  onChangeTitle: (id: string, title: string) => void;
  onToggle: (id: string) => void;
}) {
  const rows = flatten(project);
  const hasKids = (id: string) => project.tasks.some((t) => t.parentId === id);
  return (
    <div className={`outline-pane ${wide ? "wide" : ""}`}>
      <div className="colhead">
        <span>Title</span>
        <span>Duration</span>
        <span>Effort</span>
        <span>Start</span>
        <span>End</span>
        <span>Assigned</span>
        <span>%</span>
      </div>
      <div className="rows">
        {rows.map((t, i) => {
          const assigned = project.assignments
            .filter((a) => a.taskId === t.uniqueID)
            .map((a) => project.resources.find((r) => r.uniqueID === a.resourceId)?.name)
            .filter(Boolean)
            .join(", ");
          const num = numbering === "flat" ? String(i + 1) : hier(project, t.uniqueID);
          return (
            <div key={t.uniqueID} className={`row ${selected.includes(t.uniqueID) ? "sel" : ""} ${t.type === "group" ? "group" : ""}`} onClick={(e) => onSelect(t.uniqueID, e)}>
              <span className="title" style={{ paddingLeft: 8 + depthOf(project, t.uniqueID) * 14 }}>
                {hasKids(t.uniqueID) ? (
                  <button className="twist" onClick={(e) => { e.stopPropagation(); onToggle(t.uniqueID); }}>
                    {t.collapsed ? "▶" : "▼"}
                  </button>
                ) : (
                  <span style={{ width: 12 }} />
                )}
                <span className="num">{num}</span>
                <input
                  value={t.title}
                  onChange={(e) => onChangeTitle(t.uniqueID, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {t.violation && <span title={t.violation}>⚠</span>}
              </span>
              <span>{t.type === "milestone" ? "—" : fmtDur(t.duration, project.hoursPerDay)}</span>
              <span>{t.type === "milestone" ? "—" : fmtDur(t.effort, project.hoursPerDay)}</span>
              <span>{fmtDate(t.startDate, project.dateMode === "tbd")}</span>
              <span>{fmtDate(t.endDate, project.dateMode === "tbd")}</span>
              <span>{assigned}</span>
              <span>{Math.round(t.completion)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Gantt({
  project,
  selected,
  px,
  showDeps,
  showCritical,
  showSlack,
  weekends,
  onSelect,
  onConnect,
}: {
  project: Project;
  selected: string[];
  px: number;
  showDeps: boolean;
  showCritical: boolean;
  showSlack: boolean;
  weekends: boolean;
  onSelect: (id: string, e: MouseEvent) => void;
  onConnect: (from: string, to: string) => void;
}) {
  const rows = flatten(project);
  const start = new Date(project.startDate);
  start.setHours(0, 0, 0, 0);
  const endMs = Math.max(
    ...project.tasks.map((t) => new Date(t.endDate).getTime()),
    start.getTime() + 45 * DAY,
  );
  const days = Math.ceil((endMs - start.getTime()) / DAY) + 7;
  const width = days * px;
  const drag = useRef<{ from: string } | null>(null);

  const months: { label: string; span: number }[] = [];
  const dayCells: { label: string; weekend: boolean; date: Date }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    dayCells.push({ label: String(d.getDate()), weekend: d.getDay() === 0 || d.getDay() === 6, date: d });
    const key = d.toLocaleString("en", { month: "short", year: "numeric" });
    const last = months[months.length - 1];
    if (!last || last.label !== key) months.push({ label: key, span: 1 });
    else last.span++;
  }

  const xOf = (iso: string) => ((new Date(iso).getTime() - start.getTime()) / DAY) * px;
  const todayX = ((Date.now() - start.getTime()) / DAY) * px;

  const paths = useMemo(() => {
    if (!showDeps) return [] as { d: string; critical: boolean }[];
    return project.dependencies.map((dep) => {
      const a = rows.findIndex((t) => t.uniqueID === dep.prerequisiteTaskId);
      const b = rows.findIndex((t) => t.uniqueID === dep.dependentTaskId);
      if (a < 0 || b < 0) return null;
      const ta = rows[a];
      const tb = rows[b];
      const y1 = a * 24 + 12;
      const y2 = b * 24 + 12;
      const x1 = dep.type === "SS" || dep.type === "SF" ? xOf(ta.startDate) : xOf(ta.endDate);
      const x2 = dep.type === "FF" || dep.type === "SF" ? xOf(tb.endDate) : xOf(tb.startDate);
      const mid = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      return { d, critical: showCritical && ta.critical && tb.critical };
    }).filter(Boolean) as { d: string; critical: boolean }[];
  }, [project.dependencies, rows, showDeps, showCritical, px]);

  return (
    <div className="chart-pane">
      <div className="gantt-scroll">
        <div style={{ width, minHeight: "100%" }}>
          <div className="gantt-header" style={{ width }}>
            <div className="months">
              {months.map((m) => (
                <div key={m.label + m.span} className="cell" style={{ width: m.span * px }}>
                  {m.label}
                </div>
              ))}
            </div>
            <div className="days">
              {dayCells.map((d, i) => (
                <div key={i} className="cell" style={{ width: px, background: d.weekend && weekends ? "var(--op-weekend)" : undefined }}>
                  {px >= 22 ? d.label : d.date.getDate() === 1 || d.date.getDay() === 1 ? d.label : ""}
                </div>
              ))}
            </div>
          </div>
          <div className="gantt-body" style={{ width, height: rows.length * 24, position: "relative" }}>
            {weekends &&
              dayCells.map((d, i) =>
                d.weekend ? <div key={i} className="wknd" style={{ left: i * px, width: px }} /> : null,
              )}
            <div className="today-line" style={{ left: todayX }} />
            <svg className="dep-svg" width={width} height={rows.length * 24}>
              {paths.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke={p.critical ? "var(--op-critical)" : "#8a8a8a"} strokeWidth="1.2" markerEnd="url(#arr)" />
              ))}
              <defs>
                <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <polygon points="0 0, 7 3.5, 0 7" fill="#8a8a8a" />
                </marker>
              </defs>
            </svg>
            {rows.map((t, i) => {
              const left = xOf(t.startDate);
              const w = Math.max(4, xOf(t.endDate) - left);
              const crit = showCritical && t.critical;
              return (
                <div key={t.uniqueID} className={`gantt-row ${selected.includes(t.uniqueID) ? "sel" : ""}`} onClick={(e) => onSelect(t.uniqueID, e)}>
                  {t.type === "milestone" ? (
                    <div
                      className={`diamond ${crit ? "critical" : ""}`}
                      style={{ left: left - 5 }}
                      onMouseDown={() => (drag.current = { from: t.uniqueID })}
                      onMouseUp={() => {
                        if (drag.current && drag.current.from !== t.uniqueID) onConnect(drag.current.from, t.uniqueID);
                        drag.current = null;
                      }}
                    />
                  ) : (
                    <div
                      className={`bar ${t.type === "group" ? "group" : ""} ${crit ? "critical" : ""}`}
                      style={{ left, width: w, background: t.type === "group" ? undefined : t.color || undefined }}
                      onMouseDown={() => (drag.current = { from: t.uniqueID })}
                      onMouseUp={() => {
                        if (drag.current && drag.current.from !== t.uniqueID) onConnect(drag.current.from, t.uniqueID);
                        drag.current = null;
                      }}
                    >
                      {t.type !== "group" && <div className="prog" style={{ width: `${t.completion}%` }} />}
                    </div>
                  )}
                  {showSlack && t.freeSlack > 0 && t.type === "task" && (
                    <div className="slack" style={{ left: left + w, width: (t.freeSlack / (project.hoursPerDay * 3600)) * px }} />
                  )}
                  <div className="bar-label" style={{ left: left + w + 8 }}>
                    {t.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Network({ project, selected, showCritical, onSelect }: { project: Project; selected: string[]; showCritical: boolean; onSelect: (id: string) => void }) {
  const rows = flatten(project).filter((t) => t.type !== "group");
  const cols = new Map<string, number>();
  for (const t of rows) {
    const preds = project.dependencies.filter((d) => d.dependentTaskId === t.uniqueID);
    const col = preds.length ? Math.max(0, ...preds.map((d) => (cols.get(d.prerequisiteTaskId) || 0) + 1)) : 0;
    cols.set(t.uniqueID, col);
  }
  const buckets = new Map<number, Task[]>();
  for (const t of rows) {
    const c = cols.get(t.uniqueID) || 0;
    buckets.set(c, [...(buckets.get(c) || []), t]);
  }
  const pos: Record<string, { x: number; y: number }> = {};
  for (const [c, list] of buckets) {
    list.forEach((t, i) => {
      pos[t.uniqueID] = { x: 40 + c * 200, y: 30 + i * 88 };
    });
  }
  const w = 80 + (Math.max(0, ...cols.values()) + 1) * 200;
  const h = 80 + Math.max(3, ...[...buckets.values()].map((l) => l.length)) * 88;
  return (
    <div className="network">
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        {project.dependencies.map((d: Dependency) => {
          const a = pos[d.prerequisiteTaskId];
          const b = pos[d.dependentTaskId];
          if (!a || !b) return null;
          return <path key={d.id} d={`M ${a.x + 160} ${a.y + 24} C ${a.x + 190} ${a.y + 24}, ${b.x - 20} ${b.y + 24}, ${b.x} ${b.y + 24}`} fill="none" stroke="#888" />;
        })}
      </svg>
      {rows.map((t) => (
        <div
          key={t.uniqueID}
          className={`net-node ${t.type === "milestone" ? "ms" : ""} ${selected.includes(t.uniqueID) ? "sel" : ""} ${showCritical && t.critical ? "critical" : ""}`}
          style={{ left: pos[t.uniqueID]?.x, top: pos[t.uniqueID]?.y }}
          onClick={() => onSelect(t.uniqueID)}
        >
          <strong>{t.title}</strong>
          <div className="meta">{t.type === "milestone" ? "Milestone" : fmtDur(t.duration)} · {Math.round(t.completion)}%</div>
        </div>
      ))}
    </div>
  );
}

export function ResourceView({
  project,
  selected,
  px,
  onSelectResource,
}: {
  project: Project;
  selected: string[];
  px: number;
  onSelectResource: (id: string) => void;
}) {
  const start = new Date(project.startDate);
  start.setHours(0, 0, 0, 0);
  const days = 60;
  return (
    <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
      <div className="outline-pane" style={{ width: 280 }}>
        <div className="colhead" style={{ gridTemplateColumns: "1fr 70px 70px" }}>
          <span>Resource</span>
          <span>Type</span>
          <span>Units</span>
        </div>
        <div className="rows">
          {project.resources.map((r) => (
            <div key={r.uniqueID} className={`row ${selected.includes(r.uniqueID) ? "sel" : ""}`} style={{ gridTemplateColumns: "1fr 70px 70px" }} onClick={() => onSelectResource(r.uniqueID)}>
              <span>{r.name}</span>
              <span style={{ textTransform: "capitalize" }}>{r.type}</span>
              <span>{r.type === "material" ? r.units : `${Math.round(r.units * 100)}%`}</span>
            </div>
          ))}
          <div className="row" style={{ gridTemplateColumns: "1fr", color: "#888" }}>
            <span>Unassigned</span>
          </div>
        </div>
      </div>
      <div className="chart-pane">
        <div className="gantt-scroll">
          <div style={{ width: days * px }}>
            {[...project.resources, { uniqueID: "unassigned", name: "Unassigned" }].map((r) => (
              <div key={r.uniqueID} className="gantt-row" style={{ position: "relative" }}>
                {project.assignments
                  .filter((a) => a.resourceId === r.uniqueID)
                  .map((a) => {
                    const t = project.tasks.find((x) => x.uniqueID === a.taskId);
                    if (!t) return null;
                    const left = ((new Date(t.startDate).getTime() - start.getTime()) / DAY) * px;
                    const w = Math.max(4, ((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / DAY) * px);
                    return <div key={a.id} className="bar" style={{ left, width: w }} title={t.title} />;
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
