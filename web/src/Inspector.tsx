import type { ReactNode } from "react";
import { I } from "./icons";
import type { InspectorTab, Project, Resource, Task } from "./types";
import { fmtDur, money } from "./types";

export function Inspector({
  tab,
  setTab,
  project,
  task,
  resource,
  onProject,
  onTask,
  onResource,
  onAssign,
  onUnassign,
  onRemoveDep,
}: {
  tab: InspectorTab;
  setTab: (t: InspectorTab) => void;
  project: Project;
  task: Task | null;
  resource: Resource | null;
  onProject: (patch: Partial<Project>) => void;
  onTask: (patch: Partial<Task>) => void;
  onResource: (patch: Partial<Resource>) => void;
  onAssign: (resourceId: string) => void;
  onUnassign: (aid: string) => void;
  onRemoveDep: (id: string) => void;
}) {
  const tabs: { id: InspectorTab; label: string; icon: ReactNode }[] = [
    { id: "project", label: "Project", icon: I.info },
    { id: "milestones", label: "Milestones", icon: I.flag },
    { id: "task", label: "Task", icon: I.task },
    { id: "resource", label: "Resource", icon: I.people },
    { id: "styles", label: "Styles", icon: I.styles },
    { id: "custom", label: "Custom", icon: I.tag },
  ];
  return (
    <aside className="inspector">
      <div className="insp-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="insp-body">
        {tab === "project" && <ProjectInspector project={project} onProject={onProject} />}
        {tab === "milestones" && <MilestonesInspector project={project} onProject={onProject} />}
        {tab === "task" && (task ? <TaskInspector project={project} task={task} onTask={onTask} onAssign={onAssign} onUnassign={onUnassign} onRemoveDep={onRemoveDep} /> : <p className="muted">Select a task to inspect.</p>)}
        {tab === "resource" && (resource ? <ResourceInspector resource={resource} project={project} onResource={onResource} /> : <p className="muted">Select a resource in Resource View.</p>)}
        {tab === "styles" && <StylesInspector project={project} onProject={onProject} />}
        {tab === "custom" && <CustomInspector project={project} task={task} resource={resource} onProject={onProject} onTask={onTask} />}
      </div>
    </aside>
  );
}

function ProjectInspector({ project, onProject }: { project: Project; onProject: (p: Partial<Project>) => void }) {
  const tops = project.tasks.filter((t) => !t.parentId);
  const duration = tops.reduce((m, t) => Math.max(m, new Date(t.endDate).getTime()), 0);
  const start = new Date(project.startDate).getTime();
  const completion = tops.reduce((s, t) => s + t.completion, 0) / Math.max(1, tops.length);
  const cost = project.tasks.filter((t) => !project.tasks.some((x) => x.parentId === t.uniqueID)).reduce((s, t) => s + t.totalCost, 0);
  return (
    <>
      <div className="card">
        <h3>Title</h3>
        <div className="field">
          <input value={project.title} onChange={(e) => onProject({ title: e.target.value })} />
        </div>
      </div>
      <div className="card">
        <h3>Timeline</h3>
        <div className="field">
          <label>Direction</label>
          <select value={project.direction} onChange={(e) => onProject({ direction: e.target.value as Project["direction"] })}>
            <option value="forward">Forward from start (ASAP)</option>
            <option value="backward">Backward from end (ALAP)</option>
          </select>
        </div>
        <div className="field">
          <label>Dates</label>
          <select value={project.dateMode} onChange={(e) => onProject({ dateMode: e.target.value as Project["dateMode"] })}>
            <option value="specific">Specific dates</option>
            <option value="tbd">To be determined (T-day)</option>
          </select>
        </div>
        <div className="field">
          <label>Granularity</label>
          <select value={project.granularity} onChange={(e) => onProject({ granularity: e.target.value as Project["granularity"] })}>
            <option value="minute">Minute</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div className="field">
          <label>Start Date</label>
          <input type="date" value={project.startDate.slice(0, 10)} onChange={(e) => onProject({ startDate: new Date(e.target.value).toISOString() })} />
        </div>
      </div>
      <div className="card">
        <h3>Summary</h3>
        <div className="list-row"><span>Duration</span><span>{fmtDur((duration - start) / 1000, project.hoursPerDay)}</span></div>
        <div className="list-row"><span>Completion</span><span>{Math.round(completion)}%</span></div>
        <div className="list-row"><span>Cost</span><span>{money(cost, project.currency)}</span></div>
        <p className="muted">Summary values cannot be edited directly.</p>
      </div>
      <div className="card">
        <h3>Formats</h3>
        <div className="field">
          <label>Currency</label>
          <input value={project.currency} onChange={(e) => onProject({ currency: e.target.value })} />
        </div>
      </div>
      <div className="card">
        <h3>Effort Unit Conversions</h3>
        <div className="row2">
          <div className="field"><label>Hours/day</label><input type="number" value={project.hoursPerDay} onChange={(e) => onProject({ hoursPerDay: Number(e.target.value) })} /></div>
          <div className="field"><label>Hours/week</label><input type="number" value={project.hoursPerWeek} onChange={(e) => onProject({ hoursPerWeek: Number(e.target.value) })} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Hours/month</label><input type="number" value={project.hoursPerMonth} onChange={(e) => onProject({ hoursPerMonth: Number(e.target.value) })} /></div>
          <div className="field"><label>Hours/year</label><input type="number" value={project.hoursPerYear} onChange={(e) => onProject({ hoursPerYear: Number(e.target.value) })} /></div>
        </div>
      </div>
      <div className="card">
        <h3>Document</h3>
        <div className="field">
          <label>File Type</label>
          <select value={project.fileType} onChange={(e) => onProject({ fileType: e.target.value })}>
            <option value="flat">Flat file (recommended)</option>
            <option value="package">Package</option>
          </select>
        </div>
      </div>
    </>
  );
}

function MilestonesInspector({ project, onProject }: { project: Project; onProject: (p: Partial<Project>) => void }) {
  const miles = project.tasks.filter((t) => t.type === "milestone");
  return (
    <>
      <div className="card">
        <h3>Critical Paths</h3>
        <div className="field">
          <label>Slack limit (hours)</label>
          <input type="number" value={project.slackLimitHours} onChange={(e) => onProject({ slackLimitHours: Number(e.target.value) })} />
        </div>
        <p className="muted">Highlight tasks that influence project or milestone completion.</p>
      </div>
      <div className="card">
        <h3>Milestones</h3>
        {miles.map((m) => (
          <label key={m.uniqueID} className="check">
            <input
              type="checkbox"
              checked={project.criticalPathToMilestoneIds.includes(m.uniqueID)}
              onChange={(e) => {
                const ids = e.target.checked
                  ? [...project.criticalPathToMilestoneIds, m.uniqueID]
                  : project.criticalPathToMilestoneIds.filter((id) => id !== m.uniqueID);
                onProject({ criticalPathToMilestoneIds: ids });
              }}
            />
            {m.title}
          </label>
        ))}
      </div>
    </>
  );
}

function TaskInspector({
  project,
  task,
  onTask,
  onAssign,
  onUnassign,
  onRemoveDep,
}: {
  project: Project;
  task: Task;
  onTask: (p: Partial<Task>) => void;
  onAssign: (id: string) => void;
  onUnassign: (id: string) => void;
  onRemoveDep: (id: string) => void;
}) {
  const assigns = project.assignments.filter((a) => a.taskId === task.uniqueID);
  const prereq = project.dependencies.filter((d) => d.dependentTaskId === task.uniqueID);
  const deps = project.dependencies.filter((d) => d.prerequisiteTaskId === task.uniqueID);
  return (
    <>
      <div className="card">
        <h3>Task Info</h3>
        <div className="field"><label>Name</label><input value={task.title} onChange={(e) => onTask({ title: e.target.value })} /></div>
        <div className="field">
          <label>Type</label>
          <select value={task.type} onChange={(e) => onTask({ type: e.target.value as Task["type"] })}>
            <option value="task">Task</option>
            <option value="milestone">Milestone</option>
            <option value="group">Group</option>
            <option value="hammock">Hammock</option>
          </select>
        </div>
        <div className="row2">
          <div className="field"><label>Effort</label><div>{fmtDur(task.effort, project.hoursPerDay)}</div></div>
          <div className="field"><label>Duration</label><div>{fmtDur(task.duration, project.hoursPerDay)}</div></div>
        </div>
        <div className="row2">
          <div className="field"><label>Completed</label><input type="number" value={Math.round(task.completion)} onChange={(e) => onTask({ completion: Number(e.target.value), effortDone: (task.effort * Number(e.target.value)) / 100 })} /></div>
          <div className="field"><label>Task Cost</label><input type="number" value={task.staticCost} onChange={(e) => onTask({ staticCost: Number(e.target.value) })} /></div>
        </div>
        <div className="list-row"><span>Resource cost</span><span>{money(task.assignmentsCost, project.currency)}</span></div>
        <div className="list-row"><span>Total cost</span><span>{money(task.totalCost, project.currency)}</span></div>
      </div>
      <div className="card">
        <h3>Schedule</h3>
        <div className="field">
          <label>Scheduling</label>
          <select value={task.schedulingMode} onChange={(e) => onTask({ schedulingMode: e.target.value as Task["schedulingMode"] })}>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div className="row2">
          <div className="field"><label>Start</label><input type="datetime-local" disabled={task.schedulingMode !== "manual"} value={toLocal(task.manualStartDate || task.startDate)} onChange={(e) => onTask({ manualStartDate: new Date(e.target.value).toISOString() })} /></div>
          <div className="field"><label>End</label><input type="datetime-local" disabled={task.schedulingMode !== "manual"} value={toLocal(task.manualEndDate || task.endDate)} onChange={(e) => onTask({ manualEndDate: new Date(e.target.value).toISOString() })} /></div>
        </div>
        <div className="field">
          <label>ASAP / ALAP</label>
          <select value={task.asapAlap} onChange={(e) => onTask({ asapAlap: e.target.value as Task["asapAlap"] })}>
            <option value="asap">As Soon As Possible</option>
            <option value="alap">As Late As Possible</option>
          </select>
        </div>
        <label className="check"><input type="checkbox" checked={task.allowSplitting} onChange={(e) => onTask({ allowSplitting: e.target.checked })} /> Allow splitting</label>
        <div className="field"><label>Priority</label><input type="number" value={task.priority} onChange={(e) => onTask({ priority: Number(e.target.value) })} /></div>
        <div className="field">
          <label>Start No Earlier Than</label>
          <input type="date" value={task.startNoEarlierThanDate?.slice(0, 10) || ""} onChange={(e) => onTask({ startNoEarlierThanDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
        <div className="field">
          <label>End No Later Than</label>
          <input type="date" value={task.endNoLaterThanDate?.slice(0, 10) || ""} onChange={(e) => onTask({ endNoLaterThanDate: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>
      </div>
      <div className="card">
        <h3>Dependencies</h3>
        <div className="muted">Prerequisites</div>
        {prereq.map((d) => (
          <div key={d.id} className="list-row">
            <span>{project.tasks.find((t) => t.uniqueID === d.prerequisiteTaskId)?.title} · {d.type}</span>
            <button className="ghost" onClick={() => onRemoveDep(d.id)}>✕</button>
          </div>
        ))}
        <div className="muted" style={{ marginTop: 8 }}>Dependents</div>
        {deps.map((d) => (
          <div key={d.id} className="list-row">
            <span>{project.tasks.find((t) => t.uniqueID === d.dependentTaskId)?.title} · {d.type}</span>
            <button className="ghost" onClick={() => onRemoveDep(d.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Assigned Resources</h3>
        {assigns.map((a) => {
          const r = project.resources.find((x) => x.uniqueID === a.resourceId);
          return (
            <div key={a.id} className="list-row">
              <span>{r?.name} · {Math.round(a.units * 100)}%</span>
              <button className="ghost" onClick={() => onUnassign(a.id)}>−</button>
            </div>
          );
        })}
        <select defaultValue="" onChange={(e) => { if (e.target.value) onAssign(e.target.value); e.target.value = ""; }}>
          <option value="">Add resource…</option>
          {project.resources.map((r) => (
            <option key={r.uniqueID} value={r.uniqueID}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="card">
        <h3>Resource Allocation</h3>
        <div className="field">
          <select value={task.resourceAssignmentType} onChange={(e) => onTask({ resourceAssignmentType: e.target.value })}>
            <option value="adjustDuration">Adjust task duration</option>
            <option value="adjustEffort">Adjust task effort</option>
            <option value="adjustAssignedAmounts">Adjust assigned amounts</option>
          </select>
        </div>
        <div className="field">
          <label>Task progress requires</label>
          <select value={task.taskProgressRequires} onChange={(e) => onTask({ taskProgressRequires: e.target.value })}>
            <option value="any">Any of the assigned resources</option>
            <option value="all">All of the assigned resources</option>
          </select>
        </div>
      </div>
      <div className="card">
        <h3>Estimated Effort (Pro)</h3>
        <div className="field"><label>Minimum</label><input type="number" value={task.minEffortEstimate ?? ""} onChange={(e) => onTask({ minEffortEstimate: Number(e.target.value) })} /></div>
        <div className="field"><label>Expected</label><input type="number" value={task.expectedEffortEstimate ?? ""} onChange={(e) => onTask({ expectedEffortEstimate: Number(e.target.value) })} /></div>
        <div className="field"><label>Maximum</label><input type="number" value={task.maxEffortEstimate ?? ""} onChange={(e) => onTask({ maxEffortEstimate: Number(e.target.value) })} /></div>
      </div>
      <div className="card">
        <h3>Scheduling Influences</h3>
        {prereq.map((d) => (
          <div key={d.id} className="list-row"><span>Dependency {d.type} ← {project.tasks.find((t) => t.uniqueID === d.prerequisiteTaskId)?.title}</span></div>
        ))}
        {task.startNoEarlierThanDate && <div className="list-row"><span>Start no earlier than constraint</span></div>}
        {task.schedulingMode === "manual" && <div className="list-row"><span>Manually scheduled</span></div>}
        {!prereq.length && task.schedulingMode === "automatic" && !task.startNoEarlierThanDate && <p className="muted">Project start date</p>}
      </div>
    </>
  );
}

function ResourceInspector({ resource, project, onResource }: { resource: Resource; project: Project; onResource: (p: Partial<Resource>) => void }) {
  const work = project.assignments.filter((a) => a.resourceId === resource.uniqueID);
  return (
    <>
      <div className="card">
        <h3>Resource Info</h3>
        <div className="field"><label>Name</label><input value={resource.name} onChange={(e) => onResource({ name: e.target.value })} /></div>
        <div className="field">
          <label>Type</label>
          <select value={resource.type} onChange={(e) => onResource({ type: e.target.value as Resource["type"] })}>
            <option value="staff">Staff</option>
            <option value="equipment">Equipment</option>
            <option value="material">Material</option>
            <option value="group">Group</option>
          </select>
        </div>
        <div className="field"><label>Email</label><input value={resource.email} onChange={(e) => onResource({ email: e.target.value })} /></div>
        <div className="row2">
          <div className="field"><label>Units</label><input type="number" step="0.1" value={resource.units} onChange={(e) => onResource({ units: Number(e.target.value) })} /></div>
          <div className="field"><label>Efficiency</label><input type="number" step="0.1" value={resource.efficiency} onChange={(e) => onResource({ efficiency: Number(e.target.value) })} /></div>
        </div>
        <div className="row2">
          <div className="field"><label>Cost / hour</label><input type="number" value={resource.costPerHour} onChange={(e) => onResource({ costPerHour: Number(e.target.value) })} /></div>
          <div className="field"><label>Cost / use</label><input type="number" value={resource.costPerUse} onChange={(e) => onResource({ costPerUse: Number(e.target.value) })} /></div>
        </div>
      </div>
      <div className="card">
        <h3>Assignments</h3>
        {work.map((a) => (
          <div key={a.id} className="list-row"><span>{project.tasks.find((t) => t.uniqueID === a.taskId)?.title}</span></div>
        ))}
        {!work.length && <p className="muted">No assignments</p>}
      </div>
    </>
  );
}

function StylesInspector({ project, onProject }: { project: Project; onProject: (p: Partial<Project>) => void }) {
  return (
    <div className="card">
      <h3>Styles</h3>
      <div className="field"><label>Gantt bar color</label><input type="color" value={project.styles.ganttBarColor} onChange={(e) => onProject({ styles: { ...project.styles, ganttBarColor: e.target.value } })} /></div>
      <div className="field"><label>Critical path color</label><input type="color" value={project.styles.criticalPathColor} onChange={(e) => onProject({ styles: { ...project.styles, criticalPathColor: e.target.value } })} /></div>
      <div className="field"><label>Outline size</label><input type="number" value={project.styles.outlineSize} onChange={(e) => onProject({ styles: { ...project.styles, outlineSize: Number(e.target.value) } })} /></div>
    </div>
  );
}

function CustomInspector({
  project,
  task,
  resource,
  onProject,
  onTask,
}: {
  project: Project;
  task: Task | null;
  resource: Resource | null;
  onProject: (p: Partial<Project>) => void;
  onTask: (p: Partial<Task>) => void;
}) {
  const data = task?.customData || project.customData;
  return (
    <>
      <div className="card">
        <h3>Notes</h3>
        <textarea value={task ? task.note : project.notes} onChange={(e) => (task ? onTask({ note: e.target.value }) : onProject({ notes: e.target.value }))} />
      </div>
      <div className="card">
        <h3>Custom Data</h3>
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="list-row"><span>{k}</span><span>{v || "—"}</span></div>
        ))}
        {task && (
          <div className="field">
            <label>OmniFocusID</label>
            <input
              value={task.customData.OmniFocusID || ""}
              onChange={(e) => onTask({ customData: { ...task.customData, OmniFocusID: e.target.value } })}
              placeholder="Linked OmniFocus task id"
            />
          </div>
        )}
        <p className="muted">Key/value data, notes, and linked files live here — including OmniFocusID used by the OmniFocus bridge.</p>
      </div>
    </>
  );
}

function toLocal(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}
