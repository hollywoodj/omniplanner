import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { api } from "./api";
import { AboutSheet, DashboardSheet, EvaSheet, NewProjectAssistant, PreferencesSheet, ServerAccounts, SimulateSheet, ViolationsSheet } from "./Dialogs";
import { I } from "./icons";
import { Inspector } from "./Inspector";
import type { InspectorTab, Preferences, Project, ViewMode } from "./types";
import { flatten, fmtDur, money } from "./types";
import { Gantt, Network, Outline, Overview, ResourceView } from "./Views";

type MenuId = string | null;

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string; taskCount?: number; completion?: number }[]>([]);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [view, setView] = useState<ViewMode>("gantt");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedRes, setSelectedRes] = useState<string[]>([]);
  const [tab, setTab] = useState<InspectorTab>("task");
  const [showInspector, setShowInspector] = useState(true);
  const [showOverview, setShowOverview] = useState(true);
  const [showOutline, setShowOutline] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState("");
  const [menu, setMenu] = useState<MenuId>(null);
  const [px, setPx] = useState(28);
  const [numbering, setNumbering] = useState<"hierarchical" | "flat">("hierarchical");
  const [showDeps, setShowDeps] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  const [showSlack, setShowSlack] = useState(false);
  const [weekends, setWeekends] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<string | null>(null);
  const [sim, setSim] = useState<{ iterations: number; milestones: { title: string; p50: string; p80: string; p95: string }[] } | null>(null);
  const [eva, setEva] = useState<Record<string, number> | null>(null);

  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 4200);
  };

  const load = async () => {
    const state = await api.state();
    setPrefs(state.preferences);
    setProjects(state.projects.map((p: Project) => ({ id: p.id, title: p.title, taskCount: p.tasks?.length, completion: 0 })));
    const first = state.projects[0];
    if (first) setProject(await api.project(first.id));
  };

  useEffect(() => {
    load().catch((e) => notify(String(e)));
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const ids = q.get("ids");
    if (ids) setSelected(ids.split(",").filter(Boolean));
  }, [project?.id]);

  const save = async (p: Project) => setProject(await api.saveProject(p));

  const patchTask = async (id: string, body: Record<string, unknown>) => {
    if (!project) return;
    setProject(await api.patchTask(project.id, id, body));
  };

  const onSelect = (id: string, e?: MouseEvent) => {
    if (e?.shiftKey) setSelected((s) => (s.includes(id) ? s : [...s, id]));
    else setSelected([id]);
    setTab("task");
  };

  const selectedTask = project?.tasks.find((t) => t.uniqueID === selected[0]) || null;
  const selectedResource = project?.resources.find((r) => r.uniqueID === selectedRes[0]) || null;

  const addTask = async (type = "task", parentId: string | null = null) => {
    if (!project) return;
    const p = await api.addTask(project.id, { title: type === "milestone" ? "New Milestone" : type === "group" ? "New Group" : "New Task", type, parentId });
    setProject(p);
    const created = [...p.tasks].pop();
    if (created) setSelected([created.uniqueID]);
  };

  const indent = async () => {
    if (!project || !selected[0]) return;
    const t = project.tasks.find((x) => x.uniqueID === selected[0]);
    if (!t) return;
    const siblings = project.tasks.filter((x) => x.parentId === t.parentId).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((x) => x.uniqueID === t.uniqueID);
    if (idx <= 0) return;
    const above = siblings[idx - 1];
    await patchTask(t.uniqueID, { parentId: above.uniqueID });
    await patchTask(above.uniqueID, { type: "group" });
  };

  const outdent = async () => {
    if (!project || !selected[0]) return;
    const t = project.tasks.find((x) => x.uniqueID === selected[0]);
    if (!t?.parentId) return;
    const parent = project.tasks.find((x) => x.uniqueID === t.parentId);
    await patchTask(t.uniqueID, { parentId: parent?.parentId ?? null });
  };

  const connect = async (from?: string, to?: string, type = "FS") => {
    if (!project) return;
    const a = from || selected[0];
    const b = to || selected[1];
    if (!a || !b) return notify("Select two tasks to connect.");
    setProject(await api.addDep(project.id, { from: a, to: b, type }));
  };

  const removeSelected = async () => {
    if (!project || !selected[0]) return;
    setProject(await api.deleteTask(project.id, selected[0]));
    setSelected([]);
  };

  const copyLink = async () => {
    if (!selected[0]) return;
    const url = `omniplan:///task/${selected.join(",")}`;
    await navigator.clipboard.writeText(url);
    notify(`Copied ${url}`);
  };

  const copyToOF = async () => {
    if (!project || !selected.length) return notify("Select tasks first.");
    const r = await api.copyToOmniFocus(project.id, selected);
    if (r.ok) {
      setProject(r.project);
      notify("Copied to OmniFocus. Back-links written to notes.");
    } else {
      notify(r.errorMessage || "OmniFocus clone offline. Payload ready — same tellFunction contract.");
      console.info("OmniFocus payload", r.payload || r.handshake);
    }
  };

  const runSim = async () => {
    if (!project) return;
    setSheet("simulate");
    setSim(await api.simulate(project.id));
  };

  const runEva = async () => {
    if (!project) return;
    setSheet("eva");
    setEva(await api.eva(project.id));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === ",") { e.preventDefault(); setSheet("prefs"); }
      if (meta && e.key.toLowerCase() === "n") { e.preventDefault(); setSheet("new"); }
      if (meta && e.key.toLowerCase() === "i" && e.shiftKey) { e.preventDefault(); setShowInspector((s) => !s); }
      if (meta && e.altKey && e.key === "1") setView("outline");
      if (meta && e.altKey && e.key === "2") setView("gantt");
      if (meta && e.altKey && e.key === "3") setView("network");
      if (meta && e.altKey && e.key === "4") setView("resource");
      if (e.key === "Delete" || e.key === "Backspace") {
        const el = e.target as HTMLElement;
        if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") removeSelected();
      }
      if (e.key === "Enter" && prefs?.returnCreatesRow && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        const el = e.target as HTMLElement;
        if (el.tagName === "INPUT") addTask();
      }
      if (e.key === "Tab" && prefs?.tabIndents && (e.target as HTMLElement).tagName !== "TEXTAREA") {
        e.preventDefault();
        if (e.shiftKey) outdent();
        else indent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prefs, selected, project]);

  const filtered = useMemo(() => {
    if (!project || !filter) return project;
    const q = filter.toLowerCase();
    const match = new Set(project.tasks.filter((t) => t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)).map((t) => t.uniqueID));
    return { ...project, tasks: project.tasks.filter((t) => match.has(t.uniqueID) || [...match].some((id) => project.tasks.find((x) => x.uniqueID === id)?.parentId === t.uniqueID)) };
  }, [project, filter]);

  if (!project || !prefs) {
    return <div className="app" style={{ placeItems: "center", display: "grid" }}>Opening OmniPlan…</div>;
  }

  const vis = filtered || project;
  const rows = flatten(vis);
  const cost = project.tasks.filter((t) => !project.tasks.some((x) => x.parentId === t.uniqueID)).reduce((s, t) => s + t.totalCost, 0);

  const Item = ({ k, label, shortcut, action, disabled }: { k?: string; label: string; shortcut?: string; action?: () => void; disabled?: boolean }) => (
    <button className={disabled ? "disabled" : ""} onClick={() => { action?.(); setMenu(null); }}>
      {label}
      {shortcut && <span className="kbd">{shortcut}</span>}
    </button>
  );

  return (
    <div className="app" onClick={() => setMenu(null)}>
      <div className="menubar">
        <div className="apple"></div>
        {([
          ["omniplan", "OmniPlan", [
            ["About OmniPlan", , () => setSheet("about")],
            ["sep"],
            ["Preferences…", "⌘,", () => setSheet("prefs")],
            ["Server Accounts…", , () => setSheet("accounts")],
            ["sep"],
            ["Hide OmniPlan", "⌘H"],
            ["Quit OmniPlan", "⌘Q"],
          ]],
          ["file", "File", [
            ["New Project…", "⌘N", () => setSheet("new")],
            ["New Dashboard", "⇧⌘N", () => setSheet("dash")],
            ["Open…", "⌘O"],
            ["sep"],
            ["Close", "⌘W"],
            ["Save", "⌘S", () => save(project).then(() => notify("Saved"))],
            ["Save As Template…", , () => notify("Template saved locally")],
            ["sep"],
            ["Report…", "⌥⌘R", () => window.open(api.exportUrl(project.id, "html"))],
            ["Export ▸ CSV", "⌥⌘E", () => window.open(api.exportUrl(project.id, "csv"))],
            ["Export ▸ iCalendar", , () => window.open(api.exportUrl(project.id, "ics"))],
            ["Export ▸ JSON (.oplx)", , () => window.open(api.exportUrl(project.id, "json"))],
            ["Print…", "⌘P", () => window.print()],
          ]],
          ["edit", "Edit", [
            ["Undo", "⌘Z"],
            ["Redo", "⇧⌘Z"],
            ["sep"],
            ["Cut", "⌘X"],
            ["Copy", "⌘C"],
            ["Copy Link to Task", , copyLink],
            ["Paste", "⌘V"],
            ["Delete", , removeSelected],
            ["Duplicate", "⌘D"],
            ["Select All", "⌘A", () => setSelected(project.tasks.map((t) => t.uniqueID))],
          ]],
          ["format", "Format", [
            ["Bold", "⌘B"],
            ["Italic", "⌘I"],
            ["Underline", "⌘U"],
            ["sep"],
            ["Show Fonts", "⌘T"],
            ["Show Colors", "⇧⌘C"],
          ]],
          ["view", "View", [
            ["Outline View", "⌥⌘1", () => setView("outline")],
            ["Gantt View", "⌥⌘2", () => setView("gantt")],
            ["Network View", "⌥⌘3", () => setView("network")],
            ["Resource View", "⌥⌘4", () => setView("resource")],
            ["sep"],
            ["Customize Columns…"],
            [numbering === "hierarchical" ? "Flat Numbering" : "Hierarchical Numbering", , () => setNumbering((n) => (n === "flat" ? "hierarchical" : "flat"))],
            ["Show/Hide Outline", , () => setShowOutline((s) => !s)],
            ["sep"],
            ["Dependency Lines", , () => setShowDeps((s) => !s)],
            ["Critical Paths", , () => setShowCritical((s) => !s)],
            ["Slack Lines", , () => setShowSlack((s) => !s)],
            ["Non-Working Time: Weekends", , () => setWeekends((s) => !s)],
            ["sep"],
            ["Scale To Fit Project", "⌥⌘0", () => setPx(16)],
            ["Zoom In", "⌘>", () => setPx((x) => Math.min(64, x + 8))],
            ["Zoom Out", "⌘<", () => setPx((x) => Math.max(8, x - 8))],
            ["Go to Today", "⇧⌘T"],
            ["Show/Hide Overview", , () => setShowOverview((s) => !s)],
            ["Show/Hide Inspector", "⇧⌘I", () => setShowInspector((s) => !s)],
          ]],
          ["structure", "Structure", [
            ["Add Task", "⌘}", () => addTask("task")],
            ["Add Child Task", , () => addTask("task", selected[0] || null)],
            ["Add Milestone", , () => addTask("milestone")],
            ["Add Group", , () => addTask("group")],
            ["sep"],
            ["Indent", "⌘]", indent],
            ["Outdent", "⌘[", outdent],
            ["Group", "⌥⌘L"],
            ["sep"],
            ["Connect", , () => connect()],
            ["Disconnect"],
            ["Split Task", "⌥⌘S"],
          ]],
          ["project", "Project", [
            ["Level Resources…", , async () => { setProject(await api.level(project.id)); notify("Resources leveled"); }],
            ["Catch Up…", , async () => { setProject(await api.catchUp(project.id)); notify("Caught up to today"); }],
            ["Reschedule…", , async () => { setProject(await api.reschedule(project.id)); notify("Incomplete work rescheduled"); }],
            ["Set Baseline…", , async () => { setProject(await api.baseline(project.id)); notify("Baseline set"); }],
            ["sep"],
            ["Monte Carlo Simulations…", , runSim],
            ["Earned Value Analysis…", , runEva],
            ["Show Violations", , () => setSheet("violations")],
          ]],
          ["inspectors", "Inspectors", [
            ["Show Inspector", "⇧⌘I", () => setShowInspector(true)],
            ["Project", , () => { setShowInspector(true); setTab("project"); }],
            ["Milestones", , () => { setShowInspector(true); setTab("milestones"); }],
            ["Task", , () => { setShowInspector(true); setTab("task"); }],
            ["Resource", , () => { setShowInspector(true); setTab("resource"); }],
            ["Styles", , () => { setShowInspector(true); setTab("styles"); }],
            ["Custom Data", , () => { setShowInspector(true); setTab("custom"); }],
          ]],
          ["automation", "Automation", [
            ["Copy Selected Tasks to OmniFocus", , copyToOF],
            ["Pull Status from OmniFocus", , async () => { const r = await api.pullOf(project.id); notify(r.ok ? "Pulled OmniFocus status" : r.errorMessage); if (r.project) setProject(r.project); }],
            ["Push Updates to OmniFocus", , async () => { const r = await api.pushOf(project.id); notify(r.ok ? "Pushed to OmniFocus" : r.errorMessage || "OmniFocus clone offline"); }],
            ["sep"],
            ["Plug-Ins…", , () => notify("Plug-ins: com.omni-automation.op.copy-tasks-to-omnifocus v1.2")],
            ["API Console — GET /api/projects", , () => window.open("/api/projects")],
          ]],
          ["window", "Window", [
            ["Minimize", "⌘M"],
            ["Zoom"],
          ]],
          ["help", "Help", [
            ["OmniPlan Help", , () => window.open("https://support.omnigroup.com/documentation/omniplan/mac/4.5.5/en/")],
            ["Omni Automation Reference", , () => window.open("https://omni-automation.com/omniplan/")],
          ]],
        ] as [string, string, [string, string?, (() => void)?][]][]).map(([id, label, items]) => (
          <div key={id} className={`menu ${menu === id ? "open" : ""} ${id === "omniplan" ? "app-name" : ""}`} onClick={(e) => { e.stopPropagation(); setMenu(menu === id ? null : id); }}>
            {label}
            <div className="menu-panel">
              {items.map((it, i) => it[0] === "sep" ? <div key={i} className="sep" /> : <Item key={it[0]} label={it[0]} shortcut={it[1]} action={it[2]} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <button className="tool" title="Add Task" onClick={() => addTask()}>{I.plus}</button>
        <button className="tool" title="Delete" onClick={removeSelected}>{I.minus}</button>
        <button className="tool" title="Outdent" onClick={outdent}>{I.outdent}</button>
        <button className="tool" title="Indent" onClick={indent}>{I.indent}</button>
        <button className="tool" title="Group" onClick={() => addTask("group")}>{I.group}</button>
        <button className="tool" title="Connect" onClick={() => connect()}>{I.connect}</button>
        <div className="seg" title="View">
          <button className={view === "outline" ? "on" : ""} onClick={() => setView("outline")}>{I.outline}</button>
          <button className={view === "gantt" ? "on" : ""} onClick={() => setView("gantt")}>{I.gantt}</button>
          <button className={view === "network" ? "on" : ""} onClick={() => setView("network")}>{I.network}</button>
          <button className={view === "resource" ? "on" : ""} onClick={() => setView("resource")}>{I.resource}</button>
        </div>
        <button className="label-btn" onClick={async () => { setProject(await api.level(project.id)); notify("Leveled"); }}>Level</button>
        <button className="label-btn" onClick={async () => { setProject(await api.catchUp(project.id)); }}>Catch Up</button>
        <button className="label-btn" onClick={runSim}>Simulations</button>
        <div className="spacer" />
        <button className={`tool ${showFilter ? "on" : ""}`} title="Filter" onClick={() => setShowFilter((s) => !s)}>{I.filter}</button>
        <button className={`tool ${showInspector ? "on" : ""}`} title="Inspector" onClick={() => setShowInspector((s) => !s)}>{I.inspector}</button>
      </div>

      {showFilter && (
        <div className="filter-bar">
          Filter tasks
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Title or note contains…" />
          <span className="muted">Also: incomplete, critical, overallocated, milestone</span>
        </div>
      )}

      {showOverview && view !== "outline" && view !== "network" && <Overview project={vis} px={px} />}

      <div className="workspace">
        {(view === "gantt" || view === "outline") && showOutline && (
          <Outline
            project={vis}
            selected={selected}
            numbering={numbering}
            wide={view === "outline"}
            onSelect={onSelect}
            onChangeTitle={(id, title) => patchTask(id, { title })}
            onToggle={(id) => {
              const t = project.tasks.find((x) => x.uniqueID === id);
              if (t) patchTask(id, { collapsed: !t.collapsed });
            }}
          />
        )}
        {view === "gantt" && (
          <Gantt
            project={vis}
            selected={selected}
            px={px}
            showDeps={showDeps}
            showCritical={showCritical}
            showSlack={showSlack}
            weekends={weekends}
            onSelect={onSelect}
            onConnect={(a, b) => connect(a, b)}
          />
        )}
        {view === "outline" && !showOutline && <div className="chart-pane" />}
        {view === "network" && <Network project={vis} selected={selected} showCritical={showCritical} onSelect={(id) => onSelect(id)} />}
        {view === "resource" && <ResourceView project={vis} selected={selectedRes} px={px} onSelectResource={(id) => { setSelectedRes([id]); setTab("resource"); }} />}
        {showInspector && (
          <Inspector
            tab={tab}
            setTab={setTab}
            project={project}
            task={selectedTask}
            resource={selectedResource}
            onProject={async (patch) => setProject(await api.patchProject(project.id, patch))}
            onTask={(patch) => selectedTask && patchTask(selectedTask.uniqueID, patch)}
            onResource={async (patch) => selectedResource && setProject(await api.patchResource(project.id, selectedResource.uniqueID, patch))}
            onAssign={async (rid) => selectedTask && setProject(await api.assign(project.id, { taskId: selectedTask.uniqueID, resourceId: rid, units: 1 }))}
            onUnassign={async (aid) => setProject(await api.unassign(project.id, aid))}
            onRemoveDep={async (id) => setProject(await api.deleteDep(project.id, id))}
          />
        )}
      </div>

      <div className="statusbar">
        <span>{project.documentName}</span>
        <span>{rows.length} tasks</span>
        <span>{project.resources.length} resources</span>
        <span>{fmtDur(project.tasks.find((t) => !t.parentId)?.duration || 0, project.hoursPerDay)} duration</span>
        <span>{money(cost, project.currency)}</span>
        <span>{project.violations?.length ? `${project.violations.length} violations` : "No violations"}</span>
        <span style={{ marginLeft: "auto" }}>OmniPlan 4.10.3</span>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {sheet === "prefs" && <PreferencesSheet prefs={prefs} onClose={() => setSheet(null)} onSave={async (p) => setPrefs(await api.prefs(p))} />}
      {sheet === "new" && (
        <NewProjectAssistant
          onClose={() => setSheet(null)}
          onCreate={async (title, templateId) => {
            const p = await api.createProject(title, templateId);
            setProject(p);
            setSheet(null);
          }}
        />
      )}
      {sheet === "violations" && <ViolationsSheet project={project} onClose={() => setSheet(null)} />}
      {sheet === "about" && <AboutSheet onClose={() => setSheet(null)} />}
      {sheet === "dash" && <DashboardSheet projects={projects} onClose={() => setSheet(null)} />}
      {sheet === "simulate" && <SimulateSheet data={sim} onClose={() => setSheet(null)} />}
      {sheet === "eva" && <EvaSheet data={eva} onClose={() => setSheet(null)} />}
      {sheet === "accounts" && <ServerAccounts onClose={() => setSheet(null)} />}
    </div>
  );
}
