import { useState } from "react";
import type { Preferences, Project } from "./types";
import { money } from "./types";

export function PreferencesSheet({ prefs, onSave, onClose }: { prefs: Preferences; onSave: (p: Partial<Preferences>) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"general" | "display" | "templates" | "reports" | "update" | "integration">("general");
  const [local, setLocal] = useState(prefs);
  const set = (p: Partial<Preferences>) => setLocal({ ...local, ...p });
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet prefs" onClick={(e) => e.stopPropagation()}>
        <h2>OmniPlan Preferences</h2>
        <div className="prefs-tabs">
          {(["general", "display", "templates", "reports", "update", "integration"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
              {t === "integration" ? "OmniFocus" : t}
            </button>
          ))}
        </div>
        {tab === "general" && (
          <>
            <div className="field">
              <label>When pressing Tab</label>
              <select value={local.tabIndents ? "indent" : "cell"} onChange={(e) => set({ tabIndents: e.target.value === "indent" })}>
                <option value="indent">Indent the currently selected item</option>
                <option value="cell">Move to the next cell</option>
              </select>
            </div>
            <label className="check">
              <input type="checkbox" checked={local.newRowsIndentedInGroups} onChange={(e) => set({ newRowsIndentedInGroups: e.target.checked })} />
              When a group is selected, create new rows indented
            </label>
            <label className="check">
              <input type="checkbox" checked={local.returnCreatesRow} onChange={(e) => set({ returnCreatesRow: e.target.checked })} />
              When pressing Return in a cell, create a new row
            </label>
          </>
        )}
        {tab === "display" && (
          <>
            <div className="field">
              <label>First day of week</label>
              <select value={local.firstDayOfWeek} onChange={(e) => set({ firstDayOfWeek: Number(e.target.value) })}>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </div>
            <label className="check">
              <input type="checkbox" checked={local.fiscalYearEnabled} onChange={(e) => set({ fiscalYearEnabled: e.target.checked })} />
              Use fiscal years
            </label>
            <div className="field">
              <label>Fiscal year start month</label>
              <input type="number" min={1} max={12} value={local.fiscalYearStartMonth} onChange={(e) => set({ fiscalYearStartMonth: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label>Appearance</label>
              <select value={local.appearance} onChange={(e) => set({ appearance: e.target.value as Preferences["appearance"] })}>
                <option value="auto">Automatic</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <p className="muted">Date header tokens (Hour, Day of Month, Month, Quarter, Week of Year, Year) are assembled per Gantt scale, matching OmniPlan Display preferences.</p>
          </>
        )}
        {tab === "templates" && (
          <>
            <p>Built-in templates: Standard Project, Standard Project (Styled), Simple Project.</p>
            <div className="field">
              <label>Default template</label>
              <select value={local.defaultTemplateId} onChange={(e) => set({ defaultTemplateId: e.target.value })}>
                <option value="standard">Standard Project</option>
                <option value="standard-styled">Standard Project (Styled)</option>
                <option value="simple">Simple Project</option>
              </select>
            </div>
            <p className="muted">File → Save as Template stores the current document as a custom template. Built-in templates cannot be deleted; use Edit a Copy.</p>
          </>
        )}
        {tab === "reports" && (
          <p>Pro reporting templates (Project Summary, Milestone Report) use HTML tokens such as {"{{title}}"}, {"{{duration}}"}, and {"{{cost}}"}. Duplicate a template to customize CSS.</p>
        )}
        {tab === "update" && (
          <>
            <label className="check">
              <input type="checkbox" checked={local.checkForUpdates} onChange={(e) => set({ checkForUpdates: e.target.checked })} />
              Check for updates
            </label>
            <label className="check">
              <input type="checkbox" checked={local.sendAnonymousInfo} onChange={(e) => set({ sendAnonymousInfo: e.target.checked })} />
              Send anonymous system information
            </label>
          </>
        )}
        {tab === "integration" && (
          <>
            <p>Cross-app integration uses the same Omni Automation contract as OmniPlan and OmniFocus: <code>URL.tellFunction(app, fn, argument).call()</code>, plus <code>omniplan:///task/id</code> and <code>omnifocus:///task/id</code> links in notes.</p>
            <div className="field">
              <label>OmniFocus clone URL</label>
              <input value={local.omnifocusUrl} onChange={(e) => set({ omnifocusUrl: e.target.value })} placeholder="http://127.0.0.1:4456" />
            </div>
            <div className="field">
              <label>This OmniPlan URL (for the OmniFocus clone)</label>
              <input value={local.omniplanUrl} onChange={(e) => set({ omniplanUrl: e.target.value })} />
            </div>
          </>
        )}
        <div className="mini-btns" style={{ justifyContent: "flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="ghost" onClick={() => { onSave(local); onClose(); }}>OK</button>
        </div>
      </div>
    </div>
  );
}

export function NewProjectAssistant({ onCreate, onClose }: { onCreate: (title: string, templateId: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("Untitled");
  const [templateId, setTemplateId] = useState("standard");
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>New Project Assistant</h2>
        <p className="muted">Configure a new project the way OmniPlan’s assistant does — template, then title. Schedules can be built forward from a start date or backward from an end date in the Project inspector.</p>
        <div className="field"><label>Project title</label><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></div>
        <div className="field">
          <label>Template</label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="standard">Standard Project</option>
            <option value="standard-styled">Standard Project (Styled)</option>
            <option value="simple">Simple Project</option>
            <option value="empty">Empty</option>
          </select>
        </div>
        <div className="mini-btns" style={{ justifyContent: "flex-end" }}>
          <button className="ghost" onClick={onClose}>Cancel</button>
          <button className="ghost" onClick={() => onCreate(title, templateId)}>Create</button>
        </div>
      </div>
    </div>
  );
}

export function ViolationsSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const v = project.violations || [];
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Violations</h2>
        {!v.length && <p>No scheduling violations. OmniPlan suggests fixes when a schedule is logically impossible or a resource is overallocated.</p>}
        {v.map((x) => (
          <div key={x.id} className="card">
            <strong>{x.kind}</strong>
            <p>{x.message}</p>
            <p className="muted">{x.suggestion}</p>
          </div>
        ))}
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function AboutSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
        <div className="about">
          <div className="logo">⌥</div>
          <h2>OmniPlan</h2>
          <p>Version 4.10.3 clone</p>
          <p className="muted">Project management with Gantt charts, resource leveling, Monte Carlo simulation, and Omni Automation. Cross-app integration matches OmniPlan ↔ OmniFocus <code>tellFunction</code> / URL schemes.</p>
        </div>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function DashboardSheet({ projects, onClose }: { projects: { id: string; title: string; taskCount?: number; completion?: number }[]; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Multi-Project Dashboard</h2>
        <div className="dash-grid">
          {projects.map((p) => (
            <div key={p.id} className="dash-card">
              <h4>{p.title}</h4>
              <p className="muted">{p.taskCount ?? 0} tasks</p>
              <div className="meter"><i style={{ width: `${p.completion || 0}%` }} /></div>
            </div>
          ))}
        </div>
        <button className="ghost" onClick={onClose} style={{ marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}

export function SimulateSheet({ data, onClose }: { data: { iterations: number; milestones: { title: string; p50: string; p80: string; p95: string }[] } | null; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Monte Carlo Simulations</h2>
        {!data && <p>Running…</p>}
        {data && (
          <>
            <p className="muted">{data.iterations} iterations · PERT three-point effort</p>
            {data.milestones.map((m) => (
              <div key={m.title} className="card">
                <h3>{m.title}</h3>
                <div className="list-row"><span>50%</span><span>{new Date(m.p50).toLocaleDateString()}</span></div>
                <div className="list-row"><span>80%</span><span>{new Date(m.p80).toLocaleDateString()}</span></div>
                <div className="list-row"><span>95%</span><span>{new Date(m.p95).toLocaleDateString()}</span></div>
              </div>
            ))}
          </>
        )}
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function EvaSheet({ data, onClose }: { data: Record<string, number> | null; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Earned Value Analysis</h2>
        {data &&
          [
            ["BAC", data.bac],
            ["PV (BCWS)", data.pv],
            ["EV (BCWP)", data.ev],
            ["AC (ACWP)", data.ac],
            ["CPI", data.cpi],
            ["SPI", data.spi],
            ["CV", data.cv],
            ["SV", data.sv],
            ["EAC", data.eac],
            ["ETC", data.etc],
            ["VAC", data.vac],
          ].map(([k, v]) => (
            <div key={String(k)} className="list-row">
              <span>{k}</span>
              <span>{typeof v === "number" && (String(k).includes("I") ? v.toFixed(2) : money(v))}</span>
            </div>
          ))}
        <button className="ghost" onClick={onClose} style={{ marginTop: 12 }}>Close</button>
      </div>
    </div>
  );
}

export function ServerAccounts({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Server Accounts</h2>
        <p>Connect an Omni Account, WebDAV, or calendar server for collaboration, publishing, and resource load sharing (Pro). Projects can also sync via the local data store and the REST API.</p>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
